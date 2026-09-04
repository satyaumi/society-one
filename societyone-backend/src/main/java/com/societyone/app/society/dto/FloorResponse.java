package com.societyone.app.society.dto;

import java.util.List;

public record FloorResponse(
        String id,
        int number,
        String status,
        List<FlatResponse> flats
) {
}
