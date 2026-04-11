package com.infotact.wms.master;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    Optional<Item> findBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCase(String sku);
}
