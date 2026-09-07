package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record VisitRequestCreateRequest(

        @NotNull
        Long visitorId,

        @NotNull
        Long societyId,

        @NotNull
        Long flatId,

        @NotNull
        Long residentId,

        @NotNull
        VisitSource source,

        @NotNull
        LocalDate expectedDate,

        LocalTime expectedTime,

        @Size(max = 500)
        String purpose,

        @Size(max = 30)
        String vehicleNumber,

        @Size(max = 500)
        String photoUrl
) {
    public VisitRequestCreateRequest(
            Long visitorId,
            Long societyId,
            Long flatId,
            Long residentId,
            VisitSource source,
            LocalDate expectedDate,
            LocalTime expectedTime,
            String purpose,
            String vehicleNumber
    ) {
        this(visitorId, societyId, flatId, residentId, source, expectedDate, expectedTime, purpose, vehicleNumber, null);
    }
}