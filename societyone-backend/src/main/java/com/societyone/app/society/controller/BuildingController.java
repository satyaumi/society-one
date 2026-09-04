package com.societyone.app.society.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.society.dto.BuildingRequest;
import com.societyone.app.society.dto.BuildingResponse;
import com.societyone.app.society.dto.FloorRequest;
import com.societyone.app.society.dto.FloorResponse;
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

    public BuildingController(SocietyStructureService societyStructureService) {
        this.societyStructureService = societyStructureService;
    }

    @PutMapping("/{buildingId}")
    public ApiResponse<BuildingResponse> update(
            Authentication authentication,
            @PathVariable Long buildingId,
            @Valid @RequestBody BuildingRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                societyStructureService.updateBuilding(actor, buildingId, request),
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
        return ApiResponse.success(
                societyStructureService.createFloor(actor, buildingId, request),
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
