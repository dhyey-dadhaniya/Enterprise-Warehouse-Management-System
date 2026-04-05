package com.infotact.wms.inventory;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.inventory.dto.InventoryBalanceResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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

    public InventoryController(InventoryBalanceService inventoryBalanceService) {
        this.inventoryBalanceService = inventoryBalanceService;
    }

    /**
     * Paginated stock positions with on-hand, reserved, and available (on-hand minus reserved).
     * Filter by warehouse, zone, bin, item, and/or SKU substring.
     */
    @GetMapping("/balances")
    public PageResponse<InventoryBalanceResponse> listBalances(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long binId,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false, defaultValue = "false") boolean nonZeroOnly,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return inventoryBalanceService.search(warehouseId, zoneId, binId, itemId, sku, nonZeroOnly, pageable);
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
}
