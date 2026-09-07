package com.societyone.app.notification.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.notification.dto.*;
import com.societyone.app.notification.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(
            NotificationService notificationService
    ) {
        this.notificationService = notificationService;
    }

    // =========================================================================
    // Public Announcements (Outside Society / Landing Page)
    // =========================================================================

    @GetMapping("/public")
    public ApiResponse<List<AnnouncementResponse>> listPublic() {
        return ApiResponse.success(
                notificationService.listPublicAnnouncements(),
                "Public announcements loaded"
        );
    }

    // =========================================================================
    // Role-Filtered Dashboard Floating Announcements
    // =========================================================================

    @GetMapping("/announcements")
    public ApiResponse<List<AnnouncementResponse>> listDashboardAnnouncements(
            Authentication authentication
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.listActiveAnnouncementsForDashboard(user),
                "Dashboard announcements loaded"
        );
    }

    @PatchMapping("/announcements/{id:\\d+}/dismiss")
    public ApiResponse<Void> dismissAnnouncement(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User user = CurrentUser.require(authentication);
        notificationService.dismissAnnouncement(user, id);
        return ApiResponse.success(null, "Announcement dismissed from dashboard");
    }

    // =========================================================================
    // Admin Management (Create, Edit, Toggle, Delete, Metrics)
    // =========================================================================

    @GetMapping("/announcements/admin")
    public ApiResponse<List<AnnouncementResponse>> listAdminAnnouncements(
            Authentication authentication
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.listAllForAdmin(user),
                "Admin announcements loaded"
        );
    }

    @PostMapping("/announcements")
    public ApiResponse<AnnouncementResponse> createAnnouncement(
            Authentication authentication,
            @Valid @RequestBody CreateAnnouncementRequest request
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.createAnnouncement(user, request),
                "Announcement created successfully"
        );
    }

    @PutMapping("/announcements/{id:\\d+}")
    public ApiResponse<AnnouncementResponse> updateAnnouncement(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateAnnouncementRequest request
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.updateAnnouncement(user, id, request),
                "Announcement updated successfully"
        );
    }

    @PatchMapping("/announcements/{id:\\d+}/toggle-active")
    public ApiResponse<AnnouncementResponse> toggleActive(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.toggleActive(user, id),
                "Announcement status updated"
        );
    }

    @DeleteMapping("/announcements/{id:\\d+}")
    public ApiResponse<Void> deleteAnnouncement(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User user = CurrentUser.require(authentication);
        notificationService.deleteAnnouncement(user, id);
        return ApiResponse.success(null, "Announcement deleted successfully");
    }

    // =========================================================================
    // Unified Notification Feed (Bell Icon + Notification Page)
    // =========================================================================

    @GetMapping
    public ApiResponse<List<UnifiedNotificationResponse>> list(
            Authentication authentication
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.listForUser(user)
        );
    }

    @PatchMapping("/read-all")
    public ApiResponse<Map<String, Integer>> markAllRead(
            Authentication authentication
    ) {
        User user = CurrentUser.require(authentication);
        int updated = notificationService.markAllRead(user);
        return ApiResponse.success(
                Map.of("markedRead", updated)
        );
    }

    @PatchMapping("/{notificationId}/read")
    public ApiResponse<Void> markRead(
            Authentication authentication,
            @PathVariable String notificationId
    ) {
        User user = CurrentUser.require(authentication);
        notificationService.markRead(user, notificationId);
        return ApiResponse.success(null, "Notification marked as read");
    }
}
