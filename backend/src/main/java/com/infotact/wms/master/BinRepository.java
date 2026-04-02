package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BinRepository extends JpaRepository<Bin, Long> {

    List<Bin> findByZone_IdOrderByCodeAsc(Long zoneId);

    Optional<Bin> findByIdAndZone_Id(Long id, Long zoneId);

    boolean existsByZone_IdAndCodeIgnoreCase(Long zoneId, String code);
}
