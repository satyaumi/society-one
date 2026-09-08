package com.societyone.app.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PlatformDirectMessageRequest(
        @NotNull(message = "Society ID is required")
        Long societyId,

        @NotBlank(message = "Subject is required")
        @Size(max = 200, message = "Subject is too long")
        String subject,

        @NotBlank(message = "Message content is required")
        String message,

        String category,

        Boolean sendEmail
) {
    public boolean isSendEmail() {
        return sendEmail == null || sendEmail;
    }

    public String safeCategory() {
        return (category == null || category.isBlank()) ? "GENERAL_UPDATE" : category.trim().toUpperCase();
    }
}
