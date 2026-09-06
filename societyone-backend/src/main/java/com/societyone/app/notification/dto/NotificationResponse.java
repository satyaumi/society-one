package com.societyone.app.notification.dto;

import com.societyone.app.notification.entity.NotificationType;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        boolean read,
        Long societyId,
        Long visitRequestId,
        OffsetDateTime createdAt
) {
}
