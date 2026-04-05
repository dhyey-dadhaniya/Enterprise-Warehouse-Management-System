package com.infotact.wms.putaway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
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
class PutawayTaskApiTest {

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
        JsonNode node = objectMapper.readTree(login.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    @Test
    void suggestionPrefersConsolidationThenCreatesTask() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        MvcResult whRes = mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"PW" + suffix + "\",\"name\":\"Putaway WH\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long whId = objectMapper.readTree(whRes.getResponse().getContentAsString()).get("id").asLong();

        MvcResult zRes = mockMvc.perform(post("/api/zones?warehouseId=" + whId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"Z1\",\"name\":\"Main\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long zoneId = objectMapper.readTree(zRes.getResponse().getContentAsString()).get("id").asLong();

        MvcResult bStage = mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"STAGE\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        long stageBinId = objectMapper.readTree(bStage.getResponse().getContentAsString()).get("id").asLong();

        MvcResult bLow = mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"PICK-LO\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        long lowBinId = objectMapper.readTree(bLow.getResponse().getContentAsString()).get("id").asLong();

        MvcResult bHi = mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"PICK-HI\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        long hiBinId = objectMapper.readTree(bHi.getResponse().getContentAsString()).get("id").asLong();

        MvcResult itRes = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"SKU-PW-" + suffix + "\",\"name\":\"Item\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long itemId = objectMapper.readTree(itRes.getResponse().getContentAsString()).get("id").asLong();

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Bin stage = binRepository.findById(stageBinId).orElseThrow();
        Bin low = binRepository.findById(lowBinId).orElseThrow();
        Bin hi = binRepository.findById(hiBinId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();

        saveBalance(wh, stage, item, new BigDecimal("10"));
        saveBalance(wh, low, item, new BigDecimal("5"));
        saveBalance(wh, hi, item, new BigDecimal("50"));

        mockMvc.perform(get("/api/putaway-tasks/suggestion")
                        .header("Authorization", "Bearer " + token)
                        .param("warehouseId", String.valueOf(whId))
                        .param("itemId", String.valueOf(itemId))
                        .param("fromBinId", String.valueOf(stageBinId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rule").value("CONSOLIDATE"))
                .andExpect(jsonPath("$.suggestedBinId").value((int) hiBinId));

        MvcResult created = mockMvc.perform(post("/api/putaway-tasks")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "itemId": %d,
                                  "quantity": 2
                                }
                                """.formatted(whId, stageBinId, itemId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.suggestionRule").value("CONSOLIDATE"))
                .andExpect(jsonPath("$.suggestedToBinId").value((int) hiBinId))
                .andReturn();

        long taskId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        assertThat(taskId).isPositive();

        mockMvc.perform(post("/api/putaway-tasks/" + taskId + "/claim")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.assignedUsername").value("admin"));

        mockMvc.perform(post("/api/putaway-tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.confirmedToBinId").value((int) hiBinId));

        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageBinId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("8"));
        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, hiBinId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("52"));
    }

    private void saveBalance(Warehouse wh, Bin bin, Item item, BigDecimal onHand) {
        InventoryBalance b = new InventoryBalance();
        b.setWarehouse(wh);
        b.setBin(bin);
        b.setItem(item);
        b.setOnHandQty(onHand);
        b.setReservedQty(BigDecimal.ZERO);
        inventoryBalanceRepository.save(b);
    }
}
