package com.infotact.wms.common.web;

import com.infotact.wms.error.ConflictException;

public final class Idempotency {

    private Idempotency() {
    }

    public static String normalizeKey(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.length() > 128) {
            throw new ConflictException("Idempotency-Key must be at most 128 characters");
        }
        return t;
    }
}

