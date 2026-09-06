package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangeMobileRequest(
        @NotBlank(message = "New mobile number is required")
        @Size(min = 7, max = 30, message = "Mobile number must be between 7 and 30 characters")
        String newMobileNumber,

        String otp
) {
}
