package com.societyone.app.platform.service;

import com.societyone.app.audit.dto.AuditLogResponse;
import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.entity.AuditLog;
import com.societyone.app.audit.repository.AuditLogRepository;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.email.EmailService;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.service.NotificationService;
import com.societyone.app.platform.dto.*;
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
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    public PlatformManagementService(
            SocietyRepository societyRepository,
            SocietyCreationRequestRepository requestRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository,
            ResidentProfileRepository residentRepository,
            SecurityStaffProfileRepository securityRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            EmailService emailService,
            NotificationService notificationService,
            PasswordEncoder passwordEncoder
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
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.passwordEncoder = passwordEncoder;
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

    @Transactional
    public void sendDirectMessageToAdmin(User actor, PlatformDirectMessageRequest request) {
        requirePlatformAdmin(actor);

        Society society = societyRepository.findById(request.societyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Society not found"));

        User targetAdmin = society.getOwner();
        if (targetAdmin == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Society has no assigned administrator");
        }

        // 1. Create in-app system notification
        notificationService.send(
                targetAdmin.getId(),
                society.getId(),
                NotificationType.SYSTEM,
                "[" + request.safeCategory().replace('_', ' ') + "] " + request.subject().trim(),
                request.message().trim(),
                null
        );

        // 2. Dispatch email if requested
        if (request.isSendEmail() && targetAdmin.getEmail() != null && !targetAdmin.getEmail().isBlank()) {
            try {
                emailService.sendGeneralNotificationEmail(
                        targetAdmin.getEmail(),
                        targetAdmin.getFullName(),
                        "[" + request.safeCategory().replace('_', ' ') + "] " + request.subject().trim(),
                        request.safeCategory(),
                        "#2563eb",
                        "<strong>Official Message from Platform Management:</strong><br><br>" +
                                "<div style='background-color:#f1f5f9;padding:14px;border-left:4px solid #2563eb;border-radius:6px;font-size:14px;color:#1e293b;line-height:1.6;'>" +
                                request.message().trim().replace("\n", "<br>") +
                                "</div><br>" +
                                "<strong>Target Society:</strong> " + society.getName() + " (#" + society.getId() + ")<br>" +
                                "<strong>Platform Sender:</strong> " + actor.getFullName() + " (" + actor.getUsername() + ")",
                        "Category",
                        request.safeCategory().replace('_', ' ')
                );
            } catch (Exception ignored) {
            }
        }

        // 3. Audit log
        auditLogRepository.save(new AuditLog(
                actor.getId(),
                society.getId(),
                AuditAction.PLATFORM_MESSAGE_SENT,
                "SOCIETY",
                society.getId(),
                "Sent " + request.safeCategory() + " message to admin of " + society.getName() + ": " + request.subject()
        ));
    }

    @Transactional
    public AdminCredentialsDispatchResponse dispatchAdminCredentials(User actor, Long societyId, DispatchCredentialsRequest request) {
        requirePlatformAdmin(actor);

        Society society = societyRepository.findById(societyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Society not found"));

        User targetAdmin = society.getOwner();
        if (targetAdmin == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Society has no assigned administrator");
        }

        String rawPassword = null;
        if (request != null && request.newPassword() != null && !request.newPassword().isBlank()) {
            rawPassword = request.newPassword().trim();
            targetAdmin.setPasswordHash(passwordEncoder.encode(rawPassword));
            userRepository.save(targetAdmin);
        }

        boolean emailSent = false;
        if (targetAdmin.getEmail() != null && !targetAdmin.getEmail().isBlank()) {
            try {
                String pwdNotice = rawPassword != null
                        ? "<strong>Temporary Password:</strong> <code style='background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:14px;font-weight:bold;'>" + rawPassword + "</code><br><small style='color:#64748b;'>Please change your password upon your first login in Account Settings.</small><br><br>"
                        : "<strong>Password:</strong> Use your existing login password (or use 'Forgot password' on the login screen if needed).<br><br>";

                emailService.sendGeneralNotificationEmail(
                        targetAdmin.getEmail(),
                        targetAdmin.getFullName(),
                        "Your Society Admin Credentials — SocietyOne (" + society.getName() + ")",
                        "ADMIN ACCESS",
                        "#10b981",
                        "Hello " + targetAdmin.getFullName() + ",<br><br>" +
                                "Platform Management has verified and granted administrative access for <strong>" + society.getName() + "</strong>.<br><br>" +
                                "<strong>Portal Login URL:</strong> <a href='https://society-one-portal.onrender.com/login'>https://society-one-portal.onrender.com/login</a><br>" +
                                "<strong>Username:</strong> " + targetAdmin.getUsername() + "<br>" +
                                "<strong>Email:</strong> " + targetAdmin.getEmail() + "<br>" +
                                "<strong>Account Role:</strong> Society Admin (Sub-Admin)<br>" +
                                "<strong>Managed Society:</strong> " + society.getName() + " (#" + society.getId() + ")<br><br>" +
                                pwdNotice +
                                "You can now log in to manage apartments, approve residents, supervise security staff, and view visitor logs.",
                        "Society",
                        society.getName()
                );
                emailSent = true;
            } catch (Exception ignored) {
                emailSent = false;
            }
        }

        auditLogRepository.save(new AuditLog(
                actor.getId(),
                society.getId(),
                AuditAction.ADMIN_CREDENTIALS_DISPATCHED,
                "USER",
                targetAdmin.getId(),
                "Dispatched login credentials to Society Admin " + targetAdmin.getFullName() + " (" + targetAdmin.getUsername() + ")"
        ));

        return new AdminCredentialsDispatchResponse(
                society.getId(),
                society.getName(),
                targetAdmin.getId(),
                targetAdmin.getFullName(),
                targetAdmin.getUsername(),
                targetAdmin.getEmail(),
                emailSent,
                "Credentials successfully dispatched to " + targetAdmin.getEmail()
        );
    }

    private void requirePlatformAdmin(User actor) {
        if (actor.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Platform Management access required");
        }
    }
}
