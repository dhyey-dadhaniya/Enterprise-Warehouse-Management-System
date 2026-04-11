package com.infotact.wms.inbound;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inbound.dto.ReceivingPostRequest;
import com.infotact.wms.inbound.dto.ReceivingPostResponse;
import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedger;
import com.infotact.wms.inventory.InventoryLedgerRepository;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.Warehouse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReceivingPostService {

    public static final String LEDGER_REASON_RECEIVING_POST = "RECEIVING_POST";
    public static final String REF_TYPE_INBOUND = "INBOUND";

    private final InboundDocumentLineRepository inboundDocumentLineRepository;
    private final InboundDocumentRepository inboundDocumentRepository;
    private final BinRepository binRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final ReceivingPostIdempotencyRepository receivingPostIdempotencyRepository;

    public ReceivingPostService(
            InboundDocumentLineRepository inboundDocumentLineRepository,
            InboundDocumentRepository inboundDocumentRepository,
            BinRepository binRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            InventoryLedgerRepository inventoryLedgerRepository,
            ReceivingPostIdempotencyRepository receivingPostIdempotencyRepository
    ) {
        this.inboundDocumentLineRepository = inboundDocumentLineRepository;
        this.inboundDocumentRepository = inboundDocumentRepository;
        this.binRepository = binRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.inventoryLedgerRepository = inventoryLedgerRepository;
        this.receivingPostIdempotencyRepository = receivingPostIdempotencyRepository;
    }

    @Transactional
    public ReceivingPostResponse post(
            Long documentId,
            Long lineId,
            ReceivingPostRequest request,
            String rawIdempotencyKey
    ) {
        String idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);

        InboundDocumentLine line = inboundDocumentLineRepository.findForUpdate(lineId, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound line not found: " + lineId));
        InboundDocument doc = line.getDocument();

        if (idempotencyKey != null) {
            Optional<ReceivingPostIdempotency> existing = receivingPostIdempotencyRepository.findById(idempotencyKey);
            if (existing.isPresent()) {
                assertIdempotentRequestMatches(existing.get(), documentId, lineId, request);
                InboundDocumentLine refreshed = inboundDocumentLineRepository.findByIdAndDocument_Id(lineId, documentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Inbound line not found: " + lineId));
                InboundDocument refreshedDoc = inboundDocumentRepository.findById(documentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + documentId));
                return toResponse(
                        refreshedDoc,
                        refreshed,
                        existing.get().getQuantity(),
                        existing.get().getInventoryLedgerId(),
                        existing.get().getStagingBinId(),
                        true
                );
            }
        }

        assertCanPost(doc.getStatus());

        BigDecimal qty = request.quantity();
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ConflictException("Quantity must be positive");
        }

        BigDecimal remaining = line.getReceivedQty().subtract(line.getPostedQty());
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            remaining = BigDecimal.ZERO;
        }
        if (qty.compareTo(remaining) > 0) {
            throw new ConflictException(
                    "Cannot post more than received but not yet posted (remaining: " + remaining + ")"
            );
        }

        Warehouse warehouse = doc.getWarehouse();
        Bin stagingBin = loadStagingBin(request.stagingBinId(), warehouse.getId());

        if (doc.getStatus() == InboundDocumentStatus.OPEN) {
            doc.setStatus(InboundDocumentStatus.RECEIVING);
        }

        Item item = line.getItem();
        InventoryBalance balance = inventoryBalanceRepository
                .findForUpdate(warehouse.getId(), stagingBin.getId(), item.getId())
                .orElseGet(() -> newBalance(warehouse, stagingBin, item));
        balance.setOnHandQty(balance.getOnHandQty().add(qty));
        inventoryBalanceRepository.save(balance);

        InventoryLedger ledger = new InventoryLedger();
        ledger.setWarehouse(warehouse);
        ledger.setBin(stagingBin);
        ledger.setItem(item);
        ledger.setQtyDelta(qty);
        ledger.setReason(LEDGER_REASON_RECEIVING_POST);
        ledger.setRefType(REF_TYPE_INBOUND);
        ledger.setRefDocumentId(doc.getId());
        ledger.setRefDocumentNumber(doc.getDocumentNumber());
        ledger.setRefLineId(line.getId());
        ledger.setNote(buildLedgerNote(request.note(), line));

        InventoryLedger savedLedger = inventoryLedgerRepository.save(ledger);

        line.setPostedQty(line.getPostedQty().add(qty));
        inboundDocumentLineRepository.save(line);

        refreshDocumentStatus(doc);
        inboundDocumentRepository.save(doc);

        if (idempotencyKey != null) {
            ReceivingPostIdempotency idem = new ReceivingPostIdempotency();
            idem.setIdempotencyKey(idempotencyKey);
            idem.setDocument(doc);
            idem.setLine(line);
            idem.setStagingBinId(stagingBin.getId());
            idem.setQuantity(qty);
            idem.setInventoryLedgerId(savedLedger.getId());
            idem.setCreatedAt(LocalDateTime.now());
            receivingPostIdempotencyRepository.save(idem);
        }

        InboundDocumentLine refreshedLine = inboundDocumentLineRepository.findByIdAndDocument_Id(lineId, documentId)
                .orElse(line);
        InboundDocument refreshedDoc = inboundDocumentRepository.findById(documentId).orElse(doc);
        return toResponse(refreshedDoc, refreshedLine, qty, savedLedger.getId(), stagingBin.getId(), false);
    }

    private static void assertCanPost(InboundDocumentStatus status) {
        if (status == InboundDocumentStatus.DRAFT
                || status == InboundDocumentStatus.CANCELLED
                || status == InboundDocumentStatus.COMPLETED) {
            throw new ConflictException("Cannot post receipts while document is " + status);
        }
        if (status != InboundDocumentStatus.OPEN
                && status != InboundDocumentStatus.RECEIVING
                && status != InboundDocumentStatus.PARTIALLY_RECEIVED) {
            throw new ConflictException("Cannot post receipts while document is " + status);
        }
    }

    private Bin loadStagingBin(Long binId, Long warehouseId) {
        Bin bin = binRepository.findById(binId)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + binId));
        if (!bin.isActive()) {
            throw new ConflictException("Bin is not active: " + binId);
        }
        if (!bin.getZone().getWarehouse().getId().equals(warehouseId)) {
            throw new ConflictException("Staging bin is not in the inbound document warehouse");
        }
        return bin;
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

    private void refreshDocumentStatus(InboundDocument doc) {
        List<InboundDocumentLine> lines = inboundDocumentLineRepository.findByDocument_IdOrderByLineNumberAsc(doc.getId());
        boolean anyPosted = lines.stream()
                .anyMatch(l -> l.getPostedQty().compareTo(BigDecimal.ZERO) > 0);
        boolean allLinesClosed = lines.stream().allMatch(l -> {
            boolean postedMatchesReceived = l.getPostedQty().compareTo(l.getReceivedQty()) == 0;
            boolean receivedRecordedIfExpected = l.getExpectedQty().compareTo(BigDecimal.ZERO) <= 0
                    || l.getReceivedQty().compareTo(BigDecimal.ZERO) > 0;
            return postedMatchesReceived && receivedRecordedIfExpected;
        });
        boolean anyReceived = lines.stream()
                .anyMatch(l -> l.getReceivedQty().compareTo(BigDecimal.ZERO) > 0);

        if (allLinesClosed && anyReceived) {
            doc.setStatus(InboundDocumentStatus.COMPLETED);
        } else if (anyPosted) {
            doc.setStatus(InboundDocumentStatus.PARTIALLY_RECEIVED);
        }
    }

    private static String buildLedgerNote(String userNote, InboundDocumentLine line) {
        boolean mismatch = line.getExpectedQty().compareTo(line.getReceivedQty()) != 0;
        String base = mismatch
                ? "expected=" + line.getExpectedQty() + " received=" + line.getReceivedQty()
                : null;
        String trimmed = userNote == null ? null : userNote.trim();
        if (trimmed == null || trimmed.isEmpty()) {
            return base;
        }
        if (base == null) {
            return trimmed;
        }
        return trimmed + " | " + base;
    }

    private static ReceivingPostResponse toResponse(
            InboundDocument doc,
            InboundDocumentLine line,
            BigDecimal quantityPostedThisRequest,
            Long ledgerId,
            Long stagingBinId,
            boolean replayed
    ) {
        boolean mismatch = line.getExpectedQty().compareTo(line.getReceivedQty()) != 0;
        return new ReceivingPostResponse(
                doc.getId(),
                line.getId(),
                quantityPostedThisRequest,
                line.getPostedQty(),
                line.getReceivedQty(),
                line.getExpectedQty(),
                mismatch,
                stagingBinId,
                ledgerId,
                doc.getStatus(),
                replayed
        );
    }

    private static void assertIdempotentRequestMatches(
            ReceivingPostIdempotency existing,
            Long documentId,
            Long lineId,
            ReceivingPostRequest request
    ) {
        if (!existing.getDocument().getId().equals(documentId)) {
            throw new ConflictException("Idempotency-Key was already used for a different inbound document");
        }
        if (!existing.getLine().getId().equals(lineId)) {
            throw new ConflictException("Idempotency-Key was already used for a different line");
        }
        if (!existing.getStagingBinId().equals(request.stagingBinId())) {
            throw new ConflictException("Idempotency-Key was already used with a different staging bin");
        }
        if (existing.getQuantity().compareTo(request.quantity()) != 0) {
            throw new ConflictException("Idempotency-Key was already used with a different quantity");
        }
    }

    private static String normalizeIdempotencyKey(String raw) {
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
