package com.societyone.app.society.controller;

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

    public SocietyController(SocietyStructureService societyStructureService) {
        this.societyStructureService = societyStructureService;
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
        return ApiResponse.success(
                societyStructureService.createSociety(actor, request),
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
        return ApiResponse.success(
                societyStructureService.updateSociety(actor, societyId, request),
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
        return ApiResponse.success(
                societyStructureService.createBuilding(actor, societyId, request),
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
