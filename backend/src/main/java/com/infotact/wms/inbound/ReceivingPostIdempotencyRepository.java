package com.infotact.wms.inbound;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceivingPostIdempotencyRepository extends JpaRepository<ReceivingPostIdempotency, String> {
}
