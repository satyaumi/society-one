package com.societyone.app.platform.service;

import com.societyone.app.audit.dto.AuditLogResponse;
import com.societyone.app.audit.entity.AuditLog;
import com.societyone.app.audit.repository.AuditLogRepository;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.platform.dto.PlatformKpiResponse;
import com.societyone.app.platform.dto.PlatformSocietyDirectoryItem;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.security.repository.SecurityStaffProfileRepository;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.entity.SocietyRequestStatus;
import com.societyone.app.society.entity.StructureStatus;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.FloorRepository;
import com.societyone.app.society.repository.SocietyCreationRequestRepository;
import com.societyone.app.society.repository.SocietyRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PlatformManagementService {

    private final SocietyRepository societyRepository;
    private final SocietyCreationRequestRepository requestRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final FlatRepository flatRepository;
    private final ResidentProfileRepository residentRepository;
    private final SecurityStaffProfileRepository securityRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public PlatformManagementService(
            SocietyRepository societyRepository,
            SocietyCreationRequestRepository requestRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository,
            ResidentProfileRepository residentRepository,
            SecurityStaffProfileRepository securityRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.societyRepository = societyRepository;
        this.requestRepository = requestRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.flatRepository = flatRepository;
        this.residentRepository = residentRepository;
        this.securityRepository = securityRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public PlatformKpiResponse getPlatformKpis(User actor) {
        requirePlatformAdmin(actor);

        long totalSocieties = societyRepository.count();
        long activeSocieties = societyRepository.countByStatus(StructureStatus.ACTIVE);
        long pendingRequests = requestRepository.countByStatus(SocietyRequestStatus.SUBMITTED);
        long underReviewRequests = requestRepository.countByStatus(SocietyRequestStatus.UNDER_REVIEW);
        long approvedRequests = requestRepository.countByStatus(SocietyRequestStatus.SOCIETY_CREATED)
                + requestRepository.countByStatus(SocietyRequestStatus.APPROVED)
                + requestRepository.countByStatus(SocietyRequestStatus.ADMIN_ASSIGNED);

        long totalSocietyAdmins = userRepository.countByRole(Role.ADMIN);
        long totalResidents = residentRepository.count();
        long totalFlats = flatRepository.count();
        long totalSecurityStaff = securityRepository.count();

        return new PlatformKpiResponse(
                totalSocieties,
                activeSocieties,
                pendingRequests,
                underReviewRequests,
                approvedRequests,
                totalSocietyAdmins,
                totalResidents,
                totalFlats,
                totalSecurityStaff
        );
    }

    public List<PlatformSocietyDirectoryItem> getSocietyDirectory(User actor) {
        requirePlatformAdmin(actor);

        List<Society> societies = societyRepository.findAll();
        List<PlatformSocietyDirectoryItem> result = new ArrayList<>();

        for (Society s : societies) {
            User admin = s.getOwner();
            long buildingCount = buildingRepository.findBySocietyIdInOrderByNameAsc(List.of(s.getId())).size();
            long flatCount = flatRepository.countBySocietyId(s.getId());
            long residentCount = residentRepository.countByFlat_SocietyId(s.getId());
            long securityCount = securityRepository.countBySocietyId(s.getId());

            result.add(new PlatformSocietyDirectoryItem(
                    s.getId(),
                    s.getName(),
                    s.getAddress(),
                    s.getCity(),
                    s.getState(),
                    s.getPostalCode(),
                    s.getContactPhone(),
                    s.getContactEmail(),
                    s.getStatus().name(),
                    admin != null ? admin.getId() : null,
                    admin != null ? admin.getFullName() : "Unassigned",
                    admin != null ? admin.getEmail() : null,
                    admin != null ? admin.getMobileNumber() : null,
                    buildingCount,
                    0,
                    flatCount,
                    residentCount,
                    securityCount,
                    s.getCreatedAt() != null ? s.getCreatedAt().toString() : null,
                    s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null
            ));
        }

        return result;
    }

    public List<AuditLogResponse> getPlatformAudit(User actor, int limit) {
        requirePlatformAdmin(actor);
        int pageLimit = Math.min(Math.max(limit, 10), 100);
        List<AuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, pageLimit));
        return logs.stream().map(log -> {
            String actorUsername = null;
            if (log.getActorUserId() != null) {
                actorUsername = userRepository.findById(log.getActorUserId())
                        .map(User::getUsername).orElse(null);
            }
            return new AuditLogResponse(
                    log.getId(),
                    log.getActorUserId(),
                    actorUsername,
                    log.getSocietyId(),
                    log.getAction(),
                    log.getEntityType(),
                    log.getEntityId(),
                    log.getDescription(),
                    log.getCreatedAt()
            );
        }).toList();
    }

    private void requirePlatformAdmin(User actor) {
        if (actor.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Platform Management access required");
        }
    }
}
