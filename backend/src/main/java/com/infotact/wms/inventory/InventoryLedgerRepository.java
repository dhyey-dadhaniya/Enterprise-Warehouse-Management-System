package com.infotact.wms.inventory;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryLedgerRepository extends JpaRepository<InventoryLedger, Long> {
}
