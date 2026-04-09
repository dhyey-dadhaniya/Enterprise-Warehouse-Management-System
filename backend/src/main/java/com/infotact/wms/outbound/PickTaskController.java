package com.infotact.wms.outbound;

import com.infotact.wms.outbound.dto.PickTaskResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pick-tasks")
@Tag(name = "Pick tasks")
@PreAuthorize("isAuthenticated()")
public class PickTaskController {

    private final PickTaskService pickTaskService;

    public PickTaskController(PickTaskService pickTaskService) {
        this.pickTaskService = pickTaskService;
    }

    @GetMapping("/{id}")
    public PickTaskResponse get(@PathVariable Long id) {
        return pickTaskService.get(id);
    }

    @GetMapping
    public List<PickTaskResponse> listByWave(@RequestParam Long waveId) {
        return pickTaskService.listByWave(waveId);
    }

    @PostMapping("/{id}/confirm-pick")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','PICKER')")
    public PickTaskResponse confirmPick(@PathVariable Long id) {
        return pickTaskService.confirmPick(id);
    }
}
