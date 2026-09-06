package com.societyone.app.dashboard.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.dashboard.dto.DashboardSummaryResponse;
import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.entity.ResidentStatus;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.security.entity.SecurityStaffProfile;
import com.societyone.app.security.entity.SecurityStaffStatus;
import com.societyone.app.security.repository.SecurityStaffProfileRepository;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Floor;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.entity.StructureStatus;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.FloorRepository;
import com.societyone.app.society.repository.SocietyRepository;
import com.societyone.app.visitor.entity.VisitRequest;
import com.societyone.app.visitor.entity.VisitRequestStatus;
import com.societyone.app.visitor.entity.VisitStatus;
import com.societyone.app.visitor.repository.VisitRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final SocietyRepository societyRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final FlatRepository flatRepository;
    private final ResidentProfileRepository residentProfileRepository;
    private final SecurityStaffProfileRepository securityStaffProfileRepository;
    private final VisitRequestRepository visitRequestRepository;

    public DashboardService(
            SocietyRepository societyRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository,
            ResidentProfileRepository residentProfileRepository,
            SecurityStaffProfileRepository securityStaffProfileRepository,
            VisitRequestRepository visitRequestRepository
    ) {
        this.societyRepository = societyRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.flatRepository = flatRepository;
        this.residentProfileRepository = residentProfileRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.visitRequestRepository = visitRequestRepository;
    }

    public DashboardSummaryResponse getSummary(User actor) {
        requireAuthenticated(actor);
        return switch (actor.getRole()) {
            case ADMIN -> adminSummary(actor);
            case RESIDENT -> residentSummary(actor);
            case SECURITY -> securitySummary(actor);
            case VISITOR -> visitorSummary(actor);
            default -> emptySummary();
        };
    }

    private DashboardSummaryResponse adminSummary(User admin) {
        Society society = getAdminSociety(admin);
        Long societyId = society.getId();

        List<Building> buildings =
                buildingRepository.findBySocietyIdInOrderByNameAsc(
                        List.of(societyId)
                );

        List<Long> buildingIds =
                buildings.stream()
                        .map(Building::getId)
                        .toList();

        List<Floor> floors = buildingIds.isEmpty()
                ? List.of()
                : floorRepository.findByBuildingIdInOrderByNumberAsc(
                        buildingIds
                );

        List<Long> floorIds =
                floors.stream()
                        .map(Floor::getId)
                        .toList();

        List<Flat> flats = floorIds.isEmpty()
                ? List.of()
                : flatRepository.findByFloorIdInOrderByNumberAsc(
                        floorIds
                );

        List<ResidentProfile> residents =
                residentProfileRepository
                        .findByFlat_SocietyIdOrderByCreatedAtDesc(
                                societyId
                        );

        List<SecurityStaffProfile> securityStaff =
                securityStaffProfileRepository
                        .findBySocietyId(societyId);

        List<VisitRequest> visitRequests =
                visitRequestRepository
                        .findBySocietyIdOrderByCreatedAtDesc(
                                societyId
                        );

        long activeResidents = residents.stream()
                .filter(r -> r.getStatus() == ResidentStatus.ACTIVE)
                .count();

        long activeSecurity = securityStaff.stream()
                .filter(s -> s.getStatus() == SecurityStaffStatus.ACTIVE)
                .count();

        long activeFlats = flats.stream()
                .filter(f -> f.getStatus() == StructureStatus.ACTIVE)
                .count();

        long pendingResidentApprovals = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.PENDING_RESIDENT)
                .count();

        long pendingSecurityApprovals = visitRequests.stream()
                .filter(DashboardService::awaitsSecurityDecision)
                .count();

        long waitingAtGate = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.WAITING_AT_GATE)
                .count();

        long currentlyCheckedIn = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN)
                .count();

        LocalDate today = LocalDate.now();
        long checkedInToday = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN
                        || vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .filter(vr -> vr.getExpectedDate() != null)
                .filter(vr -> vr.getExpectedDate().equals(today))
                .count();

        long checkedOutToday = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .filter(vr -> vr.getExpectedDate() != null)
                .filter(vr -> vr.getExpectedDate().equals(today))
                .count();

        long rejectedByResident = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_RESIDENT)
                .count();

        long rejectedBySecurity = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_SECURITY)
                .count();

        Map<String, Object> breakdowns = new HashMap<>();
        breakdowns.put("requestStatusCounts", requestStatusCounts(visitRequests));
        breakdowns.put("visitStatusCounts", visitStatusCounts(visitRequests));

        return new DashboardSummaryResponse(
                1L,
                (long) buildings.size(),
                (long) floors.size(),
                (long) flats.size(),
                (long) residents.size(),
                activeResidents,
                (long) securityStaff.size(),
                activeSecurity,
                (long) visitRequests.stream()
                        .map(vr -> vr.getVisitor().getId())
                        .distinct()
                        .count(),
                (long) visitRequests.size(),
                pendingResidentApprovals,
                pendingSecurityApprovals,
                currentlyCheckedIn,
                checkedInToday,
                checkedOutToday,
                rejectedByResident,
                rejectedBySecurity,
                waitingAtGate,
                activeFlats,
                pendingResidentApprovals,
                pendingSecurityApprovals,
                (long) visitRequests.size(),
                currentlyCheckedIn,
                checkedOutToday,
                (long) visitRequests.stream()
                        .filter(vr -> vr.getRequestStatus()
                                == VisitRequestStatus.ACCEPTED_BY_SECURITY
                                || awaitsSecurityDecision(vr))
                        .count(),
                rejectedByResident,
                breakdowns,
                recentActivity(visitRequests, 10)
        );
    }

    private DashboardSummaryResponse residentSummary(User actor) {
        List<VisitRequest> myRequests =
                visitRequestRepository
                        .findByResidentIdOrderByCreatedAtDesc(
                                actor.getId()
                        );

        long pendingResidentRequests = myRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.PENDING_RESIDENT)
                .count();

        long pendingSecurityRequests = myRequests.stream()
                .filter(DashboardService::awaitsSecurityDecision)
                .count();

        long ownApproved = myRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.ACCEPTED_BY_SECURITY
                        || vr.getVisitStatus()
                        == VisitStatus.WAITING_AT_GATE
                        || vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN
                        || vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .count();

        long ownRejected = myRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_RESIDENT
                        || vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_SECURITY)
                .count();

        long ownCheckIns = myRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN)
                .count();

        long ownCheckOuts = myRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .count();

        Long total = (long) myRequests.size();

        Map<String, Object> breakdowns = new HashMap<>();
        breakdowns.put("requestStatusCounts", requestStatusCounts(myRequests));
        breakdowns.put("visitStatusCounts", visitStatusCounts(myRequests));

        return new DashboardSummaryResponse(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                (long) myRequests.stream()
                        .map(vr -> vr.getVisitor().getId())
                        .distinct()
                        .count(),
                total,
                pendingResidentRequests,
                pendingSecurityRequests,
                ownCheckIns,
                ownCheckIns + ownCheckOuts,
                ownCheckOuts,
                myRequests.stream()
                        .filter(vr -> vr.getRequestStatus()
                                == VisitRequestStatus.REJECTED_BY_RESIDENT)
                        .count(),
                myRequests.stream()
                        .filter(vr -> vr.getRequestStatus()
                                == VisitRequestStatus.REJECTED_BY_SECURITY)
                        .count(),
                myRequests.stream()
                        .filter(vr -> vr.getVisitStatus()
                                == VisitStatus.WAITING_AT_GATE)
                        .count(),
                null,
                pendingResidentRequests,
                pendingSecurityRequests,
                total,
                ownCheckIns,
                ownCheckOuts,
                ownApproved,
                ownRejected,
                breakdowns,
                recentActivity(myRequests, 10)
        );
    }

    private DashboardSummaryResponse securitySummary(User actor) {
        SecurityStaffProfile profile =
                securityStaffProfileRepository
                        .findByUserId(actor.getId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Security profile not found"
                                )
                        );

        Long societyId = profile.getSociety().getId();

        List<VisitRequest> visitRequests =
                visitRequestRepository
                        .findBySocietyIdOrderByCreatedAtDesc(
                                societyId
                        );

        long pendingSecurityApprovals = visitRequests.stream()
                .filter(DashboardService::awaitsSecurityDecision)
                .count();

        long waitingAtGate = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.WAITING_AT_GATE)
                .count();

        long currentlyCheckedIn = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN)
                .count();

        LocalDate today = LocalDate.now();
        long checkedInToday = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_IN
                        || vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .filter(vr -> vr.getExpectedDate() != null)
                .filter(vr -> vr.getExpectedDate().equals(today))
                .count();

        long checkedOutToday = visitRequests.stream()
                .filter(vr -> vr.getVisitStatus()
                        == VisitStatus.CHECKED_OUT)
                .count();

        long rejectedBySecurity = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_SECURITY)
                .count();

        long rejectedByResident = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.REJECTED_BY_RESIDENT)
                .count();

        long acceptedBySecurity = visitRequests.stream()
                .filter(vr -> vr.getRequestStatus()
                        == VisitRequestStatus.ACCEPTED_BY_SECURITY)
                .count();

        Map<String, Object> breakdowns = new HashMap<>();
        breakdowns.put("requestStatusCounts", requestStatusCounts(visitRequests));
        breakdowns.put("visitStatusCounts", visitStatusCounts(visitRequests));

        return new DashboardSummaryResponse(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                (long) visitRequests.stream()
                        .map(vr -> vr.getVisitor().getId())
                        .distinct()
                        .count(),
                (long) visitRequests.size(),
                null,
                pendingSecurityApprovals,
                currentlyCheckedIn,
                checkedInToday,
                checkedOutToday,
                rejectedByResident,
                rejectedBySecurity,
                waitingAtGate,
                null,
                null,
                pendingSecurityApprovals,
                (long) visitRequests.size(),
                currentlyCheckedIn,
                checkedOutToday,
                acceptedBySecurity,
                rejectedBySecurity,
                breakdowns,
                recentActivity(visitRequests, 10)
        );
    }

    private DashboardSummaryResponse visitorSummary(User actor) {
        List<VisitRequest> myRequests = visitRequestRepository
                .findByVisitorUserOrMobile(actor.getId(), actor.getMobileNumber());

        long total = myRequests.size();
        long pending = myRequests.stream()
                .filter(vr -> vr.getRequestStatus() == VisitRequestStatus.PENDING_RESIDENT
                        || vr.getRequestStatus() == VisitRequestStatus.PENDING_SECURITY)
                .count();
        long approved = myRequests.stream()
                .filter(vr -> vr.getRequestStatus() == VisitRequestStatus.ACCEPTED_BY_SECURITY
                        || vr.getRequestStatus() == VisitRequestStatus.APPROVED_BY_RESIDENT
                        || vr.getVisitStatus() == VisitStatus.WAITING_AT_GATE
                        || vr.getVisitStatus() == VisitStatus.CHECKED_IN
                        || vr.getVisitStatus() == VisitStatus.CHECKED_OUT)
                .count();
        long checkedIn = myRequests.stream()
                .filter(vr -> vr.getVisitStatus() == VisitStatus.CHECKED_IN)
                .count();
        long checkedOut = myRequests.stream()
                .filter(vr -> vr.getVisitStatus() == VisitStatus.CHECKED_OUT)
                .count();

        Map<String, Object> breakdowns = new HashMap<>();
        breakdowns.put("requestStatusCounts", requestStatusCounts(myRequests));
        breakdowns.put("visitStatusCounts", visitStatusCounts(myRequests));

        return new DashboardSummaryResponse(
                null, null, null, null, null, null, null, null,
                1L,
                total,
                pending,
                null,
                checkedIn,
                checkedIn + checkedOut,
                checkedOut,
                null, null, null, null,
                pending,
                null,
                total,
                checkedIn,
                checkedOut,
                approved,
                null,
                breakdowns,
                recentActivity(myRequests, 10)
        );
    }

    private DashboardSummaryResponse emptySummary() {
    return new DashboardSummaryResponse(
            null, // 1  totalSocieties
            null, // 2  totalBuildings
            null, // 3  totalFloors
            null, // 4  totalFlats
            null, // 5  totalResidents
            null, // 6  activeResidents
            null, // 7  totalSecurityStaff
            null, // 8  activeSecurityStaff
            null, // 9  totalVisitors
            null, // 10 totalVisitRequests
            null, // 11 pendingResidentApprovals
            null, // 12 pendingSecurityApprovals
            null, // 13 currentlyCheckedIn
            null, // 14 checkedInToday
            null, // 15 checkedOutToday
            null, // 16 rejectedByResident
            null, // 17 rejectedBySecurity
            null, // 18 waitingAtGate
            null, // 19 activeFlats
            null, // 20 pendingResidentRequests
            null, // 21 pendingSecurityRequests
            null, // 22 totalResidentRequests
            null, // 23 ownCheckIns
            null, // 24 ownCheckOuts
            null, // 25 ownApprovedVisits
            null, // 26 ownRejectedVisits
            Map.of(),
            List.of()
    );
}

    private Map<String, Long> requestStatusCounts(List<VisitRequest> requests) {
        Map<String, Long> counts = new HashMap<>();
        for (VisitRequestStatus s : VisitRequestStatus.values()) {
            long c = requests.stream()
                    .filter(vr -> vr.getRequestStatus() == s)
                    .count();
            counts.put(s.name(), c);
        }
        return counts;
    }

    private Map<String, Long> visitStatusCounts(List<VisitRequest> requests) {
        Map<String, Long> counts = new HashMap<>();
        for (VisitStatus s : VisitStatus.values()) {
            long c = requests.stream()
                    .filter(vr -> vr.getVisitStatus() == s)
                    .count();
            counts.put(s.name(), c);
        }
        return counts;
    }

    private List<Map<String, Object>> recentActivity(
            List<VisitRequest> requests,
            int limit
    ) {
        List<Map<String, Object>> out = new ArrayList<>();
        List<VisitRequest> ordered = requests.stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                    if (a.getCreatedAt() == null) return 1;
                    if (b.getCreatedAt() == null) return -1;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .limit(limit)
                .toList();
        for (VisitRequest vr : ordered) {
            Map<String, Object> row = new HashMap<>();
            row.put("requestId", vr.getId());
            row.put("visitorId", vr.getVisitor().getId());
            row.put("visitorName", vr.getVisitor().getFullName());
            row.put("flatNumber", vr.getFlat() == null ? null : vr.getFlat().getNumber());
            row.put("requestStatus", vr.getRequestStatus().name());
            row.put("visitStatus", vr.getVisitStatus().name());
            row.put("expectedDate", vr.getExpectedDate());
            row.put("purpose", vr.getPurpose());
            row.put("createdAt", vr.getCreatedAt());
            out.add(row);
        }
        return out;
    }

    private static boolean awaitsSecurityDecision(VisitRequest request) {
        return request.getRequestStatus() == VisitRequestStatus.PENDING_SECURITY
                || request.getRequestStatus() == VisitRequestStatus.APPROVED_BY_RESIDENT;
    }

    private Society getAdminSociety(User admin) {
        return societyRepository
                .findByOwnerOrderByNameAsc(admin)
                .stream()
                .findFirst()
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "Admin has no society"
                        )
                );
    }

    private static void requireAuthenticated(User actor) {
        if (actor == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
    }
}
