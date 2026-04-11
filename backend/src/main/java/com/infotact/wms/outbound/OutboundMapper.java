package com.infotact.wms.outbound;

import com.infotact.wms.outbound.dto.PickTaskResponse;
import com.infotact.wms.outbound.dto.PickWaveResponse;
import com.infotact.wms.outbound.dto.SalesOrderLineResponse;
import com.infotact.wms.outbound.dto.SalesOrderResponse;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

final class OutboundMapper {

    private OutboundMapper() {
    }

    static SalesOrderLineResponse toLineResponse(SalesOrderLine line) {
        return new SalesOrderLineResponse(
                line.getId(),
                line.getLineNumber(),
                line.getItem().getId(),
                line.getItem().getSku(),
                line.getQuantityOrdered(),
                line.getQuantityAllocated(),
                line.getQuantityPicked()
        );
    }

    static SalesOrderResponse toOrderResponse(SalesOrder o) {
        List<SalesOrderLineResponse> lines = o.getLines().stream()
                .sorted(Comparator.comparingInt(SalesOrderLine::getLineNumber))
                .map(OutboundMapper::toLineResponse)
                .collect(Collectors.toList());
        return new SalesOrderResponse(
                o.getId(),
                o.getOrderNumber(),
                o.getWarehouse().getId(),
                o.getWarehouse().getCode(),
                o.getStatus(),
                lines,
                o.getCreatedAt(),
                o.getUpdatedAt()
        );
    }

    static PickWaveResponse toWaveResponse(PickWave w) {
        List<Long> orderIds = w.getOrders().stream()
                .map(SalesOrder::getId)
                .sorted()
                .collect(Collectors.toList());
        return new PickWaveResponse(
                w.getId(),
                w.getWaveCode(),
                w.getWarehouse().getId(),
                w.getStatus(),
                orderIds,
                w.getTasks() != null ? w.getTasks().size() : 0,
                w.getCreatedAt()
        );
    }

    static PickTaskResponse toTaskResponse(PickTask t) {
        return new PickTaskResponse(
                t.getId(),
                t.getWave().getId(),
                t.getSalesOrderLine().getOrder().getId(),
                t.getSalesOrderLine().getId(),
                t.getWarehouse().getId(),
                t.getBin().getId(),
                t.getBin().getCode(),
                t.getBin().getZone().getCode(),
                t.getItem().getId(),
                t.getItem().getSku(),
                t.getQuantityToPick(),
                t.getQuantityPicked(),
                t.getStatus(),
                t.getRouteSequence()
        );
    }
}
