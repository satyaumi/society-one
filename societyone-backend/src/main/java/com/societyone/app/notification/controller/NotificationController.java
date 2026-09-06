package com.societyone.app.notification.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.notification.dto.NotificationResponse;
import com.societyone.app.notification.service.NotificationService;
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

    @GetMapping
    public ApiResponse<List<NotificationResponse>> list(
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

    @PatchMapping("/{notificationId:\\d+}/read")
    public ApiResponse<NotificationResponse> markRead(
            Authentication authentication,
            @PathVariable Long notificationId
    ) {
        User user = CurrentUser.require(authentication);
        return ApiResponse.success(
                notificationService.markRead(user, notificationId)
        );
    }
}
