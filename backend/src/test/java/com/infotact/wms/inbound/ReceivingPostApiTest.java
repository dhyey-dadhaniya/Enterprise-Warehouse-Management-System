package com.infotact.wms.inbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedgerRepository;
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
class ReceivingPostApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    InventoryLedgerRepository inventoryLedgerRepository;

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
    void postReceiptUpdatesBalanceLedgerPostedQtyAndIdempotency() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());

        long whId = createWarehouse(token, "R" + suffix);
        long zoneId = createZone(token, whId);
        long stageBinId = createBin(token, zoneId, "STAGE-R");
        long itemId = createItem(token, "SKU-R-" + suffix);

        String docNo = "ASN-R-" + suffix;
        MvcResult docRes = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + token)
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
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/inbound-documents/" + docId + "/lines/" + lineId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 10}"))
                .andExpect(status().isOk());

        long ledgerBefore = inventoryLedgerRepository.count();

        String idem = "idem-" + suffix;
        String postBody = """
                { "stagingBinId": %d, "quantity": 4, "note": "first drop" }
                """.formatted(stageBinId);

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idem)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postedQty").value(4))
                .andExpect(jsonPath("$.replayed").value(false))
                .andExpect(jsonPath("$.receivedVersusExpectedMismatch").value(false));

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgerBefore + 1);

        var bal = inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageBinId, itemId);
        assertThat(bal).isPresent();
        assertThat(bal.get().getOnHandQty()).isEqualByComparingTo(new BigDecimal("4"));

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idem)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.postedQty").value(4));

        assertThat(inventoryLedgerRepository.count()).isEqualTo(ledgerBefore + 1);
        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageBinId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("4"));

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "stagingBinId": %d, "quantity": 6 }
                                """.formatted(stageBinId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postedQty").value(10))
                .andExpect(jsonPath("$.documentStatus").value("COMPLETED"));

        assertThat(inventoryBalanceRepository.findByWarehouse_IdAndBin_IdAndItem_Id(whId, stageBinId, itemId).orElseThrow()
                .getOnHandQty()).isEqualByComparingTo(new BigDecimal("10"));
    }

    @Test
    void cannotPostWhenDraft() throws Exception {
        String token = adminToken();
        String suffix = String.valueOf(System.nanoTime());
        long whId = createWarehouse(token, "D" + suffix);
        long zoneId = createZone(token, whId);
        long binId = createBin(token, zoneId, "B-D");
        long itemId = createItem(token, "SKU-D-" + suffix);

        MvcResult docRes = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "DR-%s",
                                  "documentType": "PURCHASE_ORDER",
                                  "warehouseId": %d,
                                  "lines": [ { "itemId": %d, "expectedQty": 1 } ]
                                }
                                """.formatted(suffix, whId, itemId)))
                .andExpect(status().isCreated())
                .andReturn();
        long docId = objectMapper.readTree(docRes.getResponse().getContentAsString()).get("id").asLong();
        long lineId = objectMapper.readTree(docRes.getResponse().getContentAsString())
                .get("lines").get(0).get("id").asLong();

        mockMvc.perform(put("/api/inbound-documents/" + docId + "/lines/" + lineId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 1}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/inbound-documents/" + docId + "/lines/" + lineId + "/post-receipt")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "stagingBinId": %d, "quantity": 1 }
                                """.formatted(binId)))
                .andExpect(status().isConflict());
    }

    private long createWarehouse(String token, String code) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"name\":\"WH\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createZone(String token, long whId) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/zones?warehouseId=" + whId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"Z1\",\"name\":\"Z\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createBin(String token, long zoneId, String code) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createItem(String token, String sku) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"" + sku + "\",\"name\":\"It\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }
}
