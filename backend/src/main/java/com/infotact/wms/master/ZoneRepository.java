package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ZoneRepository extends JpaRepository<Zone, Long>, JpaSpecificationExecutor<Zone> {

    List<Zone> findByWarehouse_IdOrderByCodeAsc(Long warehouseId);

    Optional<Zone> findByIdAndWarehouse_Id(Long id, Long warehouseId);

    boolean existsByWarehouse_IdAndCodeIgnoreCase(Long warehouseId, String code);
}
