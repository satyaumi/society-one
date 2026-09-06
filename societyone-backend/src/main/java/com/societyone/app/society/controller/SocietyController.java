package com.societyone.app.society.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.society.dto.BuildingRequest;
import com.societyone.app.society.dto.BuildingResponse;
import com.societyone.app.society.dto.SocietyRequest;
import com.societyone.app.society.dto.SocietyResponse;
import com.societyone.app.society.service.SocietyStructureService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/societies")
public class SocietyController {

    private final SocietyStructureService societyStructureService;
    private final AuditService auditService;

    public SocietyController(SocietyStructureService societyStructureService, AuditService auditService) {
        this.societyStructureService = societyStructureService;
        this.auditService = auditService;
    }

    @GetMapping
    public ApiResponse<List<SocietyResponse>> list(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(societyStructureService.listSocieties(actor));
    }

    @GetMapping("/{societyId}")
    public ApiResponse<SocietyResponse> get(
            Authentication authentication,
            @PathVariable Long societyId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(societyStructureService.getSociety(actor, societyId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SocietyResponse> create(
            Authentication authentication,
            @Valid @RequestBody SocietyRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        SocietyResponse resp = societyStructureService.createSociety(actor, request);
        Long societyId = Long.parseLong(resp.id());
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.SOCIETY_CREATED,
                "SOCIETY",
                societyId,
                "Created society " + resp.name()
        );
        return ApiResponse.success(
                resp,
                "Society created"
        );
    }

    @PutMapping("/{societyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<SocietyResponse> update(
            Authentication authentication,
            @PathVariable Long societyId,
            @Valid @RequestBody SocietyRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        SocietyResponse resp = societyStructureService.updateSociety(actor, societyId, request);
        Long parsedSocietyId = Long.parseLong(resp.id());
        auditService.record(
                actor.getId(),
                parsedSocietyId,
                AuditAction.SOCIETY_UPDATED,
                "SOCIETY",
                parsedSocietyId,
                "Updated society " + resp.name()
        );
        return ApiResponse.success(
                resp,
                "Society updated"
        );
    }

    @PostMapping("/{societyId}/buildings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BuildingResponse> createBuilding(
            Authentication authentication,
            @PathVariable Long societyId,
            @Valid @RequestBody BuildingRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        BuildingResponse buildingResp = societyStructureService.createBuilding(actor, societyId, request);
        Long entityId = Long.parseLong(buildingResp.id());
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.BUILDING_CREATED,
                "BUILDING",
                entityId,
                "Created building " + buildingResp.name()
        );
        return ApiResponse.success(
                buildingResp,
                "Building created"
        );
    }

    @GetMapping("/{societyId}/buildings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<BuildingResponse>> listBuildings(
            Authentication authentication,
            @PathVariable Long societyId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(societyStructureService.listBuildings(actor, societyId));
    }
}
