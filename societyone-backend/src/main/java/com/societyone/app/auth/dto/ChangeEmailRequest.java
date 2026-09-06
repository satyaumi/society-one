package com.societyone.app.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ChangeEmailRequest(
        @NotBlank(message = "New email is required")
        @Email(message = "Please enter a valid email address")
        String newEmail,

        String otp
) {
}
