package com.infotact.wms.outbound;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.InsufficientStockException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedger;
import com.infotact.wms.inventory.InventoryLedgerRepository;
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
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SalesOrderService {

    public static final String LEDGER_REASON_OUTBOUND_PACK = "OUTBOUND_PACK";
    public static final String REF_TYPE_SALES_ORDER = "SALES_ORDER";

    private final SalesOrderRepository salesOrderRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final PickTaskRepository pickTaskRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final UserRepository userRepository;
    private final SalesOrderPackIdempotencyRepository salesOrderPackIdempotencyRepository;

    public SalesOrderService(
            SalesOrderRepository salesOrderRepository,
            WarehouseRepository warehouseRepository,
            ItemRepository itemRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            PickTaskRepository pickTaskRepository,
            InventoryLedgerRepository inventoryLedgerRepository,
            UserRepository userRepository,
            SalesOrderPackIdempotencyRepository salesOrderPackIdempotencyRepository
    ) {
        this.salesOrderRepository = salesOrderRepository;
        this.warehouseRepository = warehouseRepository;
        this.itemRepository = itemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.pickTaskRepository = pickTaskRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
        this.userRepository = userRepository;
        this.salesOrderPackIdempotencyRepository = salesOrderPackIdempotencyRepository;
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
        order.setStatus(SalesOrderStatus.PENDING);

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
        if (order.getStatus() != SalesOrderStatus.PENDING) {
            throw new ConflictException("Order must be PENDING to allocate (current: " + order.getStatus() + ")");
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
                InventoryBalance locked = inventoryBalanceRepository
                        .findForUpdate(whId, bal.getBin().getId(), bal.getItem().getId())
                        .orElse(bal);
                BigDecimal available = locked.getOnHandQty().subtract(locked.getReservedQty());
                if (available.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                BigDecimal take = available.min(need);
                locked.setReservedQty(locked.getReservedQty().add(take));
                inventoryBalanceRepository.save(locked);

                OrderLineAllocation alloc = new OrderLineAllocation();
                alloc.setLine(line);
                alloc.setBin(locked.getBin());
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

        SalesOrder saved = salesOrderRepository.save(order);
        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    @Transactional
    public SalesOrderResponse cancel(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        if (order.getStatus() != SalesOrderStatus.PENDING) {
            throw new ConflictException("Only PENDING orders can be cancelled");
        }
        order.setStatus(SalesOrderStatus.CANCELLED);
        SalesOrder saved = salesOrderRepository.save(order);
        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    @Transactional
    public SalesOrderResponse pack(Long orderId, String username, String rawIdempotencyKey) {
        String idempotencyKey = com.infotact.wms.common.web.Idempotency.normalizeKey(rawIdempotencyKey);
        if (idempotencyKey != null) {
            var existing = salesOrderPackIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                SalesOrderPackIdempotency idem = existing.get();
                if (!idem.getSalesOrder().getId().equals(orderId)) {
                    throw new ConflictException("Idempotency-Key was already used for a different sales order");
                }
                SalesOrder refreshed = salesOrderRepository.findById(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
                touch(refreshed);
                return OutboundMapper.toOrderResponse(refreshed);
            }
        }

        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        if (order.getStatus() != SalesOrderStatus.PICKING) {
            throw new ConflictException("Order must be PICKING to pack (current: " + order.getStatus() + ")");
        }

        boolean allPicked = order.getLines().stream().allMatch(l ->
                l.getQuantityPicked().compareTo(l.getQuantityOrdered()) >= 0);
        if (!allPicked) {
            throw new ConflictException("Cannot pack order until all lines are picked");
        }

        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        List<PickTask> tasks = pickTaskRepository.findBySalesOrderLine_Order_Id(order.getId());
        if (tasks.isEmpty()) {
            throw new ConflictException("No pick tasks found for this order");
        }
        if (!tasks.stream().allMatch(t -> t.getStatus() == PickTaskStatus.COMPLETED)) {
            throw new ConflictException("Cannot pack order until all pick tasks are completed");
        }

        // Decrement on-hand + reserved at pack time (ACID), ensuring reserved existed from allocation.
        for (PickTask t : tasks) {
            BigDecimal qty = t.getQuantityToPick();
            InventoryBalance bal = inventoryBalanceRepository
                    .findForUpdate(t.getWarehouse().getId(), t.getBin().getId(), t.getItem().getId())
                    .orElseThrow(() -> new InsufficientStockException("No inventory balance for packed location"));

            if (bal.getReservedQty().compareTo(qty) < 0) {
                throw new InsufficientStockException("Insufficient reserved at bin for pack");
            }
            if (bal.getOnHandQty().compareTo(qty) < 0) {
                throw new InsufficientStockException("Insufficient on-hand at bin for pack");
            }

            bal.setOnHandQty(bal.getOnHandQty().subtract(qty));
            bal.setReservedQty(bal.getReservedQty().subtract(qty));
            inventoryBalanceRepository.save(bal);

            InventoryLedger ledger = new InventoryLedger();
            ledger.setWarehouse(t.getWarehouse());
            ledger.setActorUser(actor);
            ledger.setBin(t.getBin());
            ledger.setItem(t.getItem());
            ledger.setQtyDelta(qty.negate());
            ledger.setReason(LEDGER_REASON_OUTBOUND_PACK);
            ledger.setRefType(REF_TYPE_SALES_ORDER);
            ledger.setRefDocumentId(order.getId());
            ledger.setRefDocumentNumber(order.getOrderNumber());
            ledger.setRefLineId(t.getSalesOrderLine().getId());
            ledger.setNote("packFromPickTaskId=" + t.getId());
            inventoryLedgerRepository.save(ledger);
        }

        order.setStatus(SalesOrderStatus.PACKED);
        SalesOrder saved = salesOrderRepository.save(order);

        if (idempotencyKey != null) {
            SalesOrderPackIdempotency idem = new SalesOrderPackIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setSalesOrder(saved);
            idem.setPackedAt(LocalDateTime.now());
            salesOrderPackIdempotencyRepository.save(idem);
        }

        touch(saved);
        return OutboundMapper.toOrderResponse(saved);
    }

    @Transactional
    public SalesOrderResponse ship(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        if (order.getStatus() != SalesOrderStatus.PACKED) {
            throw new ConflictException("Order must be PACKED to ship (current: " + order.getStatus() + ")");
        }
        order.setStatus(SalesOrderStatus.SHIPPED);
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
