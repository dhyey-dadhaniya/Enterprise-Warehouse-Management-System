package com.infotact.wms.inbound;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.inbound.dto.InboundDocumentCreateRequest;
import com.infotact.wms.inbound.dto.InboundDocumentResponse;
import com.infotact.wms.inbound.dto.InboundDocumentUpdateRequest;
import com.infotact.wms.inbound.dto.InboundLineCreateRequest;
import com.infotact.wms.inbound.dto.InboundLineUpdateRequest;
import com.infotact.wms.inbound.dto.InboundStatusUpdateRequest;
import com.infotact.wms.inbound.dto.ReceivingPostRequest;
import com.infotact.wms.inbound.dto.ReceivingPostResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inbound-documents")
@Tag(name = "Inbound / Receiving")
@PreAuthorize("isAuthenticated()")
public class InboundDocumentController {

    private final InboundDocumentService inboundDocumentService;
    private final ReceivingPostService receivingPostService;

    public InboundDocumentController(
            InboundDocumentService inboundDocumentService,
            ReceivingPostService receivingPostService
    ) {
        this.inboundDocumentService = inboundDocumentService;
        this.receivingPostService = receivingPostService;
    }

    @GetMapping
    public PageResponse<InboundDocumentResponse> list(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) InboundDocumentStatus status,
            @RequestParam(required = false) InboundDocumentType documentType,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return inboundDocumentService.list(warehouseId, status, documentType, q, pageable);
    }

    @GetMapping("/{id}")
    public InboundDocumentResponse get(@PathVariable Long id) {
        return inboundDocumentService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<InboundDocumentResponse> create(@Valid @RequestBody InboundDocumentCreateRequest request) {
        InboundDocumentResponse body = inboundDocumentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public InboundDocumentResponse updateHeader(@PathVariable Long id, @Valid @RequestBody InboundDocumentUpdateRequest request) {
        return inboundDocumentService.updateHeader(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public InboundDocumentResponse updateStatus(@PathVariable Long id, @Valid @RequestBody InboundStatusUpdateRequest request) {
        return inboundDocumentService.updateStatus(id, request);
    }

    @PostMapping("/{id}/lines")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<InboundDocumentResponse> addLine(
            @PathVariable Long id,
            @Valid @RequestBody InboundLineCreateRequest request
    ) {
        InboundDocumentResponse body = inboundDocumentService.addLine(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PutMapping("/{id}/lines/{lineId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public InboundDocumentResponse updateLine(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @Valid @RequestBody InboundLineUpdateRequest request
    ) {
        return inboundDocumentService.updateLine(id, lineId, request);
    }

    @DeleteMapping("/{id}/lines/{lineId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Void> deleteLine(@PathVariable Long id, @PathVariable Long lineId) {
        inboundDocumentService.deleteLine(id, lineId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/lines/{lineId}/post-receipt")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<ReceivingPostResponse> postReceipt(
            @PathVariable Long documentId,
            @PathVariable Long lineId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody ReceivingPostRequest request
    ) {
        ReceivingPostResponse body = receivingPostService.post(documentId, lineId, request, idempotencyKey);
        return ResponseEntity.ok(body);
    }
}
