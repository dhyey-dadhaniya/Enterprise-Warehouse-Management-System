package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {

    Optional<Item> findBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCase(String sku);
}
