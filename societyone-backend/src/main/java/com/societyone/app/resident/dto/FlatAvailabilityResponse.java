package com.societyone.app.resident.dto;

public record FlatAvailabilityResponse(
        Long flatId,
        String flatNumber,
        Long floorId,
        Integer floorNumber,
        Long buildingId,
        String buildingName,
        boolean isOccupied,
        String occupiedByResidentName,
        String status
) {}
