package com.infotact.wms.outbound;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PickConfirmIdempotencyRepository extends JpaRepository<PickConfirmIdempotency, String> {
}

