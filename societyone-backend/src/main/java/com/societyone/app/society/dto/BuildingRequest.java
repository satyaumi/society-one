package com.societyone.app.society.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuildingRequest(
        @NotBlank(message = "Building name is required")
        @Size(max = 120, message = "Building name is too long")
        String name,

        String status
) {
}
