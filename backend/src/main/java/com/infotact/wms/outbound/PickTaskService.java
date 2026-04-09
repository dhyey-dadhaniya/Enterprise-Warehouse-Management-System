package com.infotact.wms.outbound;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedger;
import com.infotact.wms.inventory.InventoryLedgerRepository;
import com.infotact.wms.outbound.dto.PickTaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PickTaskService {

    public static final String LEDGER_REASON_OUTBOUND_PICK = "OUTBOUND_PICK";
    public static final String REF_TYPE_SALES_ORDER = "SALES_ORDER";

    private final PickTaskRepository pickTaskRepository;
    private final PickWaveRepository pickWaveRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;

    public PickTaskService(
            PickTaskRepository pickTaskRepository,
            PickWaveRepository pickWaveRepository,
            SalesOrderRepository salesOrderRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            InventoryLedgerRepository inventoryLedgerRepository
    ) {
        this.pickTaskRepository = pickTaskRepository;
        this.pickWaveRepository = pickWaveRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
    }

    @Transactional(readOnly = true)
    public PickTaskResponse get(Long id) {
        PickTask t = pickTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pick task not found: " + id));
        touch(t);
        return OutboundMapper.toTaskResponse(t);
    }

    @Transactional(readOnly = true)
    public List<PickTaskResponse> listByWave(Long waveId) {
        return pickTaskRepository.findByWave_IdOrderByRouteSequenceAsc(waveId).stream()
                .map(t -> {
                    touch(t);
                    return OutboundMapper.toTaskResponse(t);
                })
                .toList();
    }

    @Transactional
    public PickTaskResponse confirmPick(Long taskId) {
        PickTask task = pickTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Pick task not found: " + taskId));
        if (task.getStatus() != PickTaskStatus.PENDING) {
            throw new ConflictException("Pick task is not pending (status: " + task.getStatus() + ")");
        }

        BigDecimal qty = task.getQuantityToPick();
        SalesOrderLine line = task.getSalesOrderLine();
        SalesOrder order = line.getOrder();

        InventoryBalance bal = inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(
                        task.getWarehouse().getId(),
                        task.getBin().getId(),
                        task.getItem().getId())
                .orElseThrow(() -> new ConflictException("No inventory balance for pick location"));

        if (bal.getOnHandQty().compareTo(qty) < 0) {
            throw new ConflictException("Insufficient on-hand at bin for pick");
        }
        if (bal.getReservedQty().compareTo(qty) < 0) {
            throw new ConflictException("Insufficient reserved at bin for pick");
        }

        bal.setOnHandQty(bal.getOnHandQty().subtract(qty));
        bal.setReservedQty(bal.getReservedQty().subtract(qty));
        inventoryBalanceRepository.save(bal);

        InventoryLedger ledger = new InventoryLedger();
        ledger.setWarehouse(task.getWarehouse());
        ledger.setBin(task.getBin());
        ledger.setItem(task.getItem());
        ledger.setQtyDelta(qty.negate());
        ledger.setReason(LEDGER_REASON_OUTBOUND_PICK);
        ledger.setRefType(REF_TYPE_SALES_ORDER);
        ledger.setRefDocumentId(order.getId());
        ledger.setRefDocumentNumber(order.getOrderNumber());
        ledger.setRefLineId(line.getId());
        ledger.setNote("pickTaskId=" + task.getId());
        inventoryLedgerRepository.save(ledger);

        line.setQuantityPicked(line.getQuantityPicked().add(qty));
        task.setQuantityPicked(qty);
        task.setStatus(PickTaskStatus.COMPLETED);
        pickTaskRepository.save(task);

        refreshOrderStatus(order.getId());
        refreshWaveStatus(task.getWave().getId());

        PickTask saved = pickTaskRepository.findById(taskId).orElse(task);
        touch(saved);
        return OutboundMapper.toTaskResponse(saved);
    }

    private void refreshOrderStatus(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales order not found: " + orderId));
        boolean allPicked = order.getLines().stream().allMatch(l ->
                l.getQuantityPicked().compareTo(l.getQuantityOrdered()) >= 0);
        if (allPicked) {
            order.setStatus(SalesOrderStatus.COMPLETED);
            salesOrderRepository.save(order);
        }
    }

    private void refreshWaveStatus(Long waveId) {
        List<PickTask> tasks = pickTaskRepository.findByWave_IdOrderByRouteSequenceAsc(waveId);
        boolean allDone = tasks.stream().allMatch(t -> t.getStatus() == PickTaskStatus.COMPLETED);
        if (allDone) {
            PickWave wave = pickWaveRepository.findById(waveId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pick wave not found: " + waveId));
            wave.setStatus(PickWaveStatus.COMPLETED);
            pickWaveRepository.save(wave);
        }
    }

    private static void touch(PickTask t) {
        t.getWave().getId();
        t.getBin().getCode();
        t.getBin().getZone().getCode();
        t.getItem().getSku();
        t.getSalesOrderLine().getOrder().getId();
    }
}
