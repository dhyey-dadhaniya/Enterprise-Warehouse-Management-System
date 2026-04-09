package com.infotact.wms.outbound;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import com.infotact.wms.outbound.dto.SalesOrderCreateRequest;
import com.infotact.wms.outbound.dto.SalesOrderLineRequest;
import com.infotact.wms.outbound.dto.SalesOrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;

    public SalesOrderService(
            SalesOrderRepository salesOrderRepository,
            WarehouseRepository warehouseRepository,
            ItemRepository itemRepository,
            InventoryBalanceRepository inventoryBalanceRepository
    ) {
        this.salesOrderRepository = salesOrderRepository;
        this.warehouseRepository = warehouseRepository;
        this.itemRepository = itemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
    }

    @Transactional
    public SalesOrderResponse create(SalesOrderCreateRequest request) {
        Warehouse wh = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));

        String orderNumber = request.orderNumber();
        if (orderNumber == null || orderNumber.isBlank()) {
            orderNumber = "SO-" + System.nanoTime();
        } else {
            orderNumber = orderNumber.trim();
            if (salesOrderRepository.findByOrderNumber(orderNumber).isPresent()) {
                throw new ConflictException("orderNumber already exists: " + orderNumber);
            }
        }

        SalesOrder order = new SalesOrder();
        order.setWarehouse(wh);
        order.setOrderNumber(orderNumber);
        order.setStatus(SalesOrderStatus.OPEN);

        int n = 1;
        for (SalesOrderLineRequest lineReq : request.lines()) {
            Item item = itemRepository.findById(lineReq.itemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + lineReq.itemId()));
            SalesOrderLine line = new SalesOrderLine();
            line.setOrder(order);
            line.setLineNumber(n++);
            line.setItem(item);
            line.setQuantityOrdered(lineReq.quantityOrdered());
            line.setQuantityAllocated(BigDecimal.ZERO);
            line.setQuantityPicked(BigDecimal.ZERO);
            order.getLines().add(line);
        }

        SalesOrder saved = salesOrderRepository.save(order);
        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    @Transactional(readOnly = true)
    public SalesOrderResponse get(Long id) {
        SalesOrder o = salesOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + id));
        touch(o);
        return OutboundMapper.toOrderResponse(o);
    }

    @Transactional(readOnly = true)
    public PageResponse<SalesOrderResponse> list(Long warehouseId, Pageable pageable) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SalesOrder> page = warehouseId == null
                ? salesOrderRepository.findAll(p)
                : salesOrderRepository.findByWarehouse_Id(warehouseId, p);
        return PageResponse.of(page.map(o -> {
            touch(o);
            return OutboundMapper.toOrderResponse(o);
        }));
    }

    @Transactional
    public SalesOrderResponse allocate(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        if (order.getStatus() != SalesOrderStatus.OPEN) {
            throw new ConflictException("Order must be OPEN to allocate (current: " + order.getStatus() + ")");
        }

        Long whId = order.getWarehouse().getId();

        for (SalesOrderLine line : order.getLines()) {
            BigDecimal need = line.getQuantityOrdered().subtract(line.getQuantityAllocated());
            if (need.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            List<InventoryBalance> balances = inventoryBalanceRepository.findForAllocationOrderByLocation(
                    whId, line.getItem().getId());
            for (InventoryBalance bal : balances) {
                if (need.compareTo(BigDecimal.ZERO) <= 0) {
                    break;
                }
                BigDecimal available = bal.getOnHandQty().subtract(bal.getReservedQty());
                if (available.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                BigDecimal take = available.min(need);
                bal.setReservedQty(bal.getReservedQty().add(take));
                inventoryBalanceRepository.save(bal);

                OrderLineAllocation alloc = new OrderLineAllocation();
                alloc.setLine(line);
                alloc.setBin(bal.getBin());
                alloc.setQuantity(take);
                line.getAllocations().add(alloc);

                line.setQuantityAllocated(line.getQuantityAllocated().add(take));
                need = need.subtract(take);
            }
            if (need.compareTo(BigDecimal.ZERO) > 0) {
                throw new ConflictException(
                        "Insufficient available stock for item " + line.getItem().getSku()
                                + " on line " + line.getLineNumber() + " (short by " + need + ")"
                );
            }
        }

        order.setStatus(SalesOrderStatus.ALLOCATED);
        SalesOrder saved = salesOrderRepository.save(order);
        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    @Transactional
    public SalesOrderResponse cancel(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        if (order.getStatus() != SalesOrderStatus.OPEN) {
            throw new ConflictException("Only OPEN orders can be cancelled");
        }
        order.setStatus(SalesOrderStatus.CANCELLED);
        SalesOrder saved = salesOrderRepository.save(order);
        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    private static void touch(SalesOrder o) {
        o.getWarehouse().getCode();
        for (SalesOrderLine line : o.getLines()) {
            line.getItem().getSku();
        }
    }
}
