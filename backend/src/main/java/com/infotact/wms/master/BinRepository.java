package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BinRepository extends JpaRepository<Bin, Long>, JpaSpecificationExecutor<Bin> {

    List<Bin> findByZone_IdOrderByCodeAsc(Long zoneId);

    Optional<Bin> findByIdAndZone_Id(Long id, Long zoneId);

    boolean existsByZone_IdAndCodeIgnoreCase(Long zoneId, String code);

    @Query("""
            SELECT b FROM Bin b
            JOIN FETCH b.zone z
            JOIN FETCH z.warehouse w
            WHERE w.id = :warehouseId AND b.active = true
            ORDER BY z.code ASC, b.code ASC
            """)
    List<Bin> findActiveByWarehouseIdOrderByZoneAndBin(@Param("warehouseId") Long warehouseId);
}
