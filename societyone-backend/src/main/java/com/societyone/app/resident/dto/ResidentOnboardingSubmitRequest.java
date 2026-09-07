package com.societyone.app.resident.dto;

import com.societyone.app.resident.entity.ResidentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResidentOnboardingSubmitRequest(
        Long societyId,

        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name cannot exceed 150 characters")
        String fullName,

        @NotNull(message = "Resident type is required")
        ResidentType residentType,

        @Size(max = 30, message = "Flat type preference cannot exceed 30 characters")
        String flatTypePreference,

        @Min(value = 1, message = "Family member count must be at least 1")
        Integer familyMemberCount,

        Long preferredBuildingId,

        @Size(max = 30, message = "Preferred flat number cannot exceed 30 characters")
        String preferredFlatNumber,

        @Size(max = 150, message = "Emergency contact name cannot exceed 150 characters")
        String emergencyContactName,

        @Size(max = 30, message = "Emergency contact phone cannot exceed 30 characters")
        String emergencyContactPhone,

        @Size(max = 50, message = "Vehicle number cannot exceed 50 characters")
        String vehicleNumber
) {}
