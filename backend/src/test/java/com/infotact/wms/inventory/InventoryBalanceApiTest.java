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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InventoryBalanceApiTest {

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

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void listBalancesExposesOnHandReservedAvailableAndFiltersBySkuAndZone() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "INV-" + suffix);
        long zoneId = postZone(token, whId);
        long binA = postBin(token, zoneId, "A-INV");
        long binB = postBin(token, zoneId, "B-INV");
        long itemId = postItem(token, "SKU-INV-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Bin bA = binRepository.findById(binA).orElseThrow();
        Bin bB = binRepository.findById(binB).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();

        saveBalance(wh, bA, item, new BigDecimal("100"), new BigDecimal("30"));
        saveBalance(wh, bB, item, new BigDecimal("2"), BigDecimal.ZERO);

        mockMvc.perform(get("/api/inventory/balances")
                        .header("Authorization", "Bearer " + token)
                        .param("warehouseId", String.valueOf(whId))
                        .param("sku", "SKU-INV"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].availableQty").exists())
                .andExpect(jsonPath("$.content[0].onHandQty").exists())
                .andExpect(jsonPath("$.content[0].reservedQty").exists());

        mockMvc.perform(get("/api/inventory/balances")
                        .header("Authorization", "Bearer " + token)
                        .param("warehouseId", String.valueOf(whId))
                        .param("zoneId", String.valueOf(zoneId))
                        .param("binId", String.valueOf(binB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].binCode").value("B-INV"))
                .andExpect(jsonPath("$.content[0].availableQty").value(2));
    }

    @Test
    void lowStockUsesAvailableBelowThreshold() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(token, "LOW-" + suffix);
        long zoneId = postZone(token, whId);
        long binOk = postBin(token, zoneId, "OK");
        long binLow = postBin(token, zoneId, "LOW");
        long itemId = postItem(token, "SKU-LOW-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();
        saveBalance(wh, binRepository.findById(binOk).orElseThrow(), item, new BigDecimal("100"), BigDecimal.ZERO);
        saveBalance(wh, binRepository.findById(binLow).orElseThrow(), item, new BigDecimal("4"), new BigDecimal("1"));

        mockMvc.perform(get("/api/inventory/balances/low-stock")
                        .header("Authorization", "Bearer " + token)
                        .param("warehouseId", String.valueOf(whId))
                        .param("maxAvailable", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].binCode").value("LOW"))
                .andExpect(jsonPath("$.content[0].availableQty").value(3));
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
