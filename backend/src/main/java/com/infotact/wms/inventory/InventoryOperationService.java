package com.infotact.wms.inventory;

import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inventory.dto.InventoryAdjustmentRequest;
import com.infotact.wms.inventory.dto.InventoryAdjustmentResponse;
import com.infotact.wms.inventory.dto.InventoryTransferRequest;
import com.infotact.wms.inventory.dto.InventoryTransferResponse;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class InventoryOperationService {

    public static final String REF_TYPE_ADJUSTMENT = "ADJUSTMENT";
    public static final String REF_TYPE_TRANSFER = "INVENTORY_TRANSFER";
    public static final String LEDGER_TRANSFER_OUT = "TRANSFER_OUT";
    public static final String LEDGER_TRANSFER_IN = "TRANSFER_IN";

    private final WarehouseRepository warehouseRepository;
    private final BinRepository binRepository;
    private final ItemRepository itemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final UserRepository userRepository;
    private final InventoryOpIdempotencyRepository inventoryOpIdempotencyRepository;

    public InventoryOperationService(
            WarehouseRepository warehouseRepository,
            BinRepository binRepository,
            ItemRepository itemRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            InventoryLedgerRepository inventoryLedgerRepository,
            UserRepository userRepository,
            InventoryOpIdempotencyRepository inventoryOpIdempotencyRepository
    ) {
        this.warehouseRepository = warehouseRepository;
        this.binRepository = binRepository;
        this.itemRepository = itemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
        this.userRepository = userRepository;
        this.inventoryOpIdempotencyRepository = inventoryOpIdempotencyRepository;
    }

    @Transactional
    public InventoryAdjustmentResponse adjust(InventoryAdjustmentRequest request, String username, String rawIdempotencyKey) {
        String idempotencyKey = com.infotact.wms.common.web.Idempotency.normalizeKey(rawIdempotencyKey);
        if (idempotencyKey != null) {
            var existing = inventoryOpIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                // Adjustment response is derived from current balance, so just proceed to read after no-op.
                InventoryOpIdempotency idem = existing.get();
                if (!"ADJUSTMENT".equals(idem.getOpType())) {
                    throw new ConflictException("Idempotency-Key was already used for a different operation type");
                }
                // Return balance snapshot for this request's location/item
                InventoryBalance bal = inventoryBalanceRepository
                        .findByWarehouse_IdAndBin_IdAndItem_Id(request.warehouseId(), request.binId(), request.itemId())
                        .orElseThrow(() -> new ConflictException("No inventory balance for requested location/item"));
                BigDecimal available = bal.getOnHandQty().subtract(bal.getReservedQty());
                return new InventoryAdjustmentResponse(
                        idem.getInventoryLedgerId(),
                        BigDecimal.ZERO,
                        bal.getOnHandQty(),
                        bal.getReservedQty(),
                        available
                );
            }
        }
        BigDecimal delta = request.quantityDelta();
        if (delta.compareTo(BigDecimal.ZERO) == 0) {
            throw new ConflictException("quantityDelta must not be zero");
        }

        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));
        Bin bin = loadActiveBinInWarehouse(request.binId(), warehouse.getId());
        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        InventoryBalance balance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), bin.getId(), item.getId())
                .orElseGet(() -> newBalance(warehouse, bin, item));

        BigDecimal newOnHand = balance.getOnHandQty().add(delta);
        if (newOnHand.compareTo(BigDecimal.ZERO) < 0) {
            throw new ConflictException("Adjustment would make on-hand negative");
        }
        if (newOnHand.compareTo(balance.getReservedQty()) < 0) {
            throw new ConflictException("Adjustment would leave on-hand below reserved quantity");
        }

        balance.setOnHandQty(newOnHand);
        inventoryBalanceRepository.save(balance);

        InventoryLedger ledger = new InventoryLedger();
        ledger.setWarehouse(warehouse);
        ledger.setActorUser(actor);
        ledger.setBin(bin);
        ledger.setItem(item);
        ledger.setQtyDelta(delta);
        ledger.setReason(request.reason().name());
        ledger.setRefType(REF_TYPE_ADJUSTMENT);
        ledger.setRefDocumentNumber("ADJ-" + UUID.randomUUID());
        ledger.setNote(buildNote(request.note(), request.reason()));

        InventoryLedger saved = inventoryLedgerRepository.save(ledger);

        if (idempotencyKey != null) {
            InventoryOpIdempotency idem = new InventoryOpIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setOpType("ADJUSTMENT");
            idem.setInventoryLedgerId(saved.getId());
            inventoryOpIdempotencyRepository.save(idem);
        }

        BigDecimal available = newOnHand.subtract(balance.getReservedQty());
        return new InventoryAdjustmentResponse(
                saved.getId(),
                delta,
                newOnHand,
                balance.getReservedQty(),
                available
        );
    }

    @Transactional
    public InventoryTransferResponse transfer(InventoryTransferRequest request, String username, String rawIdempotencyKey) {
        String idempotencyKey = com.infotact.wms.common.web.Idempotency.normalizeKey(rawIdempotencyKey);
        if (idempotencyKey != null) {
            var existing = inventoryOpIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                InventoryOpIdempotency idem = existing.get();
                if (!"TRANSFER".equals(idem.getOpType())) {
                    throw new ConflictException("Idempotency-Key was already used for a different operation type");
                }
                // Return snapshot; we can't reconstruct both ledger ids with this table, but we can return ref + after qty from current balances.
                InventoryBalance fromBal = inventoryBalanceRepository
                        .findByWarehouse_IdAndBin_IdAndItem_Id(request.warehouseId(), request.fromBinId(), request.itemId())
                        .orElseThrow(() -> new ConflictException("No inventory balance for from-bin"));
                InventoryBalance toBal = inventoryBalanceRepository
                        .findByWarehouse_IdAndBin_IdAndItem_Id(request.warehouseId(), request.toBinId(), request.itemId())
                        .orElseGet(() -> {
                            InventoryBalance b = newBalance(
                                    warehouseRepository.findById(request.warehouseId()).orElseThrow(),
                                    loadActiveBinInWarehouse(request.toBinId(), request.warehouseId()),
                                    itemRepository.findById(request.itemId()).orElseThrow()
                            );
                            return inventoryBalanceRepository.save(b);
                        });
                return new InventoryTransferResponse(
                        "TRF-REPLAY",
                        idem.getInventoryLedgerId(),
                        idem.getInventoryLedgerId(),
                        fromBal.getOnHandQty(),
                        toBal.getOnHandQty()
                );
            }
        }
        if (request.fromBinId().equals(request.toBinId())) {
            throw new ConflictException("fromBinId and toBinId must differ");
        }

        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));
        Bin fromBin = loadActiveBinInWarehouse(request.fromBinId(), warehouse.getId());
        Bin toBin = loadActiveBinInWarehouse(request.toBinId(), warehouse.getId());
        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        BigDecimal qty = request.quantity();

        InventoryBalance fromBalance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), fromBin.getId(), item.getId())
                .orElseThrow(() -> new ConflictException("No on-hand at source bin for this item"));
        if (fromBalance.getOnHandQty().compareTo(qty) < 0) {
            throw new ConflictException("Insufficient on-hand at source (have " + fromBalance.getOnHandQty() + ")");
        }
        BigDecimal fromAfter = fromBalance.getOnHandQty().subtract(qty);
        if (fromAfter.compareTo(fromBalance.getReservedQty()) < 0) {
            throw new ConflictException("Transfer would leave on-hand below reserved at source bin");
        }

        fromBalance.setOnHandQty(fromAfter);
        inventoryBalanceRepository.save(fromBalance);

        InventoryBalance toBalance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), toBin.getId(), item.getId())
                .orElseGet(() -> newBalance(warehouse, toBin, item));
        BigDecimal toAfter = toBalance.getOnHandQty().add(qty);
        toBalance.setOnHandQty(toAfter);
        inventoryBalanceRepository.save(toBalance);

        String transferRef = "TRF-" + UUID.randomUUID();

        String moveNote = buildTransferNote(request.note(), fromBin, toBin);
        InventoryLedger out = new InventoryLedger();
        out.setWarehouse(warehouse);
        out.setActorUser(actor);
        out.setBin(fromBin);
        out.setItem(item);
        out.setQtyDelta(qty.negate());
        out.setReason(LEDGER_TRANSFER_OUT);
        out.setRefType(REF_TYPE_TRANSFER);
        out.setRefDocumentNumber(transferRef);
        out.setNote(moveNote);
        InventoryLedger savedOut = inventoryLedgerRepository.save(out);

        InventoryLedger in = new InventoryLedger();
        in.setWarehouse(warehouse);
        in.setActorUser(actor);
        in.setBin(toBin);
        in.setItem(item);
        in.setQtyDelta(qty);
        in.setReason(LEDGER_TRANSFER_IN);
        in.setRefType(REF_TYPE_TRANSFER);
        in.setRefDocumentNumber(transferRef);
        in.setNote(moveNote);
        InventoryLedger savedIn = inventoryLedgerRepository.save(in);

        if (idempotencyKey != null) {
            InventoryOpIdempotency idem = new InventoryOpIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setOpType("TRANSFER");
            idem.setInventoryLedgerId(savedOut.getId());
            inventoryOpIdempotencyRepository.save(idem);
        }

        return new InventoryTransferResponse(
                transferRef,
                savedOut.getId(),
                savedIn.getId(),
                fromAfter,
                toAfter
        );
    }

    private static String buildNote(String userNote, InventoryAdjustmentReason reason) {
        String base = "reason=" + reason.name();
        if (userNote == null || userNote.isBlank()) {
            return base;
        }
        return userNote.trim() + " | " + base;
    }

    private static String buildTransferNote(String userNote, Bin from, Bin to) {
        String base = "from=" + from.getCode() + " to=" + to.getCode();
        if (userNote == null || userNote.isBlank()) {
            return base;
        }
        return userNote.trim() + " | " + base;
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
            throw new ConflictException("Bin is not in the given warehouse");
        }
        return bin;
    }
}
