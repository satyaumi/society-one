package com.societyone.app.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SocietyCommandCenterResponse(
        SocietyHeaderInfo society,
        KpiMetrics kpis,
        List<ActionRequiredItem> actionRequired,
        List<BuildingOccupancySummary> occupancy,
        VisitorAnalyticsSummary visitorAnalytics,
        ResidentAnalyticsSummary residentAnalytics,
        SecurityGateSummary securityGate,
        List<AnnouncementSummary> upcomingAnnouncements,
        List<RecentActivityItem> recentActivity
) {

    public record SocietyHeaderInfo(
            Long id,
            String name,
            String address,
            String city,
            String state,
            String postalCode,
            int totalBuildings,
            int totalFloors
    ) {}

    public record KpiMetrics(
            long totalResidents,
            long ownerCount,
            long tenantCount,
            long familyMemberCount,
            long totalFlats,
            long occupiedFlats,
            long availableFlats,
            double occupancyPercentage,
            long todayVisitors,
            long currentlyInside,
            long waitingAtGate,
            long checkedOutToday,
            long pendingOnboardingRequests,
            long pendingAllocations,
            long pendingVisitorApprovals,
            long activeSecurityStaff,
            long activeAnnouncementsCount
    ) {}

    public record ActionRequiredItem(
            String id,
            String type, // "ONBOARDING", "ALLOCATION", "GATE_WAITING", "VISITOR_APPROVAL"
            String title,
            String description,
            long count,
            String severity, // "CRITICAL", "WARNING", "INFO"
            String actionUrl,
            String actionLabel
    ) {}

    public record BuildingOccupancySummary(
            Long buildingId,
            String buildingName,
            int totalFlats,
            int occupiedFlats,
            int availableFlats,
            double occupancyPercentage,
            List<FloorOccupancySummary> floors
    ) {}

    public record FloorOccupancySummary(
            Long floorId,
            int floorNumber,
            int totalFlats,
            int occupiedFlats,
            int availableFlats,
            List<FlatItemSummary> flats
    ) {}

    public record FlatItemSummary(
            Long flatId,
            String flatNumber,
            boolean isOccupied,
            String occupiedBy,
            String residentType,
            String flatType,
            String parkingSlot,
            String status
    ) {}

    public record VisitorAnalyticsSummary(
            long totalVisitsInPeriod,
            List<VisitorCategoryCount> categoryBreakdown,
            List<DailyVisitorTrend> trend7Days,
            List<BuildingVisitorCount> buildingBreakdown,
            List<RecentVisitItem> recentVisits
    ) {}

    public record VisitorCategoryCount(
            String category,
            String label,
            long count,
            double percentage
    ) {}

    public record DailyVisitorTrend(
            LocalDate date,
            String dayLabel,
            long totalVisits,
            long checkedIn,
            long checkedOut
    ) {}

    public record BuildingVisitorCount(
            Long buildingId,
            String buildingName,
            long visitCount
    ) {}

    public record RecentVisitItem(
            Long id,
            String visitorName,
            String visitorType,
            String flatNumber,
            String buildingName,
            String visitStatus,
            LocalDate expectedDate,
            String expectedTime,
            String purpose,
            String photoUrl,
            OffsetDateTime createdAt
    ) {}

    public record ResidentAnalyticsSummary(
            long totalResidents,
            long ownerCount,
            long tenantCount,
            long familyMemberCount,
            List<BuildingResidentCount> buildingBreakdown,
            List<RecentResidentItem> recentResidents
    ) {}

    public record BuildingResidentCount(
            Long buildingId,
            String buildingName,
            long residentCount,
            long ownerCount,
            long tenantCount
    ) {}

    public record RecentResidentItem(
            Long residentId,
            String residentName,
            String residentType,
            String flatNumber,
            String buildingName,
            String flatType,
            String parkingSlot,
            OffsetDateTime allocatedAt
    ) {}

    public record SecurityGateSummary(
            long waitingAtGate,
            long approvedWaiting,
            long currentlyInside,
            long checkedOutToday,
            long regularVisitorsToday,
            List<SecurityStaffItem> activeGuards,
            List<RecentGateActivityItem> recentGateActivity
    ) {}

    public record SecurityStaffItem(
            Long id,
            String fullName,
            String username,
            String mobileNumber,
            String status
    ) {}

    public record RecentGateActivityItem(
            Long requestId,
            String visitorName,
            String flatNumber,
            String buildingName,
            String eventType, // "WAITING", "CHECKED_IN", "CHECKED_OUT"
            OffsetDateTime timestamp
    ) {}

    public record AnnouncementSummary(
            Long id,
            String title,
            String content,
            String category,
            boolean pinned,
            OffsetDateTime createdAt,
            OffsetDateTime expiresAt
    ) {}

    public record RecentActivityItem(
            Long id,
            String action,
            String actionLabel,
            String entityType,
            Long entityId,
            String details,
            String actorName,
            String actorRole,
            OffsetDateTime timestamp
    ) {}
}
