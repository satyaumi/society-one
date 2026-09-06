package com.societyone.app.common.api;

public record PublicSummaryResponse(
        long todayVisitorsCount,
        long totalSocietiesCount,
        String societyName,
        long todayActivitiesCount
) {
}
