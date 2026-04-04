package com.infotact.wms.inbound;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inbound.dto.InboundDocumentCreateRequest;
import com.infotact.wms.inbound.dto.InboundDocumentResponse;
import com.infotact.wms.inbound.dto.InboundDocumentUpdateRequest;
import com.infotact.wms.inbound.dto.InboundLineCreateRequest;
import com.infotact.wms.inbound.dto.InboundLineUpdateRequest;
import com.infotact.wms.inbound.dto.InboundStatusUpdateRequest;
import com.infotact.wms.inbound.spec.InboundSpecifications;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class InboundDocumentService {

    private final InboundDocumentRepository inboundDocumentRepository;
    private final InboundDocumentLineRepository inboundDocumentLineRepository;
    private final WarehouseRepository warehouseRepository;
    private final ItemRepository itemRepository;

    public InboundDocumentService(
            InboundDocumentRepository inboundDocumentRepository,
            InboundDocumentLineRepository inboundDocumentLineRepository,
            WarehouseRepository warehouseRepository,
            ItemRepository itemRepository
    ) {
        this.inboundDocumentRepository = inboundDocumentRepository;
        this.inboundDocumentLineRepository = inboundDocumentLineRepository;
        this.warehouseRepository = warehouseRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<InboundDocumentResponse> list(
            Long warehouseId,
            InboundDocumentStatus status,
            InboundDocumentType documentType,
            String q,
            Pageable pageable
    ) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<InboundDocument> spec = Specification.where(InboundSpecifications.warehouseId(warehouseId))
                .and(InboundSpecifications.status(status))
                .and(InboundSpecifications.documentType(documentType))
                .and(InboundSpecifications.search(q));
        return PageResponse.of(inboundDocumentRepository.findAll(spec, p)
                .map(doc -> {
                    long cnt = inboundDocumentLineRepository.countByDocument_Id(doc.getId());
                    return InboundMapper.toSummary(doc, cnt);
                }));
    }

    @Transactional(readOnly = true)
    public InboundDocumentResponse get(Long id) {
        InboundDocument doc = inboundDocumentRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + id));
        return InboundMapper.toDetail(doc);
    }

    @Transactional
    public InboundDocumentResponse create(InboundDocumentCreateRequest request) {
        String docNo = normalizeDocNumber(request.documentNumber());
        if (inboundDocumentRepository.existsByDocumentNumberIgnoreCase(docNo)) {
            throw new ConflictException("Document number already exists: " + docNo);
        }
        Warehouse wh = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));

        InboundDocument doc = new InboundDocument();
        doc.setDocumentNumber(docNo);
        doc.setDocumentType(request.documentType());
        doc.setWarehouse(wh);
        doc.setStatus(InboundDocumentStatus.DRAFT);
        doc.setSupplierName(trimToNull(request.supplierName()));
        doc.setReference(trimToNull(request.reference()));
        doc.setExpectedDeliveryDate(request.expectedDeliveryDate());
        doc.setNotes(trimToNull(request.notes()));

        appendLines(doc, request.lines());

        InboundDocument saved = inboundDocumentRepository.save(doc);
        return InboundMapper.toDetail(inboundDocumentRepository.findDetailById(saved.getId()).orElseThrow());
    }

    @Transactional
    public InboundDocumentResponse updateHeader(Long id, InboundDocumentUpdateRequest request) {
        InboundDocument doc = inboundDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + id));
        if (doc.getStatus() != InboundDocumentStatus.DRAFT) {
            throw new ConflictException("Only DRAFT documents can be edited");
        }
        if (request.supplierName() != null) {
            doc.setSupplierName(trimToNull(request.supplierName()));
        }
        if (request.reference() != null) {
            doc.setReference(trimToNull(request.reference()));
        }
        if (request.expectedDeliveryDate() != null) {
            doc.setExpectedDeliveryDate(request.expectedDeliveryDate());
        }
        if (request.notes() != null) {
            doc.setNotes(trimToNull(request.notes()));
        }
        inboundDocumentRepository.save(doc);
        return InboundMapper.toDetail(inboundDocumentRepository.findDetailById(id).orElseThrow());
    }

    @Transactional
    public InboundDocumentResponse updateStatus(Long id, InboundStatusUpdateRequest request) {
        InboundDocument doc = inboundDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + id));
        InboundDocumentStatus next = request.status();
        assertTransition(doc.getStatus(), next);
        if (next == InboundDocumentStatus.OPEN) {
            long count = inboundDocumentLineRepository.countByDocument_Id(id);
            if (count == 0) {
                throw new ConflictException("Add at least one line before opening the document");
            }
        }
        doc.setStatus(next);
        inboundDocumentRepository.save(doc);
        return InboundMapper.toDetail(inboundDocumentRepository.findDetailById(id).orElseThrow());
    }

    @Transactional
    public InboundDocumentResponse addLine(Long documentId, InboundLineCreateRequest request) {
        InboundDocument doc = inboundDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + documentId));
        if (doc.getStatus() != InboundDocumentStatus.DRAFT) {
            throw new ConflictException("Lines can only be changed while document is DRAFT");
        }
        int lineNo = request.lineNumber() != null ? request.lineNumber() : nextLineNumber(doc.getId());
        if (lineNo <= 0) {
            throw new ConflictException("lineNumber must be positive");
        }
        if (inboundDocumentLineRepository.findByDocument_IdOrderByLineNumberAsc(documentId).stream()
                .anyMatch(l -> l.getLineNumber() == lineNo)) {
            throw new ConflictException("Line number already exists: " + lineNo);
        }
        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));
        InboundDocumentLine line = new InboundDocumentLine();
        line.setDocument(doc);
        line.setLineNumber(lineNo);
        line.setItem(item);
        line.setExpectedQty(request.expectedQty());
        line.setReceivedQty(BigDecimal.ZERO);
        line.setPostedQty(BigDecimal.ZERO);
        line.setNotes(trimToNull(request.notes()));
        doc.getLines().add(line);
        inboundDocumentRepository.save(doc);
        return InboundMapper.toDetail(inboundDocumentRepository.findDetailById(documentId).orElseThrow());
    }

    @Transactional
    public InboundDocumentResponse updateLine(Long documentId, Long lineId, InboundLineUpdateRequest request) {
        InboundDocument doc = inboundDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + documentId));
        InboundDocumentLine line = inboundDocumentLineRepository.findByIdAndDocument_Id(lineId, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Line not found: " + lineId));

        if (doc.getStatus() == InboundDocumentStatus.DRAFT) {
            if (request.itemId() != null) {
                Item item = itemRepository.findById(request.itemId())
                        .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));
                line.setItem(item);
            }
            if (request.expectedQty() != null) {
                line.setExpectedQty(request.expectedQty());
            }
            if (request.notes() != null) {
                line.setNotes(trimToNull(request.notes()));
            }
            if (request.receivedQty() != null) {
                line.setReceivedQty(request.receivedQty());
            }
        } else if (canEditReceived(doc.getStatus())) {
            if (request.receivedQty() != null) {
                line.setReceivedQty(request.receivedQty());
            }
            if (request.notes() != null) {
                line.setNotes(trimToNull(request.notes()));
            }
        } else {
            throw new ConflictException("Lines cannot be edited in status " + doc.getStatus());
        }

        inboundDocumentRepository.save(doc);
        return InboundMapper.toDetail(inboundDocumentRepository.findDetailById(documentId).orElseThrow());
    }

    @Transactional
    public void deleteLine(Long documentId, Long lineId) {
        InboundDocument doc = inboundDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Inbound document not found: " + documentId));
        if (doc.getStatus() != InboundDocumentStatus.DRAFT) {
            throw new ConflictException("Lines can only be changed while document is DRAFT");
        }
        InboundDocumentLine line = inboundDocumentLineRepository.findByIdAndDocument_Id(lineId, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Line not found: " + lineId));
        inboundDocumentLineRepository.delete(line);
    }

    private static boolean canEditReceived(InboundDocumentStatus status) {
        return status == InboundDocumentStatus.OPEN
                || status == InboundDocumentStatus.RECEIVING
                || status == InboundDocumentStatus.PARTIALLY_RECEIVED;
    }

    private void appendLines(InboundDocument doc, List<InboundLineCreateRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }
        Set<Integer> used = new HashSet<>();
        int fallback = 1;
        for (InboundLineCreateRequest r : requests) {
            int num;
            if (r.lineNumber() != null) {
                num = r.lineNumber();
                if (num <= 0 || !used.add(num)) {
                    throw new ConflictException("Duplicate or invalid line number: " + r.lineNumber());
                }
            } else {
                while (used.contains(fallback)) {
                    fallback++;
                }
                num = fallback;
                used.add(num);
                fallback++;
            }
            Item item = itemRepository.findById(r.itemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + r.itemId()));
            InboundDocumentLine line = new InboundDocumentLine();
            line.setDocument(doc);
            line.setLineNumber(num);
            line.setItem(item);
            line.setExpectedQty(r.expectedQty());
            line.setReceivedQty(BigDecimal.ZERO);
            line.setPostedQty(BigDecimal.ZERO);
            line.setNotes(trimToNull(r.notes()));
            doc.getLines().add(line);
        }
    }

    private int nextLineNumber(Long documentId) {
        return inboundDocumentLineRepository.findByDocument_IdOrderByLineNumberAsc(documentId).stream()
                .mapToInt(InboundDocumentLine::getLineNumber)
                .max()
                .orElse(0) + 1;
    }

    private static void assertTransition(InboundDocumentStatus from, InboundDocumentStatus to) {
        if (from == to) {
            return;
        }
        boolean ok = switch (from) {
            case DRAFT -> to == InboundDocumentStatus.OPEN || to == InboundDocumentStatus.CANCELLED;
            case OPEN -> to == InboundDocumentStatus.RECEIVING || to == InboundDocumentStatus.CANCELLED;
            case RECEIVING -> to == InboundDocumentStatus.PARTIALLY_RECEIVED
                    || to == InboundDocumentStatus.COMPLETED
                    || to == InboundDocumentStatus.CANCELLED;
            case PARTIALLY_RECEIVED -> to == InboundDocumentStatus.RECEIVING
                    || to == InboundDocumentStatus.COMPLETED
                    || to == InboundDocumentStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
        if (!ok) {
            throw new ConflictException("Invalid status transition: " + from + " -> " + to);
        }
    }

    private static String normalizeDocNumber(String documentNumber) {
        return documentNumber.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
