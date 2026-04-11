package com.infotact.wms.outbound;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderPackIdempotencyRepository extends JpaRepository<SalesOrderPackIdempotency, String> {
}

