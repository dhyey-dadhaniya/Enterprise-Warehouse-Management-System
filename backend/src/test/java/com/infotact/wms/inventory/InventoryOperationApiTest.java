package com.infotact.wms.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InventoryOperationApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    WarehouseRepository warehouseRepository;

    @Autowired
    BinRepository binRepository;

    @Autowired
    ItemRepository itemRepository;

    @Autowired
    InventoryBalanceRepository inventoryBalanceRepository;

    @Autowired
    InventoryLedgerRepository inventoryLedgerRepository;

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void adjustmentCycleCountUpdatesBalanceAndLedger() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "ADJ-" + suffix);
        long zoneId = postZone(token, whId);
        long binId = postBin(token, zoneId, "BIN-ADJ");
        long itemId = postItem(token, "SKU-ADJ-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Bin bin = binRepository.findById(binId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();
        saveBalance(wh, bin, item, new BigDecimal("10"), BigDecimal.ZERO);

        long ledgersBefore = inventoryLedgerRepository.count();

        mockMvc.perform(post("/api/inventory/adjustments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "binId": %d,
                                  "itemId": %d,
                                  "quantityDelta": -2,
                                  "reason": "CYCLE_COUNT",
                                  "note": "physical count"
                                }
                                """.formatted(whId, binId, itemId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.onHandQty").value(8))
                .andExpect(jsonPath("$.availableQty").value(8))
                .andExpect(jsonPath("$.ledgerId").exists());

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgersBefore + 1);
        assertThat(inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(whId, binId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("8"));
    }

    @Test
    void transferMovesStockAndWritesPairedLedgerWithSameRef() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "TRF-" + suffix);
        long zoneId = postZone(token, whId);
        long fromId = postBin(token, zoneId, "FROM");
        long toId = postBin(token, zoneId, "TO");
        long itemId = postItem(token, "SKU-TRF-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();
        saveBalance(wh, binRepository.findById(fromId).orElseThrow(), item, new BigDecimal("10"), BigDecimal.ZERO);
        saveBalance(wh, binRepository.findById(toId).orElseThrow(), item, BigDecimal.ZERO, BigDecimal.ZERO);

        long ledgersBefore = inventoryLedgerRepository.count();

        MvcResult res = mockMvc.perform(post("/api/inventory/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "toBinId": %d,
                                  "itemId": %d,
                                  "quantity": 4,
                                  "note": "bin move"
                                }
                                """.formatted(whId, fromId, toId, itemId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transferRef").exists())
                .andExpect(jsonPath("$.fromBinOnHandAfter").value(6))
                .andExpect(jsonPath("$.toBinOnHandAfter").value(4))
                .andReturn();

        String transferRef = objectMapper.readTree(res.getResponse().getContentAsString()).get("transferRef").asText();

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgersBefore + 2);
        long matching = inventoryLedgerRepository.findAll().stream()
                .filter(l -> transferRef.equals(l.getRefDocumentNumber()))
                .count();
        assertThat(matching).isEqualTo(2);
    }

    @Test
    void transferRejectedWhenWouldViolateReserved() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "RSV-" + suffix);
        long zoneId = postZone(token, whId);
        long fromId = postBin(token, zoneId, "F-RSV");
        long toId = postBin(token, zoneId, "T-RSV");
        long itemId = postItem(token, "SKU-RSV-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();
        saveBalance(wh, binRepository.findById(fromId).orElseThrow(), item, new BigDecimal("10"), new BigDecimal("8"));
        saveBalance(wh, binRepository.findById(toId).orElseThrow(), item, BigDecimal.ZERO, BigDecimal.ZERO);

        mockMvc.perform(post("/api/inventory/transfers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "toBinId": %d,
                                  "itemId": %d,
                                  "quantity": 5
                                }
                                """.formatted(whId, fromId, toId, itemId)))
                .andExpect(status().isConflict());
    }

    private void saveBalance(Warehouse wh, Bin bin, Item item, BigDecimal onHand, BigDecimal reserved) {
        InventoryBalance b = new InventoryBalance();
        b.setWarehouse(wh);
        b.setBin(bin);
        b.setItem(item);
        b.setOnHandQty(onHand);
        b.setReservedQty(reserved);
        inventoryBalanceRepository.save(b);
    }

    private long postWarehouse(String token, String code) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"name\":\"WH\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long postZone(String token, long whId) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/zones?warehouseId=" + whId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"Z1\",\"name\":\"Z\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long postBin(String token, long zoneId, String code) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long postItem(String token, String sku) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"" + sku + "\",\"name\":\"It\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }
}
