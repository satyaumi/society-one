package com.societyone.app.security.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SecurityStaffCreateRequest(

        @NotBlank
        @Size(min = 3, max = 50)
        String username,

        @NotBlank
        @Size(min = 8, max = 100)
        String password,

        @NotBlank
        @Size(max = 100)
        String fullName,

        @NotBlank
        @Size(max = 150)
        String email,

        @NotBlank
        @Size(max = 20)
        String mobileNumber
) {}
