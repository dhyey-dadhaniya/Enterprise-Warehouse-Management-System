package com.infotact.wms.inventory;

import com.infotact.wms.auth.User;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.Warehouse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_ledger")
@Getter
@Setter
@NoArgsConstructor
public class InventoryLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bin_id", nullable = false)
    private Bin bin;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "qty_delta", nullable = false, precision = 19, scale = 4)
    private BigDecimal qtyDelta;

    @Column(nullable = false, length = 64)
    private String reason;

    @Column(name = "ref_type", length = 64)
    private String refType;

    @Column(name = "ref_document_id")
    private Long refDocumentId;

    @Column(name = "ref_document_number", length = 64)
    private String refDocumentNumber;

    @Column(name = "ref_line_id")
    private Long refLineId;

    @Column(length = 512)
    private String note;
}
