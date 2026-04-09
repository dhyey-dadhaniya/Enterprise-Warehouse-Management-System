package com.infotact.wms.inventory;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.inventory.dto.InventoryAdjustmentRequest;
import com.infotact.wms.inventory.dto.InventoryAdjustmentResponse;
import com.infotact.wms.inventory.dto.InventoryBalanceResponse;
import com.infotact.wms.inventory.dto.InventoryTransferRequest;
import com.infotact.wms.inventory.dto.InventoryTransferResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory")
@PreAuthorize("isAuthenticated()")
public class InventoryController {

    private final InventoryBalanceService inventoryBalanceService;
    private final InventoryOperationService inventoryOperationService;

    public InventoryController(
            InventoryBalanceService inventoryBalanceService,
            InventoryOperationService inventoryOperationService
    ) {
        this.inventoryBalanceService = inventoryBalanceService;
        this.inventoryOperationService = inventoryOperationService;
    }

    /**
     * Paginated stock positions with on-hand, reserved, and available (on-hand minus reserved).
     * Filter by warehouse, zone/bin (id or code substring), item, and/or SKU substring.
     */
    @GetMapping("/balances")
    public PageResponse<InventoryBalanceResponse> listBalances(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long binId,
            @RequestParam(required = false) String zoneCode,
            @RequestParam(required = false) String binCode,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false, defaultValue = "false") boolean nonZeroOnly,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return inventoryBalanceService.search(
                warehouseId, zoneId, binId, zoneCode, binCode, itemId, sku, nonZeroOnly, pageable);
    }

    /**
     * Rows where {@code on_hand - reserved < maxAvailable} and {@code on_hand > 0} (stale zero rows excluded).
     */
    @GetMapping("/balances/low-stock")
    public PageResponse<InventoryBalanceResponse> lowStock(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(defaultValue = "5") BigDecimal maxAvailable,
            @PageableDefault(size = 50, sort = "onHandQty", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return inventoryBalanceService.lowStock(warehouseId, maxAvailable, pageable);
    }

    /**
     * Cycle count / damage / correction / quarantine reclass: single-bin quantity change with ledger line.
     */
    @PostMapping("/adjustments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<InventoryAdjustmentResponse> adjust(
            @Valid @RequestBody InventoryAdjustmentRequest request,
            Authentication authentication,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryOperationService.adjust(request, authentication.getName(), idempotencyKey));
    }

    /**
     * Move quantity between bins (same warehouse); paired TRANSFER_OUT / TRANSFER_IN ledger lines.
     */
    @PostMapping("/transfers")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<InventoryTransferResponse> transfer(
            @Valid @RequestBody InventoryTransferRequest request,
            Authentication authentication,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryOperationService.transfer(request, authentication.getName(), idempotencyKey));
    }
}
