package com.societyone.app.platform.controller;

import com.societyone.app.audit.dto.AuditLogResponse;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.platform.dto.*;
import com.societyone.app.platform.service.PlatformManagementService;
import com.societyone.app.society.dto.SocietyCreationRequestResponse;
import com.societyone.app.society.service.SocietyCreationRequestService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/platform")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformManagementController {

    private final PlatformManagementService platformService;
    private final SocietyCreationRequestService requestService;

    public PlatformManagementController(
            PlatformManagementService platformService,
            SocietyCreationRequestService requestService
    ) {
        this.platformService = platformService;
        this.requestService = requestService;
    }

    @GetMapping("/dashboard/kpis")
    public ApiResponse<PlatformKpiResponse> getKpis(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(platformService.getPlatformKpis(actor));
    }

    @GetMapping("/society-requests")
    public ApiResponse<List<SocietyCreationRequestResponse>> listRequests(
            Authentication authentication,
            @RequestParam(required = false) String status
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(requestService.listRequests(actor, status));
    }

    @GetMapping("/society-requests/{id}")
    public ApiResponse<SocietyCreationRequestResponse> getRequest(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(requestService.getRequest(actor, id));
    }

    @PostMapping("/society-requests/{id}/review")
    public ApiResponse<SocietyCreationRequestResponse> markUnderReview(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) SocietyRequestReviewAction action
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(requestService.markUnderReview(actor, id, action), "Application marked as under review");
    }

    @PostMapping("/society-requests/{id}/request-changes")
    public ApiResponse<SocietyCreationRequestResponse> requestChanges(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody SocietyRequestReviewAction action
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(requestService.requestChanges(actor, id, action), "Changes requested from applicant");
    }

    @PostMapping("/society-requests/{id}/reject")
    public ApiResponse<SocietyCreationRequestResponse> rejectRequest(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody SocietyRequestReviewAction action
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(requestService.rejectRequest(actor, id, action), "Application rejected");
    }

    @PostMapping("/society-requests/{id}/approve-and-create")
    public ApiResponse<SocietyCreationRequestResponse> approveAndCreate(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) SocietyRequestReviewAction action
    ) {
        User actor = CurrentUser.require(authentication);
        SocietyCreationRequestResponse response = requestService.approveAndCreateSociety(actor, id, action);
        return ApiResponse.success(response, "Society approved and created successfully! Administrator has been assigned.");
    }

    @GetMapping("/societies")
    public ApiResponse<List<PlatformSocietyDirectoryItem>> getDirectory(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(platformService.getSocietyDirectory(actor));
    }

    @PostMapping("/societies/{societyId}/handover")
    public ApiResponse<Void> handoverAdmin(
            Authentication authentication,
            @PathVariable Long societyId,
            @Valid @RequestBody AdminHandoverRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        requestService.reassignSocietyAdmin(actor, societyId, request);
        return ApiResponse.success(null, "Society administrator reassigned successfully");
    }

    @PostMapping("/messages/send-to-admin")
    public ApiResponse<Void> sendMessageToAdmin(
            Authentication authentication,
            @Valid @RequestBody PlatformDirectMessageRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        platformService.sendDirectMessageToAdmin(actor, request);
        return ApiResponse.success(null, "Official message dispatched to society administrator");
    }

    @PostMapping("/societies/{societyId}/dispatch-credentials")
    public ApiResponse<AdminCredentialsDispatchResponse> dispatchCredentials(
            Authentication authentication,
            @PathVariable Long societyId,
            @RequestBody(required = false) DispatchCredentialsRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        AdminCredentialsDispatchResponse response = platformService.dispatchAdminCredentials(actor, societyId, request);
        return ApiResponse.success(response, response.message());
    }

    @GetMapping("/audit")
    public ApiResponse<List<AuditLogResponse>> getPlatformAudit(
            Authentication authentication,
            @RequestParam(defaultValue = "50") int limit
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(platformService.getPlatformAudit(actor, limit));
    }
}
