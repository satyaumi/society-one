package com.societyone.app.notification.dto;

import java.time.OffsetDateTime;

public record UnifiedNotificationResponse(
        String id,
        Long rawId,
        String source,
        String type,
        String title,
        String message,
        String audience,
        String eventDate,
        String eventTime,
        String purpose,
        String imageUrl,
        boolean read,
        boolean pinned,
        Long visitRequestId,
        OffsetDateTime createdAt,
        OffsetDateTime expiresAt
) {
    public UnifiedNotificationResponse(
            String id,
            Long rawId,
            String source,
            String type,
            String title,
            String message,
            String audience,
            String eventDate,
            String eventTime,
            String purpose,
            boolean read,
            boolean pinned,
            Long visitRequestId,
            OffsetDateTime createdAt,
            OffsetDateTime expiresAt
    ) {
        this(id, rawId, source, type, title, message, audience, eventDate, eventTime, purpose, null, read, pinned, visitRequestId, createdAt, expiresAt);
    }
}
