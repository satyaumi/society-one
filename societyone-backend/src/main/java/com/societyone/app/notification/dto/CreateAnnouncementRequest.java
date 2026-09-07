package com.societyone.app.notification.dto;

import com.societyone.app.notification.entity.AnnouncementAudience;
import com.societyone.app.notification.entity.AnnouncementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record CreateAnnouncementRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title is too long")
        String title,

        @NotBlank(message = "Message is required")
        String message,

        @NotNull(message = "Notification type is required")
        AnnouncementType type,

        @NotNull(message = "Audience is required")
        AnnouncementAudience audience,

        LocalDate eventDate,
        String eventTime,
        String purpose,
        String imageUrl,
        OffsetDateTime expiresAt,
        Boolean active,
        Boolean pinned
) {
    public CreateAnnouncementRequest(
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

    public boolean isActiveDefault() {
        return active == null || active;
    }

    public boolean isPinnedDefault() {
        return pinned != null && pinned;
    }
}
