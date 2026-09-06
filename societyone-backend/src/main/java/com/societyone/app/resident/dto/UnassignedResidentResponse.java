package com.societyone.app.resident.dto;

import java.time.OffsetDateTime;

public record UnassignedResidentResponse(
        Long userId,
        String username,
        String fullName,
        String email,
        String mobileNumber,
        OffsetDateTime createdAt
) {
}
