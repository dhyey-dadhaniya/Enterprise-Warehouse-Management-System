package com.infotact.wms.outbound;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.outbound.dto.SalesOrderCreateRequest;
import com.infotact.wms.outbound.dto.SalesOrderResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales-orders")
@Tag(name = "Sales orders")
@PreAuthorize("isAuthenticated()")
public class SalesOrderController {

    private final SalesOrderService salesOrderService;

    public SalesOrderController(SalesOrderService salesOrderService) {
        this.salesOrderService = salesOrderService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<SalesOrderResponse> create(@Valid @RequestBody SalesOrderCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salesOrderService.create(request));
    }

    @GetMapping("/{id}")
    public SalesOrderResponse get(@PathVariable Long id) {
        return salesOrderService.get(id);
    }

    @GetMapping
    public PageResponse<SalesOrderResponse> list(
            @RequestParam(required = false) Long warehouseId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return salesOrderService.list(warehouseId, pageable);
    }

    @PostMapping("/{id}/allocate")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public SalesOrderResponse allocate(@PathVariable Long id) {
        return salesOrderService.allocate(id);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public SalesOrderResponse cancel(@PathVariable Long id) {
        return salesOrderService.cancel(id);
    }
}
