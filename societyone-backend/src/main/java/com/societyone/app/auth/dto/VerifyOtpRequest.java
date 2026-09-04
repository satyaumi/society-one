package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(
        @NotBlank(message = "Identifier is required")
        String identifier,
        @NotBlank(message = "OTP is required")
        String otp,
        String purpose
) {}
