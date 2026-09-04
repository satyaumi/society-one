package com.societyone.app.society.dto;

import java.util.List;

public record SocietyResponse(
        String id,
        String name,
        String address,
        String city,
        String state,
        String postalCode,
        String contactPhone,
        String contactEmail,
        String status,
        String createdAt,
        String updatedAt,
        List<BuildingResponse> buildings
) {
}
