package com.societyone.app.visitor.dto;

import java.util.List;

public record PublicStructureResponse(
        List<PublicSocietyItem> societies
) {
    public record PublicResidentItem(
            Long id,
            String fullName,
            String username
    ) {}

    public record PublicFlatItem(
            Long id,
            String number,
            List<PublicResidentItem> residents
    ) {}

    public record PublicFloorItem(
            Long id,
            Integer floorNumber,
            List<PublicFlatItem> flats
    ) {}

    public record PublicBuildingItem(
            Long id,
            String name,
            List<PublicFloorItem> floors
    ) {}

    public record PublicSocietyItem(
            Long id,
            String name,
            String address,
            List<PublicBuildingItem> buildings
    ) {}
}
