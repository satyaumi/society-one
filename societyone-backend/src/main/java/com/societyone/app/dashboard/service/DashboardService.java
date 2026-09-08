package com.societyone.app.dashboard.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.audit.entity.AuditLog;
import com.societyone.app.audit.repository.AuditLogRepository;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.dashboard.dto.DashboardSummaryResponse;
import com.societyone.app.dashboard.dto.SocietyCommandCenterResponse;
import com.societyone.app.notification.entity.Announcement;
import com.societyone.app.notification.repository.AnnouncementRepository;
import com.societyone.app.resident.entity.OnboardingStatus;
import com.societyone.app.resident.entity.ResidentOnboardingRequest;
import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.entity.ResidentStatus;
import com.societyone.app.resident.entity.ResidentType;
import com.societyone.app.resident.repository.ResidentOnboardingRepository;
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
import com.societyone.app.visitor.entity.VisitorType;
import com.societyone.app.visitor.repository.VisitRequestRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

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
    private final ResidentOnboardingRepository residentOnboardingRepository;
    private final AuditLogRepository auditLogRepository;
    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;

    public DashboardService(
            SocietyRepository societyRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository,
            ResidentProfileRepository residentProfileRepository,
            SecurityStaffProfileRepository securityStaffProfileRepository,
            VisitRequestRepository visitRequestRepository,
            ResidentOnboardingRepository residentOnboardingRepository,
            AuditLogRepository auditLogRepository,
            AnnouncementRepository announcementRepository,
            UserRepository userRepository
    ) {
        this.societyRepository = societyRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.flatRepository = flatRepository;
        this.residentProfileRepository = residentProfileRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.visitRequestRepository = visitRequestRepository;
        this.residentOnboardingRepository = residentOnboardingRepository;
        this.auditLogRepository = auditLogRepository;
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
    }

    public DashboardSummaryResponse getSummary(User actor) {
        requireAuthenticated(actor);
        return switch (actor.getRole()) {
            case PLATFORM_ADMIN, ADMIN -> adminSummary(actor);
            case RESIDENT -> residentSummary(actor);
            case SECURITY -> securitySummary(actor);
            case VISITOR -> visitorSummary(actor);
            default -> emptySummary();
        };
    }

    private DashboardSummaryResponse adminSummary(User admin) {
        Society society = getAdminSociety(admin);
        if (society == null) {
            return emptySummary();
        }
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
        if (admin.getRole() == Role.PLATFORM_ADMIN) {
            return societyRepository.findAll().stream().findFirst().orElse(null);
        }
        return societyRepository
                .findByOwnerOrderByNameAsc(admin)
                .stream()
                .findFirst()
                .or(() -> societyRepository.findAll().stream().findFirst())
                .orElse(null);
    }

    private static void requireAuthenticated(User actor) {
        if (actor == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
    }

    public SocietyCommandCenterResponse getSocietyCommandCenter(User actor, Long buildingIdFilter, String timeRange) {
        requireAuthenticated(actor);
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Admin can access Society Command Center");
        }

        Society society = getAdminSociety(actor);
        if (society == null) {
            SocietyCommandCenterResponse.SocietyHeaderInfo emptyHeader = new SocietyCommandCenterResponse.SocietyHeaderInfo(
                    0L,
                    "No Society Provisioned Yet",
                    "No society has been provisioned or linked to this account yet.",
                    "—",
                    "—",
                    "—",
                    0,
                    0
            );
            SocietyCommandCenterResponse.KpiMetrics emptyKpis = new SocietyCommandCenterResponse.KpiMetrics(
                    0, 0L, 0L, 0L, 0L, 0L, 0L, 0.0,
                    0L, 0L, 0L, 0L, 0L, 0L, 0L, 0L, 0
            );
            SocietyCommandCenterResponse.VisitorAnalyticsSummary emptyVisitor = new SocietyCommandCenterResponse.VisitorAnalyticsSummary(
                    0L, List.of(), List.of(), List.of(), List.of()
            );
            SocietyCommandCenterResponse.ResidentAnalyticsSummary emptyResident = new SocietyCommandCenterResponse.ResidentAnalyticsSummary(
                    0, 0L, 0L, 0L, List.of(), List.of()
            );
            SocietyCommandCenterResponse.SecurityGateSummary emptyGate = new SocietyCommandCenterResponse.SecurityGateSummary(
                    0L, 0L, 0L, 0L, 0L, List.of(), List.of()
            );
            return new SocietyCommandCenterResponse(
                    emptyHeader,
                    emptyKpis,
                    List.of(),
                    List.of(),
                    emptyVisitor,
                    emptyResident,
                    emptyGate,
                    List.of(),
                    List.of()
            );
        }

        Long societyId = society.getId();

        // 1. Structure
        List<Building> allBuildings = buildingRepository.findBySocietyIdInOrderByNameAsc(List.of(societyId));
        List<Long> allBuildingIds = allBuildings.stream().map(Building::getId).toList();

        List<Floor> allFloors = allBuildingIds.isEmpty()
                ? List.of()
                : floorRepository.findByBuildingIdInOrderByNumberAsc(allBuildingIds);
        List<Long> allFloorIds = allFloors.stream().map(Floor::getId).toList();

        List<Flat> allFlats = allFloorIds.isEmpty()
                ? List.of()
                : flatRepository.findByFloorIdInOrderByNumberAsc(allFloorIds);

        // 2. Residents & Occupancy
        List<ResidentProfile> residents = residentProfileRepository.findByFlat_SocietyIdOrderByCreatedAtDesc(societyId);
        List<ResidentProfile> activeResidents = residents.stream()
                .filter(r -> r.getStatus() == ResidentStatus.ACTIVE)
                .toList();

        Map<Long, ResidentProfile> flatToResident = new HashMap<>();
        for (ResidentProfile r : activeResidents) {
            if (r.getFlat() != null) {
                flatToResident.put(r.getFlat().getId(), r);
            }
        }

        List<Flat> targetFlats = buildingIdFilter != null
                ? allFlats.stream().filter(f -> f.getFloor() != null && f.getFloor().getBuilding() != null && buildingIdFilter.equals(f.getFloor().getBuilding().getId())).toList()
                : allFlats;
        List<ResidentProfile> targetResidents = buildingIdFilter != null
                ? activeResidents.stream().filter(r -> r.getFlat() != null && r.getFlat().getFloor() != null && r.getFlat().getFloor().getBuilding() != null && buildingIdFilter.equals(r.getFlat().getFloor().getBuilding().getId())).toList()
                : activeResidents;

        long totalFlats = targetFlats.size();
        long occupiedFlats = targetFlats.stream().filter(f -> flatToResident.containsKey(f.getId())).count();
        long availableFlats = Math.max(0, totalFlats - occupiedFlats);
        double occupancyPercentage = totalFlats > 0
                ? Math.round(((double) occupiedFlats / totalFlats) * 1000.0) / 10.0
                : 0.0;

        long ownerCount = targetResidents.stream()
                .filter(r -> r.getResidentType() == ResidentType.OWNER)
                .count();
        long tenantCount = targetResidents.stream()
                .filter(r -> r.getResidentType() == ResidentType.TENANT)
                .count();
        long familyMemberCount = targetResidents.stream()
                .mapToLong(r -> r.getFamilyMemberCount() != null ? r.getFamilyMemberCount() : 1)
                .sum();


        // 3. Onboarding & Allocations
        List<ResidentOnboardingRequest> onboardingRequests = residentOnboardingRepository.findBySocietyIdOrderByCreatedAtDesc(societyId);
        long pendingOnboarding = onboardingRequests.stream()
                .filter(r -> r.getStatus() == OnboardingStatus.SUBMITTED || r.getStatus() == OnboardingStatus.UNDER_ADMIN_REVIEW)
                .count();
        long pendingAllocations = pendingOnboarding;

        // 4. Visitors
        List<VisitRequest> allVisits = visitRequestRepository.findBySocietyIdOrderByCreatedAtDesc(societyId);
        LocalDate today = LocalDate.now();

        long todayVisitors = allVisits.stream()
                .filter(v -> v.getExpectedDate() != null && v.getExpectedDate().equals(today))
                .count();
        long waitingAtGate = allVisits.stream()
                .filter(v -> v.getVisitStatus() == VisitStatus.WAITING_AT_GATE)
                .count();
        long currentlyInside = allVisits.stream()
                .filter(v -> v.getVisitStatus() == VisitStatus.CHECKED_IN)
                .count();
        long checkedOutToday = allVisits.stream()
                .filter(v -> v.getVisitStatus() == VisitStatus.CHECKED_OUT && (v.getExpectedDate() == null || v.getExpectedDate().equals(today)))
                .count();
        long pendingVisitorApprovals = allVisits.stream()
                .filter(v -> v.getRequestStatus() == VisitRequestStatus.PENDING_RESIDENT || v.getRequestStatus() == VisitRequestStatus.PENDING_SECURITY)
                .count();

        // 5. Security Staff
        List<SecurityStaffProfile> securityStaff = securityStaffProfileRepository.findBySocietyId(societyId);
        long activeGuards = securityStaff.stream().filter(s -> s.getStatus() == SecurityStaffStatus.ACTIVE).count();

        // 6. Announcements
        List<Announcement> announcements = announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc();
        List<Announcement> activeAnnouncements = announcements.stream()
                .filter(Announcement::isActive)
                .filter(a -> a.getSocietyId() == null || a.getSocietyId().equals(societyId))
                .toList();

        // Header Info
        SocietyCommandCenterResponse.SocietyHeaderInfo headerInfo = new SocietyCommandCenterResponse.SocietyHeaderInfo(
                society.getId(),
                society.getName(),
                society.getAddress(),
                society.getCity(),
                society.getState(),
                society.getPostalCode(),
                allBuildings.size(),
                allFloors.size()
        );

        // KPIs
        SocietyCommandCenterResponse.KpiMetrics kpis = new SocietyCommandCenterResponse.KpiMetrics(
                activeResidents.size(),
                ownerCount,
                tenantCount,
                familyMemberCount,
                totalFlats,
                occupiedFlats,
                availableFlats,
                occupancyPercentage,
                todayVisitors,
                currentlyInside,
                waitingAtGate,
                checkedOutToday,
                pendingOnboarding,
                pendingAllocations,
                pendingVisitorApprovals,
                activeGuards,
                activeAnnouncements.size()
        );

        // Action Required Items
        List<SocietyCommandCenterResponse.ActionRequiredItem> actionRequired = new ArrayList<>();
        if (pendingOnboarding > 0) {
            actionRequired.add(new SocietyCommandCenterResponse.ActionRequiredItem(
                    "act-onboarding",
                    "ONBOARDING",
                    pendingOnboarding + " Resident Onboarding Request" + (pendingOnboarding > 1 ? "s" : ""),
                    "New residents have submitted details and are waiting for apartment allocation review.",
                    pendingOnboarding,
                    "WARNING",
                    "/admin/residents",
                    "Review & Allocate"
            ));
        }
        if (waitingAtGate > 0) {
            actionRequired.add(new SocietyCommandCenterResponse.ActionRequiredItem(
                    "act-gate",
                    "GATE_WAITING",
                    waitingAtGate + " Visitor" + (waitingAtGate > 1 ? "s" : "") + " Waiting at Gate",
                    "Visitors are currently at the security gate awaiting clearance or resident approval.",
                    waitingAtGate,
                    "CRITICAL",
                    "/admin/visitors",
                    "View Gate Desk"
            ));
        }
        if (pendingVisitorApprovals > 0) {
            actionRequired.add(new SocietyCommandCenterResponse.ActionRequiredItem(
                    "act-approvals",
                    "VISITOR_APPROVAL",
                    pendingVisitorApprovals + " Pending Visit Request" + (pendingVisitorApprovals > 1 ? "s" : ""),
                    "Visit requests currently awaiting resident authorization or security confirmation.",
                    pendingVisitorApprovals,
                    "INFO",
                    "/admin/visitors",
                    "View Requests"
            ));
        }

        // Occupancy Building -> Floor -> Flat Tree
        List<SocietyCommandCenterResponse.BuildingOccupancySummary> occupancyTree = new ArrayList<>();
        for (Building b : allBuildings) {
            if (buildingIdFilter != null && !b.getId().equals(buildingIdFilter)) {
                continue;
            }
            List<Floor> bFloors = allFloors.stream().filter(f -> f.getBuilding().getId().equals(b.getId())).toList();
            List<SocietyCommandCenterResponse.FloorOccupancySummary> floorSummaries = new ArrayList<>();
            int bTotal = 0;
            int bOccupied = 0;

            for (Floor fl : bFloors) {
                List<Flat> flFlats = allFlats.stream().filter(flat -> flat.getFloor().getId().equals(fl.getId())).toList();
                List<SocietyCommandCenterResponse.FlatItemSummary> flatSummaries = new ArrayList<>();
                int flOccupied = 0;

                for (Flat flat : flFlats) {
                    ResidentProfile res = flatToResident.get(flat.getId());
                    boolean isOcc = (res != null);
                    if (isOcc) flOccupied++;
                    flatSummaries.add(new SocietyCommandCenterResponse.FlatItemSummary(
                            flat.getId(),
                            flat.getNumber(),
                            isOcc,
                            res != null ? res.getUser().getFullName() : null,
                            res != null && res.getResidentType() != null ? res.getResidentType().name() : null,
                            res != null ? res.getFlatType() : null,
                            res != null ? res.getParkingSlot() : null,
                            flat.getStatus() != null ? flat.getStatus().name() : "ACTIVE"
                    ));
                }
                bTotal += flFlats.size();
                bOccupied += flOccupied;
                floorSummaries.add(new SocietyCommandCenterResponse.FloorOccupancySummary(
                        fl.getId(),
                        fl.getNumber(),
                        flFlats.size(),
                        flOccupied,
                        Math.max(0, flFlats.size() - flOccupied),
                        flatSummaries
                ));
            }

            double bPct = bTotal > 0 ? Math.round(((double) bOccupied / bTotal) * 1000.0) / 10.0 : 0.0;
            occupancyTree.add(new SocietyCommandCenterResponse.BuildingOccupancySummary(
                    b.getId(),
                    b.getName(),
                    bTotal,
                    bOccupied,
                    Math.max(0, bTotal - bOccupied),
                    bPct,
                    floorSummaries
            ));
        }

        // Visitor Analytics (Categories, 7-Day Trend, Building Breakdown, Recent Visits)
        LocalDate rangeStart = switch (timeRange != null ? timeRange.toUpperCase() : "WEEK") {
            case "TODAY" -> today;
            case "MONTH" -> today.minusDays(30);
            default -> today.minusDays(6);
        };
        List<VisitRequest> rangeVisits = allVisits.stream()
                .filter(v -> v.getExpectedDate() != null && !v.getExpectedDate().isBefore(rangeStart))
                .toList();

        Map<VisitorType, Long> catCounts = new HashMap<>();
        for (VisitRequest vr : rangeVisits) {
            VisitorType vt = vr.getVisitor() != null && vr.getVisitor().getVisitorType() != null
                    ? vr.getVisitor().getVisitorType()
                    : VisitorType.OTHER;
            catCounts.put(vt, catCounts.getOrDefault(vt, 0L) + 1);
        }

        List<SocietyCommandCenterResponse.VisitorCategoryCount> catBreakdown = new ArrayList<>();
        long totalRangeVisits = rangeVisits.size();
        for (VisitorType vt : VisitorType.values()) {
            long count = catCounts.getOrDefault(vt, 0L);
            double pct = totalRangeVisits > 0 ? Math.round(((double) count / totalRangeVisits) * 1000.0) / 10.0 : 0.0;
            catBreakdown.add(new SocietyCommandCenterResponse.VisitorCategoryCount(
                    vt.name(),
                    formatVisitorTypeLabel(vt),
                    count,
                    pct
            ));
        }
        catBreakdown.sort((a, b) -> Long.compare(b.count(), a.count()));

        // 7-day trend
        List<SocietyCommandCenterResponse.DailyVisitorTrend> trend7Days = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long totalOnDay = allVisits.stream().filter(v -> d.equals(v.getExpectedDate())).count();
            long checkedInOnDay = allVisits.stream().filter(v -> d.equals(v.getExpectedDate()) && (v.getVisitStatus() == VisitStatus.CHECKED_IN || v.getVisitStatus() == VisitStatus.CHECKED_OUT)).count();
            long checkedOutOnDay = allVisits.stream().filter(v -> d.equals(v.getExpectedDate()) && v.getVisitStatus() == VisitStatus.CHECKED_OUT).count();
            String dayLabel = d.getDayOfWeek().name().substring(0, 3);
            trend7Days.add(new SocietyCommandCenterResponse.DailyVisitorTrend(d, dayLabel, totalOnDay, checkedInOnDay, checkedOutOnDay));
        }

        // Visits per building
        Map<String, Long> bVisits = new HashMap<>();
        for (VisitRequest vr : allVisits) {
            if (vr.getFlat() != null && vr.getFlat().getFloor() != null && vr.getFlat().getFloor().getBuilding() != null) {
                String bName = vr.getFlat().getFloor().getBuilding().getName();
                bVisits.put(bName, bVisits.getOrDefault(bName, 0L) + 1);
            }
        }
        List<SocietyCommandCenterResponse.BuildingVisitorCount> buildingVisitCounts = new ArrayList<>();
        for (Building b : allBuildings) {
            buildingVisitCounts.add(new SocietyCommandCenterResponse.BuildingVisitorCount(
                    b.getId(),
                    b.getName(),
                    bVisits.getOrDefault(b.getName(), 0L)
            ));
        }

        // Recent visits list
        List<SocietyCommandCenterResponse.RecentVisitItem> recentVisits = allVisits.stream()
                .limit(8)
                .map(vr -> new SocietyCommandCenterResponse.RecentVisitItem(
                        vr.getId(),
                        vr.getVisitor() != null ? vr.getVisitor().getFullName() : "Visitor",
                        vr.getVisitor() != null && vr.getVisitor().getVisitorType() != null ? vr.getVisitor().getVisitorType().name() : "OTHER",
                        vr.getFlat() != null ? vr.getFlat().getNumber() : "—",
                        vr.getFlat() != null && vr.getFlat().getFloor() != null && vr.getFlat().getFloor().getBuilding() != null ? vr.getFlat().getFloor().getBuilding().getName() : "—",
                        vr.getVisitStatus() != null ? vr.getVisitStatus().name() : "SCHEDULED",
                        vr.getExpectedDate(),
                        vr.getExpectedTime() != null ? vr.getExpectedTime().toString() : null,
                        vr.getPurpose(),
                        vr.getVisitor() != null ? vr.getVisitor().getPhotoUrl() : null,
                        vr.getCreatedAt()
                ))
                .toList();

        SocietyCommandCenterResponse.VisitorAnalyticsSummary visitorAnalytics = new SocietyCommandCenterResponse.VisitorAnalyticsSummary(
                totalRangeVisits,
                catBreakdown,
                trend7Days,
                buildingVisitCounts,
                recentVisits
        );

        // Resident Analytics (Building Breakdown, Recent Residents)
        List<SocietyCommandCenterResponse.BuildingResidentCount> bResCounts = new ArrayList<>();
        for (Building b : allBuildings) {
            List<ResidentProfile> bResidents = activeResidents.stream()
                    .filter(r -> r.getFlat() != null && r.getFlat().getFloor() != null && r.getFlat().getFloor().getBuilding().getId().equals(b.getId()))
                    .toList();
            long bOwners = bResidents.stream().filter(r -> r.getResidentType() == ResidentType.OWNER).count();
            long bTenants = bResidents.stream().filter(r -> r.getResidentType() == ResidentType.TENANT).count();
            bResCounts.add(new SocietyCommandCenterResponse.BuildingResidentCount(
                    b.getId(),
                    b.getName(),
                    bResidents.size(),
                    bOwners,
                    bTenants
            ));
        }

        List<SocietyCommandCenterResponse.RecentResidentItem> recentResidents = activeResidents.stream()
                .limit(8)
                .map(r -> new SocietyCommandCenterResponse.RecentResidentItem(
                        r.getId(),
                        r.getUser().getFullName(),
                        r.getResidentType() != null ? r.getResidentType().name() : "OWNER",
                        r.getFlat() != null ? r.getFlat().getNumber() : "—",
                        r.getFlat() != null && r.getFlat().getFloor() != null && r.getFlat().getFloor().getBuilding() != null ? r.getFlat().getFloor().getBuilding().getName() : "—",
                        r.getFlatType(),
                        r.getParkingSlot(),
                        r.getAllocatedAt() != null ? r.getAllocatedAt() : r.getCreatedAt()
                ))
                .toList();

        SocietyCommandCenterResponse.ResidentAnalyticsSummary residentAnalytics = new SocietyCommandCenterResponse.ResidentAnalyticsSummary(
                activeResidents.size(),
                ownerCount,
                tenantCount,
                familyMemberCount,
                bResCounts,
                recentResidents
        );

        // Security Gate Summary
        List<SocietyCommandCenterResponse.SecurityStaffItem> staffItems = securityStaff.stream()
                .filter(s -> s.getStatus() == SecurityStaffStatus.ACTIVE)
                .map(s -> new SocietyCommandCenterResponse.SecurityStaffItem(
                        s.getId(),
                        s.getUser().getFullName(),
                        s.getUser().getUsername(),
                        s.getUser().getMobileNumber(),
                        s.getStatus().name()
                ))
                .toList();

        List<SocietyCommandCenterResponse.RecentGateActivityItem> recentGateActivity = allVisits.stream()
                .filter(vr -> vr.getVisitStatus() == VisitStatus.CHECKED_IN || vr.getVisitStatus() == VisitStatus.CHECKED_OUT || vr.getVisitStatus() == VisitStatus.WAITING_AT_GATE)
                .limit(8)
                .map(vr -> new SocietyCommandCenterResponse.RecentGateActivityItem(
                        vr.getId(),
                        vr.getVisitor() != null ? vr.getVisitor().getFullName() : "Visitor",
                        vr.getFlat() != null ? vr.getFlat().getNumber() : "—",
                        vr.getFlat() != null && vr.getFlat().getFloor() != null && vr.getFlat().getFloor().getBuilding() != null ? vr.getFlat().getFloor().getBuilding().getName() : "—",
                        vr.getVisitStatus().name(),
                        vr.getUpdatedAt() != null ? vr.getUpdatedAt() : vr.getCreatedAt()
                ))
                .toList();

        long approvedWaiting = allVisits.stream()
                .filter(vr -> vr.getVisitStatus() == VisitStatus.WAITING_AT_GATE && vr.getRequestStatus() == VisitRequestStatus.APPROVED_BY_RESIDENT)
                .count();

        SocietyCommandCenterResponse.SecurityGateSummary securityGate = new SocietyCommandCenterResponse.SecurityGateSummary(
                waitingAtGate,
                approvedWaiting,
                currentlyInside,
                checkedOutToday,
                0L,
                staffItems,
                recentGateActivity
        );

        // Upcoming Announcements
        List<SocietyCommandCenterResponse.AnnouncementSummary> upcomingAnnouncements = activeAnnouncements.stream()
                .limit(6)
                .map(a -> new SocietyCommandCenterResponse.AnnouncementSummary(
                        a.getId(),
                        a.getTitle(),
                        a.getMessage(),
                        a.getType() != null ? a.getType().name() : "GENERAL_NOTICE",
                        a.isPinned(),
                        a.getCreatedAt(),
                        a.getExpiresAt()
                ))
                .toList();

        // Recent Audit Activity
        List<AuditLog> auditLogs = auditLogRepository.findBySocietyIdOrderByCreatedAtDesc(societyId, PageRequest.of(0, 10));
        Map<Long, String> userNameCache = new HashMap<>();
        List<SocietyCommandCenterResponse.RecentActivityItem> activityItems = auditLogs.stream()
                .map(log -> {
                    String actorName = userNameCache.computeIfAbsent(log.getActorUserId(), uid ->
                            userRepository.findById(uid).map(User::getFullName).orElse("User #" + uid));
                    return new SocietyCommandCenterResponse.RecentActivityItem(
                            log.getId(),
                            log.getAction().name(),
                            formatAuditActionLabel(log.getAction().name()),
                            log.getEntityType(),
                            log.getEntityId(),
                            log.getDescription(),
                            actorName,
                            "ADMIN",
                            log.getCreatedAt()
                    );
                })
                .toList();

        return new SocietyCommandCenterResponse(
                headerInfo,
                kpis,
                actionRequired,
                occupancyTree,
                visitorAnalytics,
                residentAnalytics,
                securityGate,
                upcomingAnnouncements,
                activityItems
        );
    }

    private static String formatVisitorTypeLabel(VisitorType vt) {
        if (vt == null) return "Other";
        return switch (vt) {
            case GUEST -> "Guest";
            case DELIVERY -> "Delivery";
            case COURIER -> "Courier";
            case CAB_AUTO -> "Cab / Auto";
            case DRIVER -> "Driver";
            case TECHNICIAN -> "Technician";
            case VENDOR_CONTRACTOR -> "Vendor / Contractor";
            case DOMESTIC_WORKER -> "Domestic Worker";
            case OTHER -> "Other";
        };
    }

    private static String formatAuditActionLabel(String action) {
        if (action == null) return "Activity";
        return action.replace('_', ' ').toLowerCase();
    }
}
