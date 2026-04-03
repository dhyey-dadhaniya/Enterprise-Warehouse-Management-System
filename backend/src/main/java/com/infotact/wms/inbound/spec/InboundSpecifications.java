package com.infotact.wms.inbound.spec;

import com.infotact.wms.inbound.InboundDocument;
import com.infotact.wms.inbound.InboundDocumentStatus;
import com.infotact.wms.inbound.InboundDocumentType;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class InboundSpecifications {

    private InboundSpecifications() {
    }

    public static Specification<InboundDocument> warehouseId(Long warehouseId) {
        return (root, query, cb) -> {
            if (warehouseId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("warehouse").get("id"), warehouseId);
        };
    }

    public static Specification<InboundDocument> status(InboundDocumentStatus status) {
        return (root, query, cb) -> {
            if (status == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("status"), status);
        };
    }

    public static Specification<InboundDocument> documentType(InboundDocumentType type) {
        return (root, query, cb) -> {
            if (type == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("documentType"), type);
        };
    }

    public static Specification<InboundDocument> search(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String p = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("documentNumber")), p),
                    cb.like(cb.lower(cb.coalesce(root.get("reference"), "")), p),
                    cb.like(cb.lower(cb.coalesce(root.get("supplierName"), "")), p)
            );
        };
    }
}
