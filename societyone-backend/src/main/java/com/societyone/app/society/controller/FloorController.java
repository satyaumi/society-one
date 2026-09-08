package com.societyone.app.society.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.society.dto.FlatRequest;
import com.societyone.app.society.dto.FlatResponse;
import com.societyone.app.society.dto.FloorRequest;
import com.societyone.app.society.dto.FloorResponse;
import com.societyone.app.society.service.SocietyStructureService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/floors")
@PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
public class FloorController {

    private final SocietyStructureService societyStructureService;
    private final AuditService auditService;
    private final com.societyone.app.society.repository.FloorRepository floorRepository;

    public FloorController(
            SocietyStructureService societyStructureService,
            AuditService auditService,
            com.societyone.app.society.repository.FloorRepository floorRepository
    ) {
        this.societyStructureService = societyStructureService;
        this.auditService = auditService;
        this.floorRepository = floorRepository;
    }

    @PutMapping("/{floorId}")
    public ApiResponse<FloorResponse> update(
            Authentication authentication,
            @PathVariable Long floorId,
            @Valid @RequestBody FloorRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        FloorResponse floorResp = societyStructureService.updateFloor(actor, floorId, request);
        Long societyId = null;
        try {
            var floor = floorRepository.findById(floorId).orElse(null);
            if (floor != null && floor.getBuilding() != null && floor.getBuilding().getSociety() != null) {
                societyId = floor.getBuilding().getSociety().getId();
            }
        } catch (Exception ignored) {
        }
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.FLOOR_UPDATED,
                "FLOOR",
                floorId,
                "Updated floor"
        );
        return ApiResponse.success(
                floorResp,
                "Floor updated"
        );
    }

    @PostMapping("/{floorId}/flats")
    public ApiResponse<FlatResponse> createFlat(
            Authentication authentication,
            @PathVariable Long floorId,
            @Valid @RequestBody FlatRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        FlatResponse flatResp = societyStructureService.createFlat(actor, floorId, request);
        Long entityId = Long.parseLong(flatResp.id());
        Long societyId = null;
        try {
            var floor = floorRepository.findById(floorId).orElse(null);
            if (floor != null && floor.getBuilding() != null && floor.getBuilding().getSociety() != null) {
                societyId = floor.getBuilding().getSociety().getId();
            }
        } catch (Exception ignored) {
        }
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.FLAT_CREATED,
                "FLAT",
                entityId,
                "Created flat " + flatResp.number()
        );
        return ApiResponse.success(
                flatResp,
                "Flat created"
        );
    }

    @GetMapping("/{floorId}/flats")
    public ApiResponse<List<FlatResponse>> listFlats(
            Authentication authentication,
            @PathVariable Long floorId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(societyStructureService.listFlats(actor, floorId));
    }
}
