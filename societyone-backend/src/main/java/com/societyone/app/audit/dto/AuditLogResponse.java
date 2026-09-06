package com.societyone.app.audit.dto;

import com.societyone.app.audit.entity.AuditAction;

import java.time.OffsetDateTime;

public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorUsername,
        Long societyId,
        AuditAction action,
        String entityType,
        Long entityId,
        String description,
        OffsetDateTime createdAt
) {
}
