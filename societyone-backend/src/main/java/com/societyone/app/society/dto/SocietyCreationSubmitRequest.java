package com.societyone.app.society.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SocietyCreationSubmitRequest(
        @NotBlank(message = "Primary contact name is required")
        @Size(max = 120, message = "Name must not exceed 120 characters")
        String primaryContactName,

        @NotBlank(message = "Primary contact email is required")
        @Email(message = "Invalid primary contact email format")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String primaryContactEmail,

        @NotBlank(message = "Primary contact phone is required")
        @Size(max = 30, message = "Phone must not exceed 30 characters")
        String primaryContactPhone,

        @Email(message = "Invalid official society email format")
        @Size(max = 255, message = "Official email must not exceed 255 characters")
        String societyOfficialEmail,

        @Size(max = 120, message = "Secondary contact name must not exceed 120 characters")
        String secondaryContactName,

        @Size(max = 30, message = "Secondary phone must not exceed 30 characters")
        String secondaryContactPhone,

        @Email(message = "Invalid secondary contact email format")
        @Size(max = 255, message = "Secondary email must not exceed 255 characters")
        String secondaryContactEmail,

        @NotBlank(message = "Society name is required")
        @Size(max = 160, message = "Society name must not exceed 160 characters")
        String societyName,

        @Size(max = 80, message = "Registration number must not exceed 80 characters")
        String registrationNumber,

        @Size(max = 60, message = "Society type must not exceed 60 characters")
        String societyType,

        @Min(value = 1, message = "Total flats must be at least 1")
        Integer totalFlats,

        @Min(value = 1, message = "Number of wings must be at least 1")
        Integer numberOfWings,

        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Address must not exceed 255 characters")
        String address,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must not exceed 100 characters")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 100, message = "State must not exceed 100 characters")
        String state,

        @NotBlank(message = "Postal code is required")
        @Size(max = 20, message = "Postal code must not exceed 20 characters")
        String postalCode,

        @Size(max = 80, message = "Management method must not exceed 80 characters")
        String managementMethod,

        // Optional applicant account password if they want an account created during approval
        String applicantPassword
) {}
