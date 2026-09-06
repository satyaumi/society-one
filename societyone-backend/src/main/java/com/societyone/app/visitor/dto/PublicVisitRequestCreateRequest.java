package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record PublicVisitRequestCreateRequest(
        @NotBlank(message = "Visitor name is required")
        String fullName,

        @NotBlank(message = "Mobile number is required")
        String mobileNumber,

        @NotBlank(message = "Purpose is required")
        String purpose,

        VisitorType visitorType,

        String vehicleNumber,

        @NotNull(message = "Society is required")
        Long societyId,

        Long buildingId,

        Long floorId,

        @NotNull(message = "Flat is required")
        Long flatId,

        @NotNull(message = "Resident is required")
        Long residentId,

        LocalDate expectedDate,

        LocalTime expectedTime
) {}
