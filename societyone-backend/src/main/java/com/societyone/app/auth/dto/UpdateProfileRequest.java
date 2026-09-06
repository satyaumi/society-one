package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name is too long")
        String fullName,

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "Username may only contain letters, numbers, and . _ -")
        String username
) {
}
