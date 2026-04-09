package com.infotact.wms.outbound;

import com.infotact.wms.outbound.dto.PickWaveCreateRequest;
import com.infotact.wms.outbound.dto.PickWaveResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pick-waves")
@Tag(name = "Pick waves")
@PreAuthorize("isAuthenticated()")
public class PickWaveController {

    private final PickWaveService pickWaveService;

    public PickWaveController(PickWaveService pickWaveService) {
        this.pickWaveService = pickWaveService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<PickWaveResponse> create(@Valid @RequestBody PickWaveCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pickWaveService.create(request));
    }

    @GetMapping("/{id}")
    public PickWaveResponse get(@PathVariable Long id) {
        return pickWaveService.get(id);
    }
}
