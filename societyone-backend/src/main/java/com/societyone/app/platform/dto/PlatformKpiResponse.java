package com.societyone.app.platform.dto;

public record PlatformKpiResponse(
        long totalSocieties,
        long activeSocieties,
        long pendingRequests,
        long underReviewRequests,
        long approvedRequests,
        long totalSocietyAdmins,
        long totalResidents,
        long totalFlats,
        long totalSecurityStaff
) {}
