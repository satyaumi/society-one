package com.societyone.app.security.dto;

import java.time.OffsetDateTime;

public record SecurityStaffResponse(
        Long id,
        Long userId,
        String username,
        String fullName,
        String email,
        String mobileNumber,
        Long societyId,
        String societyName,
        String status,
        OffsetDateTime createdAt
) {}