package com.infotact.wms.outbound;

import com.infotact.wms.master.Bin;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.Warehouse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pick_tasks")
@Getter
@Setter
@NoArgsConstructor
public class PickTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pick_wave_id", nullable = false)
    private PickWave wave;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_line_id", nullable = false)
    private SalesOrderLine salesOrderLine;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bin_id", nullable = false)
    private Bin bin;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "quantity_to_pick", nullable = false, precision = 19, scale = 4)
    private BigDecimal quantityToPick;

    @Column(name = "quantity_picked", nullable = false, precision = 19, scale = 4)
    private BigDecimal quantityPicked = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PickTaskStatus status = PickTaskStatus.PENDING;

    @Column(name = "route_sequence", nullable = false)
    private int routeSequence;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime n = LocalDateTime.now();
        createdAt = n;
        updatedAt = n;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
