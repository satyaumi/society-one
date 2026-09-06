package com.societyone.app.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardSummaryResponse(
        Long totalSocieties,
        Long totalBuildings,
        Long totalFloors,
        Long totalFlats,
        Long totalResidents,
        Long activeResidents,
        Long totalSecurityStaff,
        Long activeSecurityStaff,
        Long totalVisitors,
        Long totalVisitRequests,
        Long pendingResidentApprovals,
        Long pendingSecurityApprovals,
        Long currentlyCheckedIn,
        Long checkedInToday,
        Long checkedOutToday,
        Long rejectedByResident,
        Long rejectedBySecurity,
        Long waitingAtGate,
        Long activeFlats,
        Long pendingResidentRequests,
        Long pendingSecurityRequests,
        Long totalResidentRequests,
        Long ownCheckIns,
        Long ownCheckOuts,
        Long ownApprovedVisits,
        Long ownRejectedVisits,
        Map<String, Object> breakdowns,
        List<Map<String, Object>> recentActivity
) {
}
