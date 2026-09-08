package com.societyone.app.society.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
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
@PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
public class FlatController {

    private final SocietyStructureService societyStructureService;
    private final AuditService auditService;
    private final com.societyone.app.society.repository.FlatRepository flatRepository;

    public FlatController(
            SocietyStructureService societyStructureService,
            AuditService auditService,
            com.societyone.app.society.repository.FlatRepository flatRepository
    ) {
        this.societyStructureService = societyStructureService;
        this.auditService = auditService;
        this.flatRepository = flatRepository;
    }

    @PutMapping("/{flatId}")
    public ApiResponse<FlatResponse> update(
            Authentication authentication,
            @PathVariable Long flatId,
            @Valid @RequestBody FlatRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        FlatResponse flatResp = societyStructureService.updateFlat(actor, flatId, request);
        Long societyId = null;
        try {
            var flat = flatRepository.findById(flatId).orElse(null);
            if (flat != null && flat.getSociety() != null) {
                societyId = flat.getSociety().getId();
            }
        } catch (Exception ignored) {
        }
        auditService.record(
                actor.getId(),
                societyId,
                AuditAction.FLAT_UPDATED,
                "FLAT",
                flatId,
                "Updated flat"
        );
        return ApiResponse.success(
                flatResp,
                "Flat updated"
        );
    }
}
