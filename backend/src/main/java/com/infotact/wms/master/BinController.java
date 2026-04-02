package com.infotact.wms.master;

import com.infotact.wms.master.dto.BinRequest;
import com.infotact.wms.master.dto.BinResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

import java.util.List;

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
    public List<BinResponse> list(@RequestParam("zoneId") Long zoneId) {
        return binService.listByZone(zoneId);
    }

    @GetMapping("/{id}")
    public BinResponse get(@PathVariable Long id) {
        return binService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<BinResponse> create(
            @RequestParam("zoneId") Long zoneId,
            @Valid @RequestBody BinRequest request
    ) {
        BinResponse body = binService.create(zoneId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public BinResponse update(@PathVariable Long id, @Valid @RequestBody BinRequest request) {
        return binService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        binService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
