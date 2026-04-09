package com.infotact.wms.putaway;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.putaway.dto.PutawayConfirmRequest;
import com.infotact.wms.putaway.dto.PutawaySuggestionResponse;
import com.infotact.wms.putaway.dto.PutawayTaskCreateRequest;
import com.infotact.wms.putaway.dto.PutawayTaskResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/putaway-tasks")
@Tag(name = "Putaway")
@PreAuthorize("isAuthenticated()")
public class PutawayTaskController {

    private final PutawayTaskService putawayTaskService;

    public PutawayTaskController(PutawayTaskService putawayTaskService) {
        this.putawayTaskService = putawayTaskService;
    }

    @GetMapping("/suggestion")
    public PutawaySuggestionResponse suggestion(
            @RequestParam Long warehouseId,
            @RequestParam Long itemId,
            @RequestParam Long fromBinId
    ) {
        return putawayTaskService.previewSuggestion(warehouseId, itemId, fromBinId);
    }

    @GetMapping
    public PageResponse<PutawayTaskResponse> list(
            @RequestParam(required = false) Long warehouseId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return putawayTaskService.list(warehouseId, pageable);
    }

    @GetMapping("/{id}")
    public PutawayTaskResponse get(@PathVariable Long id) {
        return putawayTaskService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<PutawayTaskResponse> create(@Valid @RequestBody PutawayTaskCreateRequest request) {
        PutawayTaskResponse body = putawayTaskService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @PostMapping("/{id}/claim")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public PutawayTaskResponse claim(@PathVariable Long id, Authentication authentication) {
        return putawayTaskService.claim(id, authentication.getName());
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public PutawayTaskResponse confirm(
            @PathVariable Long id,
            Authentication authentication,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody(required = false) @Valid PutawayConfirmRequest body
    ) {
        boolean privileged = authentication.getAuthorities().stream().anyMatch(PutawayTaskController::isPrivilegedPutawayConfirm);
        return putawayTaskService.confirm(id, authentication.getName(), body, privileged, idempotencyKey);
    }

    private static boolean isPrivilegedPutawayConfirm(GrantedAuthority a) {
        return "ROLE_ADMIN".equals(a.getAuthority());
    }
}
