package com.infotact.wms.master;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.master.dto.BinRequest;
import com.infotact.wms.master.dto.BinResponse;
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
@RequestMapping("/api/bins")
@Tag(name = "Bins")
@PreAuthorize("isAuthenticated()")
public class BinController {

    private final BinService binService;

    public BinController(BinService binService) {
        this.binService = binService;
    }

    @GetMapping
    public PageResponse<BinResponse> list(
            @RequestParam("zoneId") Long zoneId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "code") Pageable pageable
    ) {
        return binService.listByZone(zoneId, q, active, pageable);
    }

    @GetMapping("/{id}")
    public BinResponse get(@PathVariable Long id) {
        return binService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BinResponse> create(
            @RequestParam("zoneId") Long zoneId,
            @Valid @RequestBody BinRequest request
    ) {
        BinResponse body = binService.create(zoneId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BinResponse update(@PathVariable Long id, @Valid @RequestBody BinRequest request) {
        return binService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        binService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
