package com.infotact.wms.inventory;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryOpIdempotencyRepository extends JpaRepository<InventoryOpIdempotency, String> {
}

