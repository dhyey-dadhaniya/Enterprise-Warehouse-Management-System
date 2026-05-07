package com.infotact.wms.master;

import com.infotact.wms.common.dto.MessageResponse;
import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.master.dto.AisleRequest;
import com.infotact.wms.master.dto.AisleResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/aisles")
@Tag(name = "Aisles")
@PreAuthorize("isAuthenticated()")
public class AisleController {

    private final AisleService aisleService;

    public AisleController(AisleService aisleService) {
        this.aisleService = aisleService;
    }

    @GetMapping
    public PageResponse<AisleResponse> list(
            @RequestParam("zoneId") Long zoneId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "code") Pageable pageable
    ) {
        return aisleService.listByZone(zoneId, q, pageable);
    }

    @GetMapping("/{id}")
    public AisleResponse get(@PathVariable Long id) {
        return aisleService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AisleResponse> create(
            @RequestParam("zoneId") Long zoneId,
            @Valid @RequestBody AisleRequest request
    ) {
        AisleResponse body = aisleService.create(zoneId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AisleResponse update(@PathVariable Long id, @Valid @RequestBody AisleRequest request) {
        return aisleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id) {
        aisleService.delete(id);
        return ResponseEntity.ok(new MessageResponse("Aisle deleted successfully"));
    }
}

