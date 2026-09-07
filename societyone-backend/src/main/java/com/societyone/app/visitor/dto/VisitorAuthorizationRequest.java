package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.AuthorizationType;
import com.societyone.app.visitor.entity.VisitorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record VisitorAuthorizationRequest(
        Long visitorId,
        String fullName,
        @NotBlank(message = "Mobile number is required")
        String mobileNumber,
        VisitorType visitorType,
        String vehicleNumber,
        @NotNull(message = "Flat ID is required")
        Long flatId,
        Long residentId,
        AuthorizationType authorizationType,
        LocalDate validFrom,
        LocalDate validUntil,
        String notes,
        String photoUrl
) {
    public VisitorAuthorizationRequest(
            Long visitorId,
            String fullName,
            String mobileNumber,
            VisitorType visitorType,
            String vehicleNumber,
            Long flatId,
            Long residentId,
            AuthorizationType authorizationType,
            LocalDate validFrom,
            LocalDate validUntil,
            String notes
    ) {
        this(visitorId, fullName, mobileNumber, visitorType, vehicleNumber, flatId, residentId, authorizationType, validFrom, validUntil, notes, null);
    }
}
