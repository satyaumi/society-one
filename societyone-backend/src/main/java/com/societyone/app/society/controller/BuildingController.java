package com.societyone.app.society.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.society.dto.BuildingRequest;
import com.societyone.app.society.dto.BuildingResponse;
import com.societyone.app.society.dto.FloorRequest;
import com.societyone.app.society.dto.FloorResponse;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.service.SocietyStructureService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buildings")
@PreAuthorize("hasRole('ADMIN')")
public class BuildingController {

    private final SocietyStructureService societyStructureService;
    private final AuditService auditService;
    private final BuildingRepository buildingRepository;

    public BuildingController(
            SocietyStructureService societyStructureService,
            AuditService auditService,
            BuildingRepository buildingRepository
    ) {
        this.societyStructureService = societyStructureService;
        this.auditService = auditService;
        this.buildingRepository = buildingRepository;
    }

    @PutMapping("/{buildingId}")
    public ApiResponse<BuildingResponse> update(
            Authentication authentication,
            @PathVariable Long buildingId,
            @Valid @RequestBody BuildingRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        BuildingResponse buildingResp = societyStructureService.updateBuilding(actor, buildingId, request);
        Long societyId = null;
        try {
            Building building = buildingRepository.findById(buildingId).orElse(null);
            if (building != null && building.getSociety() != null) {
                societyId = building.getSociety().getId();
            }
        } catch (Exception ignored) {
        }
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.BUILDING_UPDATED,
                "BUILDING",
                buildingId,
                "Updated building"
        );
        return ApiResponse.success(
                buildingResp,
                "Building updated"
        );
    }

    @PostMapping("/{buildingId}/floors")
    public ApiResponse<FloorResponse> createFloor(
            Authentication authentication,
            @PathVariable Long buildingId,
            @Valid @RequestBody FloorRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        FloorResponse floorResp = societyStructureService.createFloor(actor, buildingId, request);
        Long societyId = null;
        try {
            Building building = buildingRepository.findById(buildingId).orElse(null);
            if (building != null && building.getSociety() != null) {
                societyId = building.getSociety().getId();
            }
        } catch (Exception ignored) {
        }
        Long entityId = Long.parseLong(floorResp.id());
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.FLOOR_CREATED,
                "FLOOR",
                entityId,
                "Created floor " + floorResp.number()
        );
        return ApiResponse.success(
                floorResp,
                "Floor created"
        );
    }

    @GetMapping("/{buildingId}/floors")
    public ApiResponse<List<FloorResponse>> listFloors(
            Authentication authentication,
            @PathVariable Long buildingId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(societyStructureService.listFloors(actor, buildingId));
    }
}
