package com.infotact.wms.outbound;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedgerRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OutboundFlowIntegrationTest {

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
    void allocateWavePickConfirmCompletesOrderAndWritesLedger() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "OB-" + suffix);
        long zoneId = postZone(token, whId);
        long binPick = postBin(token, zoneId, "PICK-01");
        long itemId = postItem(token, "SKU-OB-" + suffix);

        Warehouse w = warehouseRepository.findById(whId).orElseThrow();
        Bin b = binRepository.findById(binPick).orElseThrow();
        Item it = itemRepository.findById(itemId).orElseThrow();
        InventoryBalance bal = new InventoryBalance();
        bal.setWarehouse(w);
        bal.setBin(b);
        bal.setItem(it);
        bal.setOnHandQty(new BigDecimal("20"));
        bal.setReservedQty(BigDecimal.ZERO);
        inventoryBalanceRepository.save(bal);

        long ledgersBefore = inventoryLedgerRepository.count();

        MvcResult orderRes = mockMvc.perform(post("/api/sales-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orderNumber": "SO-OB-%s",
                                  "warehouseId": %d,
                                  "lines": [ { "itemId": %d, "quantityOrdered": 7 } ]
                                }
                                """.formatted(suffix, whId, itemId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn();
        long orderId = objectMapper.readTree(orderRes.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/sales-orders/" + orderId + "/allocate")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ALLOCATED"));

        assertThat(inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(whId, binPick, itemId).orElseThrow()
                .getReservedQty()).isEqualByComparingTo(new BigDecimal("7"));

        MvcResult waveRes = mockMvc.perform(post("/api/pick-waves")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "warehouseId": %d, "salesOrderIds": [ %d ] }
                                """.formatted(whId, orderId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskCount").value(1))
                .andReturn();
        long waveId = objectMapper.readTree(waveRes.getResponse().getContentAsString()).get("id").asLong();

        String tasksJson = mockMvc.perform(get("/api/pick-tasks?waveId=" + waveId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].routeSequence").value(1))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long taskId = objectMapper.readTree(tasksJson).get(0).get("id").asLong();

        mockMvc.perform(post("/api/pick-tasks/" + taskId + "/confirm-pick")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/api/sales-orders/" + orderId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        assertThat(inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(whId, binPick, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("13"));
        assertThat(inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(whId, binPick, itemId).orElseThrow()
                .getReservedQty()).isEqualByComparingTo(BigDecimal.ZERO);

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgersBefore + 1);
        assertThat(inventoryLedgerRepository.findAll().stream()
                .filter(l -> "OUTBOUND_PICK".equals(l.getReason()) && orderId == l.getRefDocumentId())
                .count()).isEqualTo(1);
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
