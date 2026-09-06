package com.societyone.app.resident.dto;

import com.societyone.app.resident.entity.ResidentType;
import jakarta.validation.constraints.NotNull;

public record ResidentCreateRequest(

        @NotNull
        Long flatId,

        @NotNull
        ResidentType residentType
) {
}
