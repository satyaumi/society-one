package com.societyone.app.security.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.security.dto.SecurityStaffCreateRequest;
import com.societyone.app.security.dto.SecurityStaffResponse;
import com.societyone.app.security.entity.SecurityStaffStatus;
import com.societyone.app.security.service.SecurityStaffService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/security-staff")
public class SecurityStaffController {

    private final SecurityStaffService securityStaffService;
    private final AuditService auditService;

    public SecurityStaffController(
            SecurityStaffService securityStaffService,
            AuditService auditService
    ) {
        this.securityStaffService = securityStaffService;
        this.auditService = auditService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<SecurityStaffResponse> create(
            Authentication authentication,
            @Valid @RequestBody SecurityStaffCreateRequest request
    ) {
        User admin = CurrentUser.require(authentication);
        SecurityStaffResponse resp = securityStaffService.create(admin, request);
        auditService.record(
                admin.getId(),
                resp.societyId(),
                AuditAction.SECURITY_STAFF_CREATED,
                "SECURITY_STAFF",
                resp.id(),
                "Created security staff " + resp.fullName()
        );
        return ApiResponse.success(
                resp,
                "Security staff created"
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<List<SecurityStaffResponse>> getAll(
            Authentication authentication
    ) {
        User admin = CurrentUser.require(authentication);
        return ApiResponse.success(securityStaffService.getAll(admin));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<SecurityStaffResponse> get(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User admin = CurrentUser.require(authentication);
        return ApiResponse.success(securityStaffService.get(admin, id));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<SecurityStaffResponse> updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam SecurityStaffStatus status
    ) {
        User admin = CurrentUser.require(authentication);
        SecurityStaffResponse resp = securityStaffService.updateStatus(admin, id, status);
        auditService.record(
                admin.getId(),
                resp.societyId(),
                AuditAction.SECURITY_STAFF_STATUS_CHANGED,
                "SECURITY_STAFF",
                resp.id(),
                "Security staff status set to " + status
        );
        return ApiResponse.success(
                resp,
                "Security staff status updated"
        );
    }
}