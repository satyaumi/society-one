package com.societyone.app.society.controller;

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
@PreAuthorize("hasRole('ADMIN')")
public class FloorController {

    private final SocietyStructureService societyStructureService;

    public FloorController(SocietyStructureService societyStructureService) {
        this.societyStructureService = societyStructureService;
    }

    @PutMapping("/{floorId}")
    public ApiResponse<FloorResponse> update(
            Authentication authentication,
            @PathVariable Long floorId,
            @Valid @RequestBody FloorRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                societyStructureService.updateFloor(actor, floorId, request),
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
        return ApiResponse.success(
                societyStructureService.createFlat(actor, floorId, request),
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
