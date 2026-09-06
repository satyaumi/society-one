package com.societyone.app.resident.dto;

import com.societyone.app.resident.entity.ResidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResidentProvisionRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        String username,

        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name is too long")
        String fullName,

        String email,

        @NotBlank(message = "Mobile number is required")
        @Size(max = 30, message = "Mobile number is too long")
        String mobileNumber,

        @NotBlank(message = "Password is required")
        String password,

        @NotNull(message = "Flat is required")
        Long flatId,

        @NotNull(message = "Resident type is required")
        ResidentType residentType
) {
}
