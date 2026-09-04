package com.societyone.app.society.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FloorRequest(
        @NotNull(message = "Floor number is required")
        @Min(value = 0, message = "Floor number cannot be negative")
        @Max(value = 200, message = "Floor number is too high")
        Integer number,

        String status
) {
}
