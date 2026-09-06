package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitorType;

import java.time.OffsetDateTime;

public record VisitorResponse(
        Long id,
        String fullName,
        String mobileNumber,
        VisitorType visitorType,
        String vehicleNumber,
        OffsetDateTime createdAt
) {
}