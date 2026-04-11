package com.infotact.wms.putaway;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PutawayConfirmIdempotencyRepository extends JpaRepository<PutawayConfirmIdempotency, String> {
}

