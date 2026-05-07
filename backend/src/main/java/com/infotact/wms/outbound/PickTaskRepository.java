package com.infotact.wms.outbound;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PickTaskRepository extends JpaRepository<PickTask, Long> {

    List<PickTask> findByWave_IdOrderByRouteSequenceAsc(Long waveId);

    List<PickTask> findBySalesOrderLine_Order_Id(Long orderId);

    Page<PickTask> findByStatus(PickTaskStatus status, Pageable pageable);

    Page<PickTask> findByStatusAndWarehouse_Id(PickTaskStatus status, Long warehouseId, Pageable pageable);
}
