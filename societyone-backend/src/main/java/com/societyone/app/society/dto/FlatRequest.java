package com.societyone.app.society.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FlatRequest(
        @NotBlank(message = "Flat number is required")
        @Size(max = 30, message = "Flat number is too long")
        String number,

        String status
) {
}
