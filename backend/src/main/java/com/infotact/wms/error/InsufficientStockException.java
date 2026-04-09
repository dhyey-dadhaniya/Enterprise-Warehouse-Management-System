package com.infotact.wms.error;

public class InsufficientStockException extends ConflictException {
    public InsufficientStockException(String message) {
        super(message);
    }
}

