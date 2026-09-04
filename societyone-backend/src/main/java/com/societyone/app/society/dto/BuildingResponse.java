package com.societyone.app.society.dto;

import java.util.List;

public record BuildingResponse(
        String id,
        String name,
        String status,
        List<FloorResponse> floors
) {
}
