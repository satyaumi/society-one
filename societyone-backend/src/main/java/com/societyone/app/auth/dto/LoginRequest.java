package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "Authentication method is required")
        String method,
        @NotBlank(message = "Identifier is required")
        String identifier,
        @NotBlank(message = "Password is required")
        String password,
        String intendedRole
) { }
