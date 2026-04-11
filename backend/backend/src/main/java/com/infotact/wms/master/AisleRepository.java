package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AisleRepository extends JpaRepository<Aisle, Long>, JpaSpecificationExecutor<Aisle> {
    boolean existsByZone_IdAndCodeIgnoreCase(Long zoneId, String code);
}
