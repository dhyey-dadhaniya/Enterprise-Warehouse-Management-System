package com.infotact.wms.putaway;

import com.infotact.wms.master.Bin;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "putaway_confirm_idempotency")
@Getter
@Setter
@NoArgsConstructor
public class PutawayConfirmIdempotency {

    @Id
    @Column(name = "idempotency_key", length = 128, nullable = false)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "putaway_task_id", nullable = false)
    private PutawayTask task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "confirmed_to_bin_id", nullable = false)
    private Bin confirmedToBin;

    @Column(name = "inventory_ledger_out_id", nullable = false)
    private Long inventoryLedgerOutId;

    @Column(name = "inventory_ledger_in_id", nullable = false)
    private Long inventoryLedgerInId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}

