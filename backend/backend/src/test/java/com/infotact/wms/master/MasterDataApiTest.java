package com.infotact.wms.master;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.infotact.wms.auth.Role;
import com.infotact.wms.auth.RoleRepository;
import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MasterDataApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    private String adminToken;

    @BeforeEach
    void loginAdmin() throws Exception {
        adminToken = obtainToken("admin", "admin123");
        ensureOperatorUser();
    }

    private void ensureOperatorUser() {
        if (userRepository.existsByUsername("operator")) {
            return;
        }
        Role operator = roleRepository.findByName("OPERATOR").orElseThrow();
        User u = new User();
        u.setUsername("operator");
        u.setPasswordHash(passwordEncoder.encode("op123"));
        u.setEnabled(true);
        u.setRoles(Set.of(operator));
        userRepository.save(u);
    }

    private String obtainToken(String username, String password) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = objectMapper.readTree(login.getResponse().getContentAsString());
        return node.get("accessToken").asText();
    }

    @Test
    void listWarehousesRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/warehouses"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listWarehousesReturnsPage() throws Exception {
        mockMvc.perform(get("/api/warehouses?page=0&size=5")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").exists())
                .andExpect(jsonPath("$.totalPages").exists())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(5));
    }

    @Test
    void createWarehouseSearchAndPaginate() throws Exception {
        String code = "W" + System.nanoTime();
        mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\",\"name\":\"Paged Warehouse\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code.toUpperCase()));

        mockMvc.perform(get("/api/warehouses?q=" + code + "&page=0&size=10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].code").value(code.toUpperCase()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void duplicateWarehouseCodeReturns409() throws Exception {
        String code = "DUP" + System.nanoTime();
        String body = "{\"code\":\"" + code + "\",\"name\":\"One\"}";
        mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void operatorCannotCreateWarehouse() throws Exception {
        String operatorToken = obtainToken("operator", "op123");
        mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + operatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"NOPE\",\"name\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void zonesAndBinsPageUnderParent() throws Exception {
        String whCode = "WH" + System.nanoTime();
        MvcResult whRes = mockMvc.perform(post("/api/warehouses")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + whCode + "\",\"name\":\"WH\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long whId = objectMapper.readTree(whRes.getResponse().getContentAsString()).get("id").asLong();

        String znCode = "Z" + System.nanoTime();
        MvcResult zRes = mockMvc.perform(post("/api/zones?warehouseId=" + whId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + znCode + "\",\"name\":\"Zone\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long zoneId = objectMapper.readTree(zRes.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/zones?warehouseId=" + whId + "&page=0&size=20")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].warehouseId").value(whId));

        mockMvc.perform(post("/api/bins?zoneId=" + zoneId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"B1\",\"description\":\"d\",\"active\":true}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/bins?zoneId=" + zoneId + "&active=true&page=0&size=10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].zoneId").value(zoneId));
    }

    @Test
    void itemsFilterByActive() throws Exception {
        String sku = "SKU" + System.nanoTime();
        mockMvc.perform(post("/api/items")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sku\":\"" + sku + "\",\"name\":\"Item\",\"active\":false}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/items?active=false&q=" + sku)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].active").value(false));
    }
}
