package com.societyone.app.resident.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.resident.dto.*;
import com.societyone.app.resident.entity.ResidentStatus;
import com.societyone.app.resident.service.ResidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/residents")
public class ResidentController {

    private final ResidentService residentService;
    private final AuditService auditService;

    public ResidentController(ResidentService residentService, AuditService auditService) {
        this.residentService = residentService;
        this.auditService = auditService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ResidentResponse> createResident(
            Authentication authentication,
            @RequestParam Long userId,
            @Valid @RequestBody ResidentCreateRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        ResidentResponse response = residentService.createResident(actor, userId, request);
        auditService.record(
                actor.getId(),
                response.societyId(),
                AuditAction.RESIDENT_CREATED,
                "RESIDENT",
                response.id(),
                "Created resident user " + response.username()
        );
        return ApiResponse.success(
                response
        );
    }

    @PostMapping("/provision")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ResidentResponse> provisionResident(
            Authentication authentication,
            @Valid @RequestBody ResidentProvisionRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        ResidentResponse response = residentService.provisionResident(actor, request);
        auditService.record(
                actor.getId(),
                response.societyId(),
                AuditAction.RESIDENT_CREATED,
                "RESIDENT",
                response.id(),
                "Provisioned resident user " + response.username() + " in flat " + response.flatNumber()
        );
        return ApiResponse.success(response);
    }

    @GetMapping
    public ApiResponse<List<ResidentResponse>> listResidents(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.listForAdminSociety(actor));
    }

    @GetMapping("/unassigned")
    public ApiResponse<List<UnassignedResidentResponse>> listUnassigned(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.listUnassignedResidents(actor));
    }

    @GetMapping("/{residentId:\\d+}")
    public ApiResponse<ResidentResponse> getResident(
            Authentication authentication,
            @PathVariable Long residentId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                residentService.getResident(actor, residentId)
        );
    }

    @GetMapping("/me")
    public ApiResponse<ResidentResponse> getOwnProfile(Authentication authentication) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.getOwnProfile(actor));
    }

    @PostMapping("/me/link-flat")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ResidentResponse> selfLinkFlat(
            Authentication authentication,
            @Valid @RequestBody ResidentSelfLinkRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        ResidentResponse response = residentService.selfLinkFlat(actor, request);
        auditService.record(
                actor.getId(),
                response.societyId(),
                AuditAction.RESIDENT_CREATED,
                "RESIDENT",
                response.id(),
                "Resident " + actor.getUsername() + " linked self to flat " + response.flatNumber()
        );
        return ApiResponse.success(response);
    }

    @GetMapping("/flat/{flatId}")
    public ApiResponse<List<ResidentResponse>> getResidentsByFlat(
            Authentication authentication,
            @PathVariable Long flatId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                residentService.getResidentsByFlat(actor, flatId)
        );
    }

    @PatchMapping("/{residentId}/status")
    public ApiResponse<ResidentResponse> updateStatus(
            Authentication authentication,
            @PathVariable Long residentId,
            @RequestParam ResidentStatus status
    ) {
        User actor = CurrentUser.require(authentication);
        ResidentResponse response = residentService.updateStatus(actor, residentId, status);
        auditService.record(
                actor.getId(),
                response.societyId(),
                AuditAction.RESIDENT_STATUS_CHANGED,
                "RESIDENT",
                response.id(),
                "Resident status set to " + status.name()
        );
        return ApiResponse.success(
                response
        );
    }

    // =========================================================================
    // Resident Onboarding & Apartment Allocation Endpoints
    // =========================================================================

    @PostMapping("/onboarding")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ResidentOnboardingResponse> submitOnboarding(
            Authentication authentication,
            @Valid @RequestBody ResidentOnboardingSubmitRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.submitOnboarding(actor, request));
    }

    @GetMapping("/onboarding/me")
    public ApiResponse<ResidentOnboardingResponse> getMyOnboardingStatus(
            Authentication authentication
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.getMyOnboardingStatus(actor));
    }

    @GetMapping({"/onboarding", "/onboarding/admin/requests"})
    public ApiResponse<List<ResidentOnboardingResponse>> listOnboardingRequests(
            Authentication authentication
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.listOnboardingRequests(actor));
    }

    @GetMapping({"/onboarding/{id:\\d+}", "/onboarding/admin/requests/{id:\\d+}"})
    public ApiResponse<ResidentOnboardingResponse> getOnboardingRequest(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.getOnboardingRequest(actor, id));
    }

    @PostMapping({"/onboarding/{id:\\d+}/allocate", "/onboarding/admin/requests/{id:\\d+}/allocate"})
    public ApiResponse<ResidentOnboardingResponse> allocateFlat(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody FlatAllocationRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.allocateFlat(actor, id, request));
    }

    @PostMapping({"/onboarding/{id:\\d+}/request-changes", "/onboarding/admin/requests/{id:\\d+}/request-changes"})
    public ApiResponse<ResidentOnboardingResponse> requestChanges(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.requestChanges(actor, id, request));
    }

    @PostMapping({"/onboarding/{id:\\d+}/reject", "/onboarding/admin/requests/{id:\\d+}/reject"})
    public ApiResponse<ResidentOnboardingResponse> rejectOnboarding(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody AdminChangeRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.rejectOnboarding(actor, id, request));
    }

    @GetMapping("/flats/availability")
    public ApiResponse<List<FlatAvailabilityResponse>> getFlatsAvailability(
            Authentication authentication,
            @RequestParam(required = false) Long buildingId
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(residentService.getFlatsWithAvailability(actor, buildingId));
    }
}
