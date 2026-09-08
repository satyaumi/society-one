package com.societyone.app.platform.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminHandoverRequest(
        @NotNull(message = "New admin user ID is required")
        Long newAdminUserId,

        @Size(max = 500, message = "Handover reason must not exceed 500 characters")
        String reason
) {}
