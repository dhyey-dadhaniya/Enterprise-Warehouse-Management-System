package com.infotact.wms.inbound;

import com.fasterxml.jackson.databind.JsonNode;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InboundFlowIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    InventoryLedgerRepository inventoryLedgerRepository;

    @Autowired
    InventoryBalanceRepository inventoryBalanceRepository;

    @Autowired
    WarehouseRepository warehouseRepository;

    @Autowired
    BinRepository binRepository;

    @Autowired
    ItemRepository itemRepository;

    private String login(String username, String password) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = objectMapper.readTree(login.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    @Test
    void receiverRunsReceivePostPutawayAndManagerConfirms() throws Exception {
        String recvToken = login("receiver", "recv123");
        String managerToken = login("manager", "mgr123");
        String adminToken = login("admin", "admin123");
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(adminToken, "E2E-" + suffix);
        long zoneId = postZone(adminToken, whId);
        long stageId = postBin(adminToken, zoneId, "STG-E2E");
        long shelfId = postBin(adminToken, zoneId, "SHF-E2E");
        long itemId = postItem(adminToken, "SKU-E2E-" + suffix);

        String docNo = "ASN-E2E-" + suffix;
        MvcResult docRes = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "%s",
                                  "documentType": "ASN",
                                  "warehouseId": %d,
                                  "lines": [ { "itemId": %d, "expectedQty": 10 } ]
                                }
                                """.formatted(docNo, whId, itemId)))
                .andExpect(status().isCreated())
                .andReturn();
        long docId = objectMapper.readTree(docRes.getResponse().getContentAsString()).get("id").asLong();
        long lineId = objectMapper.readTree(docRes.getResponse().getContentAsString())
                .get("lines").get(0).get("id").asLong();

        mockMvc.perform(patch("/api/inbound-documents/" + docId + "/status")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/inbound-documents/" + docId + "/lines/" + lineId)
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 10}"))
                .andExpect(status().isOk());

        long ledgerBeforePutaway = inventoryLedgerRepository.count();

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "stagingBinId": %d, "quantity": 10 }
                                """.formatted(stageId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentStatus").value("COMPLETED"));

        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("10"));

        MvcResult taskRes = mockMvc.perform(post("/api/putaway-tasks")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "itemId": %d,
                                  "quantity": 10,
                                  "inboundDocumentLineId": %d
                                }
                                """.formatted(whId, stageId, itemId, lineId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.suggestedToBinId").value((int) shelfId))
                .andReturn();
        long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/putaway-tasks/" + taskId + "/claim")
                        .header("Authorization", "Bearer " + recvToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedUsername").value("receiver"));

        mockMvc.perform(post("/api/putaway-tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"mgr override\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, shelfId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("10"));

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgerBeforePutaway + 3);

        long putawayLedgers = inventoryLedgerRepository.findAll().stream()
                .filter(l -> "PUTAWAY_TASK".equals(l.getRefType()) && taskId == l.getRefDocumentId())
                .count();
        assertThat(putawayLedgers).isEqualTo(2);
    }

    @Test
    void pickerCannotCreatePutawayTask() throws Exception {
        String adminToken = login("admin", "admin123");
        String pickerToken = login("picker", "pick123");
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(adminToken, "PW2-" + suffix);
        long zoneId = postZone(adminToken, whId);
        long binId = postBin(adminToken, zoneId, "B-PW");
        postBin(adminToken, zoneId, "B-PW-EMPTY");
        long itemId = postItem(adminToken, "SKU-PW2-" + suffix);

        Warehouse wh = warehouseRepository.findById(whId).orElseThrow();
        Bin bin = binRepository.findById(binId).orElseThrow();
        Item item = itemRepository.findById(itemId).orElseThrow();
        InventoryBalance b = new InventoryBalance();
        b.setWarehouse(wh);
        b.setBin(bin);
        b.setItem(item);
        b.setOnHandQty(new BigDecimal("5"));
        b.setReservedQty(BigDecimal.ZERO);
        inventoryBalanceRepository.save(b);

        mockMvc.perform(post("/api/putaway-tasks")
                        .header("Authorization", "Bearer " + pickerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "itemId": %d,
                                  "quantity": 1
                                }
                                """.formatted(whId, binId, itemId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void pickerCannotPostReceipt() throws Exception {
        String adminToken = login("admin", "admin123");
        String pickerToken = login("picker", "pick123");
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(adminToken, "PR-" + suffix);
        long zoneId = postZone(adminToken, whId);
        long binId = postBin(adminToken, zoneId, "STG-PR");
        long itemId = postItem(adminToken, "SKU-PR-" + suffix);

        MvcResult docRes = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "ASN-PR-%s",
                                  "documentType": "ASN",
                                  "warehouseId": %d,
                                  "lines": [ { "itemId": %d, "expectedQty": 5 } ]
                                }
                                """.formatted(suffix, whId, itemId)))
                .andExpect(status().isCreated())
                .andReturn();
        long docId = objectMapper.readTree(docRes.getResponse().getContentAsString()).get("id").asLong();
        long lineId = objectMapper.readTree(docRes.getResponse().getContentAsString())
                .get("lines").get(0).get("id").asLong();

        mockMvc.perform(patch("/api/inbound-documents/" + docId + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/inbound-documents/" + docId + "/lines/" + lineId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 5}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + pickerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "stagingBinId": %d, "quantity": 1 }
                                """.formatted(binId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void receiverCannotConfirmPutawayBeforeClaim() throws Exception {
        String recvToken = login("receiver", "recv123");
        String adminToken = login("admin", "admin123");
        String suffix = String.valueOf(System.nanoTime());

        long whId = postWarehouse(adminToken, "PC-" + suffix);
        long zoneId = postZone(adminToken, whId);
        long stageId = postBin(adminToken, zoneId, "STG-PC");
        postBin(adminToken, zoneId, "SHF-PC");
        long itemId = postItem(adminToken, "SKU-PC-" + suffix);

        String docNo = "ASN-PC-" + suffix;
        MvcResult docRes = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "%s",
                                  "documentType": "ASN",
                                  "warehouseId": %d,
                                  "lines": [ { "itemId": %d, "expectedQty": 3 } ]
                                }
                                """.formatted(docNo, whId, itemId)))
                .andExpect(status().isCreated())
                .andReturn();
        long docId = objectMapper.readTree(docRes.getResponse().getContentAsString()).get("id").asLong();
        long lineId = objectMapper.readTree(docRes.getResponse().getContentAsString())
                .get("lines").get(0).get("id").asLong();

        mockMvc.perform(patch("/api/inbound-documents/" + docId + "/status")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/inbound-documents/" + docId + "/lines/" + lineId)
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 3}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "stagingBinId": %d, "quantity": 3 }
                                """.formatted(stageId)))
                .andExpect(status().isOk());

        MvcResult taskRes = mockMvc.perform(post("/api/putaway-tasks")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "warehouseId": %d,
                                  "fromBinId": %d,
                                  "itemId": %d,
                                  "quantity": 3
                                }
                                """.formatted(whId, stageId, itemId)))
                .andExpect(status().isCreated())
                .andReturn();
        long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/putaway-tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + recvToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict());
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
