package com.infotact.wms.inventory;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.inventory.dto.InventoryBalanceResponse;
import com.infotact.wms.inventory.spec.InventorySpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class InventoryBalanceService {

    private final InventoryBalanceRepository inventoryBalanceRepository;

    public InventoryBalanceService(InventoryBalanceRepository inventoryBalanceRepository) {
        this.inventoryBalanceRepository = inventoryBalanceRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<InventoryBalanceResponse> search(
            Long warehouseId,
            Long zoneId,
            Long binId,
            String zoneCode,
            String binCode,
            Long itemId,
            String sku,
            boolean nonZeroOnly,
            Pageable pageable
    ) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Specification<InventoryBalance> spec = Specification
                .where(InventorySpecifications.inWarehouse(warehouseId))
                .and(InventorySpecifications.inZone(zoneId))
                .and(InventorySpecifications.inBin(binId))
                .and(InventorySpecifications.zoneCodeContains(zoneCode))
                .and(InventorySpecifications.binCodeContains(binCode))
                .and(InventorySpecifications.forItem(itemId))
                .and(InventorySpecifications.skuContains(sku))
                .and(InventorySpecifications.nonZeroOnly(nonZeroOnly));
        Page<InventoryBalance> page = inventoryBalanceRepository.findAll(spec, p);
        return PageResponse.of(page.map(b -> {
            touch(b);
            return InventoryMapper.toResponse(b);
        }));
    }

    @Transactional(readOnly = true)
    public PageResponse<InventoryBalanceResponse> lowStock(
            Long warehouseId,
            BigDecimal maxAvailableExclusive,
            Pageable pageable
    ) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.ASC, "onHandQty"));
        Specification<InventoryBalance> spec = Specification
                .where(InventorySpecifications.availableBelow(maxAvailableExclusive))
                .and(InventorySpecifications.inWarehouse(warehouseId))
                .and(onHandStrictlyPositive());
        Page<InventoryBalance> page = inventoryBalanceRepository.findAll(spec, p);
        return PageResponse.of(page.map(b -> {
            touch(b);
            return InventoryMapper.toResponse(b);
        }));
    }

    private static Specification<InventoryBalance> onHandStrictlyPositive() {
        return (root, query, cb) -> cb.gt(root.get("onHandQty"), BigDecimal.ZERO);
    }

    private static void touch(InventoryBalance b) {
        b.getWarehouse().getCode();
        b.getBin().getCode();
        b.getBin().getZone().getCode();
        b.getItem().getSku();
        b.getItem().getName();
    }
}
