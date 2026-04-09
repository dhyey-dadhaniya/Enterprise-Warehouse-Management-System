package com.infotact.wms.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, Long>, JpaSpecificationExecutor<InventoryBalance> {

    Optional<InventoryBalance> findByWarehouse_IdAndBin_IdAndItem_Id(Long warehouseId, Long binId, Long itemId);

    @Query("""
            SELECT ib FROM InventoryBalance ib
            JOIN FETCH ib.bin b
            JOIN FETCH b.zone z
            JOIN FETCH z.warehouse w
            JOIN FETCH ib.item
            WHERE w.id = :warehouseId AND ib.item.id = :itemId
            """)
    List<InventoryBalance> findForPutawaySuggestion(@Param("warehouseId") Long warehouseId, @Param("itemId") Long itemId);

    @Query("""
            SELECT ib FROM InventoryBalance ib
            JOIN FETCH ib.bin b
            JOIN FETCH b.zone z
            JOIN FETCH z.warehouse w
            JOIN FETCH ib.item
            WHERE w.id = :warehouseId AND ib.item.id = :itemId
            ORDER BY z.code ASC, b.code ASC
            """)
    List<InventoryBalance> findForAllocationOrderByLocation(@Param("warehouseId") Long warehouseId, @Param("itemId") Long itemId);
}
