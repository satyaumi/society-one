package com.societyone.app.platform.dto;

import jakarta.validation.constraints.Size;

public record SocietyRequestReviewAction(
        @Size(max = 2000, message = "Review notes must not exceed 2000 characters")
        String notes,

        @Size(max = 2000, message = "Rejection reason must not exceed 2000 characters")
        String reason,

        // Optional custom admin password or override if provisioning new admin user
        String adminPassword
) {}
