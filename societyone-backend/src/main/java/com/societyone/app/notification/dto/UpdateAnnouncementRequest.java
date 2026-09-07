package com.societyone.app.notification.dto;

import com.societyone.app.notification.entity.AnnouncementAudience;
import com.societyone.app.notification.entity.AnnouncementType;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record UpdateAnnouncementRequest(
        @Size(max = 200, message = "Title is too long")
        String title,

        String message,

        AnnouncementType type,

        AnnouncementAudience audience,

        LocalDate eventDate,
        String eventTime,
        String purpose,
        String imageUrl,
        OffsetDateTime expiresAt,
        Boolean active,
        Boolean pinned
) {
    public UpdateAnnouncementRequest(
            String title,
            String message,
            AnnouncementType type,
            AnnouncementAudience audience,
            LocalDate eventDate,
            String eventTime,
            String purpose,
            OffsetDateTime expiresAt,
            Boolean active,
            Boolean pinned
    ) {
        this(title, message, type, audience, eventDate, eventTime, purpose, null, expiresAt, active, pinned);
    }
}
