package com.societyone.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteAccountRequest(
        @NotBlank(message = "Password is required to confirm account deactivation")
        String password,

        String confirmation
) {
}
