package com.infotact.wms.inventory.spec;

import com.infotact.wms.inventory.InventoryBalance;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.Locale;

public final class InventorySpecifications {

    private InventorySpecifications() {
    }

    public static Specification<InventoryBalance> inWarehouse(Long warehouseId) {
        return (root, query, cb) -> {
            if (warehouseId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("warehouse").get("id"), warehouseId);
        };
    }

    public static Specification<InventoryBalance> inZone(Long zoneId) {
        return (root, query, cb) -> {
            if (zoneId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("bin").get("zone").get("id"), zoneId);
        };
    }

    public static Specification<InventoryBalance> inBin(Long binId) {
        return (root, query, cb) -> {
            if (binId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("bin").get("id"), binId);
        };
    }

    public static Specification<InventoryBalance> forItem(Long itemId) {
        return (root, query, cb) -> {
            if (itemId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("item").get("id"), itemId);
        };
    }

    public static Specification<InventoryBalance> skuContains(String skuFragment) {
        return (root, query, cb) -> {
            if (skuFragment == null || skuFragment.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + skuFragment.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.like(cb.lower(root.get("item").get("sku")), p);
        };
    }

    public static Specification<InventoryBalance> nonZeroOnly(boolean enabled) {
        return (root, query, cb) -> {
            if (!enabled) {
                return cb.conjunction();
            }
            return cb.or(
                    cb.gt(root.get("onHandQty"), BigDecimal.ZERO),
                    cb.gt(root.get("reservedQty"), BigDecimal.ZERO)
            );
        };
    }

    /**
     * Available = on_hand_qty - reserved_qty; matches rows strictly below the threshold.
     */
    public static Specification<InventoryBalance> availableBelow(BigDecimal maxAvailableExclusive) {
        return (root, query, cb) -> {
            Expression<BigDecimal> available = cb.diff(root.get("onHandQty"), root.get("reservedQty"));
            return cb.lessThan(available, maxAvailableExclusive);
        };
    }
}
