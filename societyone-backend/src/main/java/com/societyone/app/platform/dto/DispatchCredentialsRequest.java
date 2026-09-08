package com.societyone.app.platform.dto;

import jakarta.validation.constraints.Size;

public record DispatchCredentialsRequest(
        @Size(min = 6, max = 50, message = "Password must be at least 6 characters")
        String newPassword,

        String notes
) {}
