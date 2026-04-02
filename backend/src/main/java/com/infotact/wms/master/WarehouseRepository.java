package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    Optional<Warehouse> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
