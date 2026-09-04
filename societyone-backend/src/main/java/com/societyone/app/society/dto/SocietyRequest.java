package com.societyone.app.society.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SocietyRequest(
        @NotBlank(message = "Society name is required")
        @Size(max = 160, message = "Society name is too long")
        String name,

        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Address is too long")
        String address,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City is too long")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 100, message = "State is too long")
        String state,

        @NotBlank(message = "Postal code is required")
        @Size(max = 20, message = "Postal code is too long")
        @Pattern(regexp = "^[A-Za-z0-9\\- ]+$", message = "Postal code contains invalid characters")
        String postalCode,

        @Size(max = 30, message = "Contact phone is too long")
        String contactPhone,

        @Email(message = "Please enter a valid contact email")
        @Size(max = 255, message = "Contact email is too long")
        String contactEmail
) {
}
