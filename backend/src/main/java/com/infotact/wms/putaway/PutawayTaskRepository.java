package com.infotact.wms.putaway;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PutawayTaskRepository extends JpaRepository<PutawayTask, Long> {

    Page<PutawayTask> findByWarehouse_Id(Long warehouseId, Pageable pageable);
}
