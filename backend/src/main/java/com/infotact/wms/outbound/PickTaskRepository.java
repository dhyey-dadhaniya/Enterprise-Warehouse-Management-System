package com.infotact.wms.outbound;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PickTaskRepository extends JpaRepository<PickTask, Long> {

    List<PickTask> findByWave_IdOrderByRouteSequenceAsc(Long waveId);

    List<PickTask> findBySalesOrderLine_Order_Id(Long orderId);
}
