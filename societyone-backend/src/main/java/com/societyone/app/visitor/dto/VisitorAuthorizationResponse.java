package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.AuthorizationStatus;
import com.societyone.app.visitor.entity.AuthorizationType;
import com.societyone.app.visitor.entity.VisitorType;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VisitorAuthorizationResponse(
        Long id,
        Long visitorId,
        String visitorName,
        String visitorMobile,
        VisitorType visitorType,
        String vehicleNumber,
        String photoUrl,
        Long societyId,
        String societyName,
        String buildingName,
        Long flatId,
        String flatNumber,
        Long residentId,
        String residentName,
        AuthorizationType authorizationType,
        AuthorizationStatus status,
        LocalDate validFrom,
        LocalDate validUntil,
        String notes,
        boolean active,
        OffsetDateTime createdAt
) {
    public VisitorAuthorizationResponse(
            Long id,
            Long visitorId,
            String visitorName,
            String visitorMobile,
            VisitorType visitorType,
            String vehicleNumber,
            Long societyId,
            String societyName,
            Long flatId,
            String flatNumber,
            Long residentId,
            String residentName,
            AuthorizationType authorizationType,
            AuthorizationStatus status,
            LocalDate validFrom,
            LocalDate validUntil,
            String notes,
            boolean active,
            OffsetDateTime createdAt
    ) {
        this(id, visitorId, visitorName, visitorMobile, visitorType, vehicleNumber, null, societyId, societyName, null, flatId, flatNumber, residentId, residentName, authorizationType, status, validFrom, validUntil, notes, active, createdAt);
    }
}
