package com.infotact.wms.master.spec;

import com.infotact.wms.master.Bin;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.Zone;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class MasterSpecifications {

    private MasterSpecifications() {
    }

    public static Specification<Warehouse> warehouseSearch(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("code")), p),
                    cb.like(cb.lower(root.get("name")), p)
            );
        };
    }

    public static Specification<Zone> zoneInWarehouse(Long warehouseId) {
        return (root, query, cb) -> cb.equal(root.get("warehouse").get("id"), warehouseId);
    }

    public static Specification<Zone> zoneSearch(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("code")), p),
                    cb.like(cb.lower(root.get("name")), p)
            );
        };
    }

    public static Specification<Bin> binInZone(Long zoneId) {
        return (root, query, cb) -> cb.equal(root.get("zone").get("id"), zoneId);
    }

    public static Specification<Bin> binSearch(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("code")), p),
                    cb.like(cb.lower(root.get("description")), p)
            );
        };
    }

    public static Specification<Bin> binActive(Boolean active) {
        return (root, query, cb) -> {
            if (active == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("active"), active);
        };
    }

    public static Specification<Item> itemSearch(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("sku")), p),
                    cb.like(cb.lower(root.get("name")), p)
            );
        };
    }

    public static Specification<Item> itemActive(Boolean active) {
        return (root, query, cb) -> {
            if (active == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("active"), active);
        };
    }
}
