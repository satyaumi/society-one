package com.societyone.app.audit.controller;

import com.societyone.app.audit.dto.AuditLogResponse;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public ApiResponse<List<AuditLogResponse>> listAuditLogs(
            Authentication authentication
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                auditService.listForUser(user)
        );
    }

    @GetMapping("/{auditId:\\d+}")
    public ApiResponse<AuditLogResponse> getAuditLog(
            Authentication authentication,
            @PathVariable Long auditId
    ) {
        User admin = CurrentUser.require(authentication);
        return ApiResponse.success(
                auditService.getById(admin, auditId)
        );
    }
}
