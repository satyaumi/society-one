package com.societyone.app.society.dto;

import java.util.List;

public record FlatResponse(
        String id,
        String number,
        String buildingId,
        String floorId,
        String status,
        List<String> residentIds
) {
}
