package com.societyone.app.notification.dto;

import com.societyone.app.notification.entity.Announcement;
import com.societyone.app.notification.entity.AnnouncementAudience;
import com.societyone.app.notification.entity.AnnouncementType;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record AnnouncementResponse(
        Long id,
        String title,
        String message,
        AnnouncementType type,
        AnnouncementAudience audience,
        Long societyId,
        Long createdByUserId,
        LocalDate eventDate,
        String eventTime,
        String purpose,
        String imageUrl,
        OffsetDateTime expiresAt,
        boolean active,
        boolean pinned,
        boolean read,
        boolean dismissed,
        Long readCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static AnnouncementResponse from(Announcement a, boolean read, boolean dismissed, Long readCount) {
        return new AnnouncementResponse(
                a.getId(),
                a.getTitle(),
                a.getMessage(),
                a.getType(),
                a.getAudience(),
                a.getSocietyId(),
                a.getCreatedByUserId(),
                a.getEventDate(),
                a.getEventTime(),
                a.getPurpose(),
                a.getImageUrl(),
                a.getExpiresAt(),
                a.isActive(),
                a.isPinned(),
                read,
                dismissed,
                readCount,
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
