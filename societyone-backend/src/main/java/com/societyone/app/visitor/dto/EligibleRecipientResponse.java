package com.societyone.app.visitor.dto;

public record EligibleRecipientResponse(
        Long id,
        String fullName,
        String role,
        String designation,
        Long buildingId,
        String buildingName,
        Long floorId,
        Integer floorNumber,
        Long flatId,
        String flatNumber
) {}
