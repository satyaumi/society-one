package com.societyone.app.resident.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FlatAllocationRequest(
        @NotNull(message = "Flat ID is required for allocation")
        Long flatId,

        @Size(max = 30, message = "Confirmed flat type cannot exceed 30 characters")
        String confirmedFlatType,

        @Size(max = 255, message = "Maintenance info cannot exceed 255 characters")
        String maintenanceInfo,

        @Size(max = 100, message = "Parking status cannot exceed 100 characters")
        String parkingStatus,

        @com.fasterxml.jackson.annotation.JsonAlias("adminNotes")
        String notes
) {}
