package com.infotact.wms.outbound;

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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "pick_waves")
@Getter
@Setter
@NoArgsConstructor
public class PickWave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "wave_code", nullable = false, unique = true, length = 64)
    private String waveCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PickWaveStatus status = PickWaveStatus.OPEN;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToMany
    @JoinTable(
            name = "pick_wave_orders",
            joinColumns = @JoinColumn(name = "pick_wave_id"),
            inverseJoinColumns = @JoinColumn(name = "sales_order_id")
    )
    private Set<SalesOrder> orders = new HashSet<>();

    @OneToMany(mappedBy = "wave", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    @OrderBy("routeSequence ASC")
    private List<PickTask> tasks = new ArrayList<>();

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
