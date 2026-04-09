package com.infotact.wms.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_op_idempotency")
@Getter
@Setter
@NoArgsConstructor
public class InventoryOpIdempotency {

    @Id
    @Column(name = "idempotency_key", length = 128, nullable = false)
    private String idempotencyKey;

    @Column(name = "op_type", length = 32, nullable = false)
    private String opType;

    @Column(name = "inventory_ledger_id", nullable = false)
    private Long inventoryLedgerId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}

