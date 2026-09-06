package com.societyone.app.resident.dto;

import com.societyone.app.resident.entity.ResidentType;
import jakarta.validation.constraints.NotNull;

public record ResidentSelfLinkRequest(
        @NotNull
        Long flatId,

        @NotNull
        ResidentType residentType
) {
}
