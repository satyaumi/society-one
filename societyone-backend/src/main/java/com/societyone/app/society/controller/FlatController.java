package com.societyone.app.society.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.society.dto.FlatRequest;
import com.societyone.app.society.dto.FlatResponse;
import com.societyone.app.society.service.SocietyStructureService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/flats")
@PreAuthorize("hasRole('ADMIN')")
public class FlatController {

    private final SocietyStructureService societyStructureService;

    public FlatController(SocietyStructureService societyStructureService) {
        this.societyStructureService = societyStructureService;
    }

    @PutMapping("/{flatId}")
    public ApiResponse<FlatResponse> update(
            Authentication authentication,
            @PathVariable Long flatId,
            @Valid @RequestBody FlatRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                societyStructureService.updateFlat(actor, flatId, request),
                "Flat updated"
        );
    }
}
