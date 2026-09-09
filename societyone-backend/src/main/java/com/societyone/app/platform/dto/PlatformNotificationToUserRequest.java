package com.societyone.app.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PlatformNotificationToUserRequest(
        @NotNull(message = "Target User ID is required")
        Long targetUserId,

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title is too long")
        String title,

        @NotBlank(message = "Message content is required")
        String message
) {}
