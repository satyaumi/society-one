package com.societyone.app.resident.dto;

import com.societyone.app.resident.entity.ResidentStatus;
import com.societyone.app.resident.entity.ResidentType;

import java.time.OffsetDateTime;

public record ResidentResponse(
        Long id,
        Long userId,
        String username,
        String email,
        String mobileNumber,
        Long flatId,
        String flatNumber,
        Long floorId,
        Integer floorNumber,
        Long buildingId,
        String buildingName,
        Long societyId,
        String societyName,
        ResidentType residentType,
        ResidentStatus status,
        OffsetDateTime createdAt
) {
}