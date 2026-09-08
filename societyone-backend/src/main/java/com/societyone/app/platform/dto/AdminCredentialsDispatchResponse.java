package com.societyone.app.platform.dto;

public record AdminCredentialsDispatchResponse(
        Long societyId,
        String societyName,
        Long adminUserId,
        String adminFullName,
        String adminUsername,
        String adminEmail,
        boolean emailSent,
        String message
) {}
