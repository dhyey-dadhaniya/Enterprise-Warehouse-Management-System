package com.infotact.wms.outbound;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import com.infotact.wms.outbound.dto.PickWaveCreateRequest;
import com.infotact.wms.outbound.dto.PickWaveResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Service
public class PickWaveService {

    private final PickWaveRepository pickWaveRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final WarehouseRepository warehouseRepository;

    public PickWaveService(
            PickWaveRepository pickWaveRepository,
            SalesOrderRepository salesOrderRepository,
            WarehouseRepository warehouseRepository
    ) {
        this.pickWaveRepository = pickWaveRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.warehouseRepository = warehouseRepository;
    }

    @Transactional
    public PickWaveResponse create(PickWaveCreateRequest request) {
        Warehouse wh = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));

        List<SalesOrder> orders = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(request.salesOrderIds())) {
            SalesOrder o = salesOrderRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + id));
            if (!o.getWarehouse().getId().equals(wh.getId())) {
                throw new ConflictException("Sales order " + id + " is not in the target warehouse");
            }
            if (o.getStatus() != SalesOrderStatus.ALLOCATED) {
                throw new ConflictException("Sales order " + id + " must be ALLOCATED (current: " + o.getStatus() + ")");
            }
            orders.add(o);
        }

        PickWave wave = new PickWave();
        wave.setWarehouse(wh);
        wave.setWaveCode("WAVE-" + UUID.randomUUID());
        wave.setStatus(PickWaveStatus.OPEN);
        for (SalesOrder o : orders) {
            wave.getOrders().add(o);
            o.setStatus(SalesOrderStatus.PICKING);
        }

        List<PickTaskSeed> seeds = new ArrayList<>();
        for (SalesOrder o : orders) {
            for (SalesOrderLine line : o.getLines()) {
                for (OrderLineAllocation alloc : line.getAllocations()) {
                    seeds.add(new PickTaskSeed(line, alloc));
                }
            }
        }

        seeds.sort(Comparator
                .comparing((PickTaskSeed s) -> s.alloc.getBin().getZone().getCode(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(s -> s.alloc.getBin().getCode(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(s -> s.line.getId()));

        int seq = 1;
        for (PickTaskSeed s : seeds) {
            PickTask task = new PickTask();
            task.setWave(wave);
            task.setSalesOrderLine(s.line);
            task.setWarehouse(wh);
            task.setBin(s.alloc.getBin());
            task.setItem(s.line.getItem());
            task.setQuantityToPick(s.alloc.getQuantity());
            task.setQuantityPicked(BigDecimal.ZERO);
            task.setStatus(PickTaskStatus.PENDING);
            task.setRouteSequence(seq++);
            wave.getTasks().add(task);
        }

        PickWave saved = pickWaveRepository.save(wave);
        salesOrderRepository.saveAll(orders);
        touch(saved);
        return OutboundMapper.toWaveResponse(saved);
    }

    @Transactional(readOnly = true)
    public PickWaveResponse get(Long id) {
        PickWave w = pickWaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pick wave not found: " + id));
        touch(w);
        return OutboundMapper.toWaveResponse(w);
    }

    private static void touch(PickWave w) {
        w.getWarehouse().getCode();
        w.getOrders().forEach(o -> o.getOrderNumber());
        w.getTasks().forEach(t -> {
            t.getBin().getCode();
            t.getBin().getZone().getCode();
            t.getItem().getSku();
            t.getSalesOrderLine().getOrder().getId();
        });
    }

    private record PickTaskSeed(SalesOrderLine line, OrderLineAllocation alloc) {
    }
}
