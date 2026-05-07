package com.infotact.wms.inbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InboundDocumentApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = objectMapper.readTree(login.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    private long createWarehouse(String token) throws Exception {
        String code = "WH" + System.nanoTime();
        MvcResult r = mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"name\":\"Test\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createItem(String token) throws Exception {
        String sku = "SKU" + System.nanoTime();
        MvcResult r = mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"" + sku + "\",\"name\":\"Widget\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void createInboundDocumentWithLinesAndOpen() throws Exception {
        String token = adminToken();
        long whId = createWarehouse(token);
        long itemId = createItem(token);
        String docNo = "ASN-" + System.nanoTime();

        String createBody = """
                {
                  "documentNumber": "%s",
                  "documentType": "ASN",
                  "warehouseId": %d,
                  "supplierName": "ACME",
                  "lines": [
                    { "itemId": %d, "expectedQty": 10 }
                  ]
                }
                """.formatted(docNo, whId, itemId);

        mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.lineCount").value(1))
                .andExpect(jsonPath("$.lines[0].expectedQty").value(10));

        mockMvc.perform(get("/api/inbound-documents?q=" + docNo)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].documentNumber").value(docNo.toUpperCase()))
                .andExpect(jsonPath("$.content[0].lineCount").value(1));

        MvcResult listRes = mockMvc.perform(get("/api/inbound-documents?q=" + docNo)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        long id = objectMapper.readTree(listRes.getResponse().getContentAsString())
                .get("content").get(0).get("id").asLong();

        mockMvc.perform(patch("/api/inbound-documents/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mockMvc.perform(put("/api/inbound-documents/" + id + "/lines/999")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receivedQty\": 4}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotOpenWithoutLines() throws Exception {
        String token = adminToken();
        long whId = createWarehouse(token);
        String docNo = "PO-" + System.nanoTime();

        MvcResult created = mockMvc.perform(post("/api/inbound-documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentNumber": "%s",
                                  "documentType": "PURCHASE_ORDER",
                                  "warehouseId": %d
                                }
                                """.formatted(docNo, whId)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/inbound-documents/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isConflict());
    }
}
