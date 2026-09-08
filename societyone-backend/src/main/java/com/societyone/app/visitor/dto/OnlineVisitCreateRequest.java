package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record OnlineVisitCreateRequest(
        @NotNull(message = "Society is required")
        Long societyId,

        @NotNull(message = "Recipient is required")
        Long recipientId,

        @NotBlank(message = "Visitor full name is required")
        @Size(max = 150, message = "Visitor name must be under 150 characters")
        String fullName,

        @NotBlank(message = "Mobile number is required")
        @Size(max = 30, message = "Mobile number must be under 30 characters")
        String mobileNumber,

        @Size(max = 255, message = "Email must be under 255 characters")
        String email,

        VisitorType visitorType,

        @NotBlank(message = "Visit purpose is required")
        @Size(max = 500, message = "Purpose must be under 500 characters")
        String purpose,

        LocalDate expectedDate,

        LocalTime expectedTime,

        Integer numberOfVisitors,

        @Size(max = 30, message = "Vehicle number must be under 30 characters")
        String vehicleNumber,

        @Size(max = 500, message = "Photo URL must be under 500 characters")
        String photoUrl,

        @Size(max = 500, message = "Notes must be under 500 characters")
        String notes
) {}
