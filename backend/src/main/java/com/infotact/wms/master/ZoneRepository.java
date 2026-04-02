package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    List<Zone> findByWarehouse_IdOrderByCodeAsc(Long warehouseId);

    Optional<Zone> findByIdAndWarehouse_Id(Long id, Long warehouseId);

    boolean existsByWarehouse_IdAndCodeIgnoreCase(Long warehouseId, String code);
}
