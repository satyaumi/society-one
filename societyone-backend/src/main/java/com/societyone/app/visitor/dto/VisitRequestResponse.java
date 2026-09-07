package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitRequestStatus;
import com.societyone.app.visitor.entity.VisitSource;
import com.societyone.app.visitor.entity.VisitStatus;
import com.societyone.app.visitor.entity.VisitorType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record VisitRequestResponse(

        Long id,

        Long visitorId,
        String visitorName,
        String visitorMobile,
        VisitorType visitorType,
        String visitorPhotoUrl,

        Long societyId,
        String societyName,
        String buildingName,

        Long flatId,
        String flatNumber,

        Long residentId,
        String residentName,

        VisitSource source,

        VisitRequestStatus requestStatus,
        VisitStatus visitStatus,

        LocalDate expectedDate,
        LocalTime expectedTime,

        String purpose,
        String vehicleNumber,

        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public VisitRequestResponse(
            Long id,
            Long visitorId,
            String visitorName,
            String visitorMobile,
            VisitorType visitorType,
            Long societyId,
            String societyName,
            Long flatId,
            String flatNumber,
            Long residentId,
            String residentName,
            VisitSource source,
            VisitRequestStatus requestStatus,
            VisitStatus visitStatus,
            LocalDate expectedDate,
            LocalTime expectedTime,
            String purpose,
            String vehicleNumber,
            OffsetDateTime createdAt
    ) {
        this(
                id,
                visitorId,
                visitorName,
                visitorMobile,
                visitorType,
                null,
                societyId,
                societyName,
                null,
                flatId,
                flatNumber,
                residentId,
                residentName,
                source,
                requestStatus,
                visitStatus,
                expectedDate,
                expectedTime,
                purpose,
                vehicleNumber,
                createdAt,
                createdAt
        );
    }
}