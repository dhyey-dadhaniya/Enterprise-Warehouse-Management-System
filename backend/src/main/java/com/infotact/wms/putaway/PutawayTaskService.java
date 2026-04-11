package com.infotact.wms.putaway;

import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inbound.InboundDocumentLine;
import com.infotact.wms.inbound.InboundDocumentLineRepository;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedger;
import com.infotact.wms.inventory.InventoryLedgerRepository;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import com.infotact.wms.putaway.dto.PutawayConfirmRequest;
import com.infotact.wms.putaway.dto.PutawaySuggestionResponse;
import com.infotact.wms.putaway.dto.PutawayTaskCreateRequest;
import com.infotact.wms.putaway.dto.PutawayTaskResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PutawayTaskService {

    public static final String LEDGER_REASON_PUTAWAY_OUT = "PUTAWAY_OUT";
    public static final String LEDGER_REASON_PUTAWAY_IN = "PUTAWAY_IN";
    public static final String REF_TYPE_PUTAWAY_TASK = "PUTAWAY_TASK";

    private final PutawayTaskRepository putawayTaskRepository;
    private final PutawaySuggestionService putawaySuggestionService;
    private final WarehouseRepository warehouseRepository;
    private final BinRepository binRepository;
    private final ItemRepository itemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final PutawayConfirmIdempotencyRepository putawayConfirmIdempotencyRepository;
    private final InboundDocumentLineRepository inboundDocumentLineRepository;
    private final UserRepository userRepository;

    public PutawayTaskService(
            PutawayTaskRepository putawayTaskRepository,
            PutawaySuggestionService putawaySuggestionService,
            WarehouseRepository warehouseRepository,
            BinRepository binRepository,
            ItemRepository itemRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            InventoryLedgerRepository inventoryLedgerRepository,
            PutawayConfirmIdempotencyRepository putawayConfirmIdempotencyRepository,
            InboundDocumentLineRepository inboundDocumentLineRepository,
            UserRepository userRepository
    ) {
        this.putawayTaskRepository = putawayTaskRepository;
        this.putawaySuggestionService = putawaySuggestionService;
        this.warehouseRepository = warehouseRepository;
        this.binRepository = binRepository;
        this.itemRepository = itemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
        this.putawayConfirmIdempotencyRepository = putawayConfirmIdempotencyRepository;
        this.inboundDocumentLineRepository = inboundDocumentLineRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PutawaySuggestionResponse previewSuggestion(Long warehouseId, Long itemId, Long fromBinId) {
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + warehouseId));
        Bin from = loadBinInWarehouse(fromBinId, warehouseId);
        itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + itemId));
        PutawaySuggestionService.PutawaySuggestion suggestion = putawaySuggestionService
                .suggest(warehouseId, itemId, fromBinId)
                .orElseThrow(() -> new ConflictException("No suitable storage bin found for putaway"));
        return new PutawaySuggestionResponse(warehouseId, itemId, from.getId(), suggestion.suggestedBinId(), suggestion.rule());
    }

    @Transactional(readOnly = true)
    public PageResponse<PutawayTaskResponse> list(Long warehouseId, Pageable pageable) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PutawayTask> page = warehouseId == null
                ? putawayTaskRepository.findAll(p)
                : putawayTaskRepository.findByWarehouse_Id(warehouseId, p);
        return PageResponse.of(page.map(PutawayMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public PutawayTaskResponse get(Long id) {
        PutawayTask task = putawayTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Putaway task not found: " + id));
        touch(task);
        return PutawayMapper.toResponse(task);
    }

    @Transactional
    public PutawayTaskResponse create(PutawayTaskCreateRequest request) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));
        Bin fromBin = loadBinInWarehouse(request.fromBinId(), warehouse.getId());
        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));

        BigDecimal available = inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(warehouse.getId(), fromBin.getId(), item.getId())
                .map(b -> b.getOnHandQty())
                .orElse(BigDecimal.ZERO);
        if (available.compareTo(request.quantity()) < 0) {
            throw new ConflictException("Insufficient quantity at from-bin for putaway (on hand: " + available + ")");
        }

        InboundDocumentLine line = null;
        if (request.inboundDocumentLineId() != null) {
            line = inboundDocumentLineRepository.findById(request.inboundDocumentLineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Inbound line not found: " + request.inboundDocumentLineId()));
            if (!line.getItem().getId().equals(item.getId())) {
                throw new ConflictException("Inbound line item does not match putaway item");
            }
            if (!line.getDocument().getWarehouse().getId().equals(warehouse.getId())) {
                throw new ConflictException("Inbound line warehouse does not match");
            }
        }

        PutawaySuggestionService.PutawaySuggestion suggestion = putawaySuggestionService
                .suggest(warehouse.getId(), item.getId(), fromBin.getId())
                .orElseThrow(() -> new ConflictException("No suitable storage bin found for putaway"));

        Bin suggestedTo = binRepository.findById(suggestion.suggestedBinId())
                .orElseThrow(() -> new ResourceNotFoundException("Suggested bin not found: " + suggestion.suggestedBinId()));
        if (!suggestedTo.getZone().getWarehouse().getId().equals(warehouse.getId())) {
            throw new ConflictException("Suggested bin is not in the same warehouse");
        }

        PutawayTask task = new PutawayTask();
        task.setWarehouse(warehouse);
        task.setStatus(PutawayTaskStatus.PENDING);
        task.setFromBin(fromBin);
        task.setSuggestedToBin(suggestedTo);
        task.setItem(item);
        task.setQuantity(request.quantity());
        task.setSuggestionRule(suggestion.rule());
        task.setInboundLine(line);

        PutawayTask saved = putawayTaskRepository.save(task);
        touch(saved);
        return PutawayMapper.toResponse(saved);
    }

    @Transactional
    public PutawayTaskResponse claim(long taskId, String username) {
        PutawayTask task = putawayTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Putaway task not found: " + taskId));
        if (task.getStatus() != PutawayTaskStatus.PENDING) {
            throw new ConflictException("Putaway task is not claimable in status " + task.getStatus());
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        task.setAssignedUser(user);
        task.setStatus(PutawayTaskStatus.IN_PROGRESS);
        PutawayTask saved = putawayTaskRepository.save(task);
        touch(saved);
        return PutawayMapper.toResponse(saved);
    }

    @Transactional
    public PutawayTaskResponse confirm(
            long taskId,
            String username,
            PutawayConfirmRequest request,
            boolean managerOrAdmin,
            String rawIdempotencyKey
    ) {
        String idempotencyKey = com.infotact.wms.common.web.Idempotency.normalizeKey(rawIdempotencyKey);

        PutawayTask task = putawayTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Putaway task not found: " + taskId));

        if (idempotencyKey != null) {
            var existing = putawayConfirmIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                PutawayConfirmIdempotency idem = existing.get();
                if (!idem.getTask().getId().equals(taskId)) {
                    throw new ConflictException("Idempotency-Key was already used for a different putaway task");
                }
                // Return latest state
                PutawayTask refreshed = putawayTaskRepository.findById(taskId).orElse(task);
                touch(refreshed);
                return PutawayMapper.toResponse(refreshed);
            }
        }

        if (task.getStatus() != PutawayTaskStatus.IN_PROGRESS) {
            throw new ConflictException("Putaway task must be IN_PROGRESS to confirm (current: " + task.getStatus() + ")");
        }
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        if (!managerOrAdmin && (task.getAssignedUser() == null || !task.getAssignedUser().getId().equals(actor.getId()))) {
            throw new ConflictException("Putaway task is assigned to another user");
        }

        Warehouse warehouse = task.getWarehouse();
        Bin fromBin = task.getFromBin();
        Item item = task.getItem();
        BigDecimal qty = task.getQuantity();

        Long toBinId = request != null && request.toBinId() != null
                ? request.toBinId()
                : task.getSuggestedToBin().getId();
        Bin toBin = loadActiveBinInWarehouse(toBinId, warehouse.getId());
        if (toBin.getId().equals(fromBin.getId())) {
            throw new ConflictException("Destination bin must differ from source bin");
        }

        InventoryBalance fromBalance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), fromBin.getId(), item.getId())
                .orElseThrow(() -> new ConflictException("No inventory at source bin for this item"));
        if (fromBalance.getOnHandQty().compareTo(qty) < 0) {
            throw new ConflictException("Insufficient on-hand at source bin (have " + fromBalance.getOnHandQty() + ")");
        }

        fromBalance.setOnHandQty(fromBalance.getOnHandQty().subtract(qty));
        inventoryBalanceRepository.save(fromBalance);

        InventoryBalance toBalance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), toBin.getId(), item.getId())
                .orElseGet(() -> newBalance(warehouse, toBin, item));
        toBalance.setOnHandQty(toBalance.getOnHandQty().add(qty));
        inventoryBalanceRepository.save(toBalance);

        String note = request != null && request.note() != null && !request.note().isBlank()
                ? request.note().trim()
                : null;
        String refNote = buildConfirmLedgerNote(note, fromBin, toBin);

        InventoryLedger out = new InventoryLedger();
        out.setWarehouse(warehouse);
        out.setActorUser(actor);
        out.setBin(fromBin);
        out.setItem(item);
        out.setQtyDelta(qty.negate());
        out.setReason(LEDGER_REASON_PUTAWAY_OUT);
        out.setRefType(REF_TYPE_PUTAWAY_TASK);
        out.setRefDocumentId(task.getId());
        out.setRefDocumentNumber("PUTAWAY-" + task.getId());
        out.setNote(refNote);
        InventoryLedger savedOut = inventoryLedgerRepository.save(out);

        InventoryLedger in = new InventoryLedger();
        in.setWarehouse(warehouse);
        in.setActorUser(actor);
        in.setBin(toBin);
        in.setItem(item);
        in.setQtyDelta(qty);
        in.setReason(LEDGER_REASON_PUTAWAY_IN);
        in.setRefType(REF_TYPE_PUTAWAY_TASK);
        in.setRefDocumentId(task.getId());
        in.setRefDocumentNumber("PUTAWAY-" + task.getId());
        in.setNote(refNote);
        InventoryLedger savedIn = inventoryLedgerRepository.save(in);

        if (idempotencyKey != null) {
            PutawayConfirmIdempotency idem = new PutawayConfirmIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setTask(task);
            idem.setConfirmedToBin(toBin);
            idem.setInventoryLedgerOutId(savedOut.getId());
            idem.setInventoryLedgerInId(savedIn.getId());
            putawayConfirmIdempotencyRepository.save(idem);
        }

        task.setConfirmedToBin(toBin);
        task.setStatus(PutawayTaskStatus.COMPLETED);
        PutawayTask saved = putawayTaskRepository.save(task);
        touch(saved);
        return PutawayMapper.toResponse(saved);
    }

    private static String buildConfirmLedgerNote(String userNote, Bin from, Bin to) {
        String move = "from=" + from.getCode() + " to=" + to.getCode();
        if (userNote == null || userNote.isEmpty()) {
            return move;
        }
        return userNote + " | " + move;
    }

    private static InventoryBalance newBalance(Warehouse warehouse, Bin bin, Item item) {
        InventoryBalance b = new InventoryBalance();
        b.setWarehouse(warehouse);
        b.setBin(bin);
        b.setItem(item);
        b.setOnHandQty(BigDecimal.ZERO);
        b.setReservedQty(BigDecimal.ZERO);
        return b;
    }

    private Bin loadActiveBinInWarehouse(Long binId, Long warehouseId) {
        Bin bin = binRepository.findById(binId)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + binId));
        if (!bin.isActive()) {
            throw new ConflictException("Bin is not active: " + binId);
        }
        if (!bin.getZone().getWarehouse().getId().equals(warehouseId)) {
            throw new ConflictException("Bin is not in the task warehouse");
        }
        return bin;
    }

    private static void touch(PutawayTask t) {
        t.getWarehouse().getId();
        t.getFromBin().getCode();
        t.getSuggestedToBin().getCode();
        t.getItem().getSku();
        if (t.getInboundLine() != null) {
            t.getInboundLine().getId();
        }
        if (t.getAssignedUser() != null) {
            t.getAssignedUser().getUsername();
        }
        if (t.getConfirmedToBin() != null) {
            t.getConfirmedToBin().getCode();
        }
    }

    private Bin loadBinInWarehouse(Long binId, Long warehouseId) {
        Bin bin = binRepository.findById(binId)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + binId));
        if (!bin.getZone().getWarehouse().getId().equals(warehouseId)) {
            throw new ConflictException("Bin is not in the given warehouse");
        }
        return bin;
    }
}
