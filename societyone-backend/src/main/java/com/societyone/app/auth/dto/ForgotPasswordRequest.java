package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Authentication method is required")
        String method,
        @NotBlank(message = "Identifier is required")
        String identifier
) {}
