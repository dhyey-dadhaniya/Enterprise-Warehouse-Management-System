package com.infotact.wms.outbound;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inventory.InventoryLedger;
import com.infotact.wms.inventory.InventoryLedgerRepository;
import com.infotact.wms.outbound.dto.PickTaskResponse;
import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PickTaskService {

    public static final String LEDGER_REASON_OUTBOUND_PICK_CONFIRMED = "OUTBOUND_PICK_CONFIRMED";
    public static final String REF_TYPE_SALES_ORDER = "SALES_ORDER";

    private final PickTaskRepository pickTaskRepository;
    private final PickWaveRepository pickWaveRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final UserRepository userRepository;
    private final PickConfirmIdempotencyRepository pickConfirmIdempotencyRepository;

    public PickTaskService(
            PickTaskRepository pickTaskRepository,
            PickWaveRepository pickWaveRepository,
            SalesOrderRepository salesOrderRepository,
            InventoryLedgerRepository inventoryLedgerRepository,
            UserRepository userRepository,
            PickConfirmIdempotencyRepository pickConfirmIdempotencyRepository
    ) {
        this.pickTaskRepository = pickTaskRepository;
        this.pickWaveRepository = pickWaveRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
        this.userRepository = userRepository;
        this.pickConfirmIdempotencyRepository = pickConfirmIdempotencyRepository;
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
    public PickTaskResponse confirmPick(Long taskId, String username, String rawIdempotencyKey) {
        String idempotencyKey = com.infotact.wms.common.web.Idempotency.normalizeKey(rawIdempotencyKey);
        PickTask task = pickTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Pick task not found: " + taskId));

        if (idempotencyKey != null) {
            var existing = pickConfirmIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                PickConfirmIdempotency idem = existing.get();
                if (!idem.getTask().getId().equals(taskId)) {
                    throw new ConflictException("Idempotency-Key was already used for a different pick task");
                }
                PickTask refreshed = pickTaskRepository.findById(taskId).orElse(task);
                touch(refreshed);
                return OutboundMapper.toTaskResponse(refreshed);
            }
        }

        if (task.getStatus() != PickTaskStatus.PENDING) {
            throw new ConflictException("Pick task is not pending (status: " + task.getStatus() + ")");
        }
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        BigDecimal qty = task.getQuantityToPick();
        SalesOrderLine line = task.getSalesOrderLine();
        SalesOrder order = line.getOrder();

        InventoryLedger ledger = new InventoryLedger();
        ledger.setWarehouse(task.getWarehouse());
        ledger.setActorUser(actor);
        ledger.setBin(task.getBin());
        ledger.setItem(task.getItem());
        ledger.setQtyDelta(BigDecimal.ZERO); // decrement happens at PACK stage
        ledger.setReason(LEDGER_REASON_OUTBOUND_PICK_CONFIRMED);
        ledger.setRefType(REF_TYPE_SALES_ORDER);
        ledger.setRefDocumentId(order.getId());
        ledger.setRefDocumentNumber(order.getOrderNumber());
        ledger.setRefLineId(line.getId());
        ledger.setNote("pickTaskId=" + task.getId());
        InventoryLedger savedLedger = inventoryLedgerRepository.save(ledger);

        if (idempotencyKey != null) {
            PickConfirmIdempotency idem = new PickConfirmIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setTask(task);
            idem.setInventoryLedgerId(savedLedger.getId());
            pickConfirmIdempotencyRepository.save(idem);
        }

        line.setQuantityPicked(line.getQuantityPicked().add(qty));
        task.setQuantityPicked(qty);
        task.setStatus(PickTaskStatus.COMPLETED);
        pickTaskRepository.save(task);

        refreshWaveStatus(task.getWave().getId());

        PickTask saved = pickTaskRepository.findById(taskId).orElse(task);
        touch(saved);
        return OutboundMapper.toTaskResponse(saved);
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
