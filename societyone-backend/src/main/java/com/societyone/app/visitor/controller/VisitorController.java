package com.societyone.app.visitor.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.service.NotificationService;
import com.societyone.app.visitor.dto.VisitRequestCreateRequest;
import com.societyone.app.visitor.dto.VisitRequestResponse;
import com.societyone.app.visitor.dto.VisitorCreateRequest;
import com.societyone.app.visitor.dto.VisitorResponse;
import com.societyone.app.visitor.service.VisitorService;

import jakarta.validation.Valid;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/visitors")
public class VisitorController {

    private final VisitorService visitorService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public VisitorController(
            VisitorService visitorService,
            AuditService auditService,
            NotificationService notificationService
    ) {
        this.visitorService = visitorService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    // =========================================================
    // VISITOR
    // =========================================================

    @PostMapping
    public ApiResponse<VisitorResponse> createVisitor(
            Authentication authentication,
            @Valid @RequestBody VisitorCreateRequest request
    ) {
        User actor = CurrentUser.require(authentication);

        VisitorResponse resp = visitorService.createVisitor(actor, request);

        auditService.record(
                actor.getId(),
                null,
                AuditAction.VISITOR_CREATED,
                "VISITOR",
                resp.id(),
                "Created visitor " + resp.fullName()
        );

        return ApiResponse.success(resp);
    }

    @GetMapping
    public ApiResponse<List<VisitorResponse>> listVisitors(
            Authentication authentication
    ) {
        User actor = CurrentUser.require(authentication);

        return ApiResponse.success(
                visitorService.listVisitors(actor)
        );
    }

    @GetMapping("/{visitorId:\\d+}")
    public ApiResponse<VisitorResponse> getVisitor(
            Authentication authentication,
            @PathVariable Long visitorId
    ) {
        User actor = CurrentUser.require(authentication);

        return ApiResponse.success(
                visitorService.getVisitor(actor, visitorId)
        );
    }

    @PostMapping("/photo")
    public ApiResponse<java.util.Map<String, String>> uploadPhoto(
            Authentication authentication,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        User actor = CurrentUser.require(authentication);
        String photoUrl = visitorService.uploadVisitorPhoto(file);
        return ApiResponse.success(java.util.Map.of("photoUrl", photoUrl));
    }

    @GetMapping("/lookup")
    public ApiResponse<VisitorResponse> lookupByMobile(
            Authentication authentication,
            @RequestParam("mobile") String mobile
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                visitorService.findByMobile(actor, mobile).orElse(null)
        );
    }

    @PatchMapping("/{visitorId:\\d+}/photo")
    public ApiResponse<VisitorResponse> updateVisitorPhoto(
            Authentication authentication,
            @PathVariable Long visitorId,
            @RequestBody java.util.Map<String, String> body
    ) {
        User actor = CurrentUser.require(authentication);
        String photoUrl = body.get("photoUrl");
        return ApiResponse.success(
                visitorService.updateVisitorPhoto(actor, visitorId, photoUrl)
        );
    }

    // =========================================================
    // VISIT REQUEST
    // =========================================================

    @PostMapping("/requests")
    public ApiResponse<VisitRequestResponse> createVisitRequest(
            Authentication authentication,
            @Valid @RequestBody VisitRequestCreateRequest request
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.createVisitRequest(actor, request);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.VISIT_REQUEST_CREATED,
                "VISIT_REQUEST",
                resp.id(),
                "Visit request created for " + resp.visitorName()
                        + " → flat " + resp.flatNumber()
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.REQUEST,
                "New visitor request",
                resp.visitorName()
                        + " requested a visit to your flat "
                        + resp.flatNumber()
                        + ". Approve or reject to proceed.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    @GetMapping("/requests")
    public ApiResponse<List<VisitRequestResponse>> listRequests(
            Authentication authentication
    ) {
        User actor = CurrentUser.require(authentication);

        return ApiResponse.success(
                visitorService.listVisitRequests(actor)
        );
    }

    @GetMapping("/requests/{requestId}")
    public ApiResponse<VisitRequestResponse> getRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        return ApiResponse.success(
                visitorService.getRequest(actor, requestId)
        );
    }

    // =========================================================
    // RESIDENT ACTIONS
    // =========================================================

    @PatchMapping("/requests/{requestId}/approve")
    public ApiResponse<VisitRequestResponse> approveByResident(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.approveByResident(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.VISIT_APPROVED,
                "VISIT_REQUEST",
                resp.id(),
                "Resident approved visit for " + resp.visitorName()
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.APPROVAL,
                "Visit approved",
                "You approved a visit for " + resp.visitorName()
                        + ". Security will be notified at gate.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    @PatchMapping("/requests/{requestId}/reject")
    public ApiResponse<VisitRequestResponse> rejectByResident(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.rejectByResident(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.VISIT_REJECTED,
                "VISIT_REQUEST",
                resp.id(),
                "Resident rejected visit for " + resp.visitorName()
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.APPROVAL,
                "Visit rejected",
                "You rejected a visit for " + resp.visitorName()
                        + ". The visit is now cancelled.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    @PatchMapping("/requests/{requestId}/cancel")
    public ApiResponse<VisitRequestResponse> cancelRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        return ApiResponse.success(
                visitorService.cancelRequest(actor, requestId)
        );
    }

    // =========================================================
    // SECURITY ACTIONS
    // =========================================================

    @PatchMapping("/requests/{requestId}/security/accept")
    public ApiResponse<VisitRequestResponse> acceptBySecurity(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.acceptBySecurity(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.SECURITY_ACCEPTED,
                "VISIT_REQUEST",
                resp.id(),
                "Security accepted " + resp.visitorName()
                        + " at gate, awaiting check-in"
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.APPROVAL,
                "Visitor accepted at gate",
                resp.visitorName()
                        + " has been accepted by security and is at your gate. "
                        + "Awaiting check-in.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    @PatchMapping("/requests/{requestId}/security/reject")
    public ApiResponse<VisitRequestResponse> rejectBySecurity(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.rejectBySecurity(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.SECURITY_REJECTED,
                "VISIT_REQUEST",
                resp.id(),
                "Security rejected " + resp.visitorName()
                        + " at gate"
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.APPROVAL,
                "Visitor rejected at gate",
                resp.visitorName()
                        + " was rejected by security at the gate.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    // =========================================================
    // GATE / VISIT STATUS
    // =========================================================

    @PatchMapping("/requests/{requestId}/check-in")
    public ApiResponse<VisitRequestResponse> checkIn(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.checkIn(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.VISITOR_CHECKED_IN,
                "VISIT_REQUEST",
                resp.id(),
                "Visitor " + resp.visitorName() + " checked in"
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.ENTRY,
                "Visitor checked in",
                resp.visitorName()
                        + " has checked in and entered the society premises.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }

    @PatchMapping("/requests/{requestId}/check-out")
    public ApiResponse<VisitRequestResponse> checkOut(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        User actor = CurrentUser.require(authentication);

        VisitRequestResponse resp = visitorService.checkOut(actor, requestId);

        auditService.record(
                actor.getId(),
                resp.societyId(),
                AuditAction.VISITOR_CHECKED_OUT,
                "VISIT_REQUEST",
                resp.id(),
                "Visitor " + resp.visitorName() + " checked out"
        );

        notificationService.send(
                resp.residentId(),
                resp.societyId(),
                NotificationType.EXIT,
                "Visitor checked out",
                resp.visitorName()
                        + " has checked out and left the society premises.",
                resp.id()
        );

        return ApiResponse.success(resp);
    }
}
