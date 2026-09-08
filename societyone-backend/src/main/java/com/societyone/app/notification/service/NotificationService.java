package com.societyone.app.notification.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.notification.dto.*;
import com.societyone.app.notification.entity.*;
import com.societyone.app.notification.repository.AnnouncementRepository;
import com.societyone.app.notification.repository.NotificationRepository;
import com.societyone.app.notification.repository.UserAnnouncementStateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log =
            LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final AnnouncementRepository announcementRepository;
    private final UserAnnouncementStateRepository userAnnouncementStateRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            AnnouncementRepository announcementRepository,
            UserAnnouncementStateRepository userAnnouncementStateRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.announcementRepository = announcementRepository;
        this.userAnnouncementStateRepository = userAnnouncementStateRepository;
    }

    // =========================================================================
    // Visitor / Workflow Direct Notifications (Preserved for workflow events)
    // =========================================================================

    @Transactional
    public void send(
            Long recipientUserId,
            Long societyId,
            NotificationType type,
            String title,
            String message,
            Long visitRequestId
    ) {
        try {
            if (recipientUserId == null) {
                return;
            }

            if (type == null) {
                throw new IllegalArgumentException(
                        "Notification type is required"
                );
            }

            String safeTitle = title == null ? "" : title.trim();
            if (safeTitle.isEmpty()) {
                safeTitle = "Notification";
            }

            String safeMessage = message == null ? "" : message.trim();
            if (safeMessage.isEmpty()) {
                safeMessage = safeTitle;
            }

            Notification n = new Notification();
            n.setRecipientUserId(recipientUserId);
            n.setSocietyId(societyId);
            n.setType(type);
            n.setTitle(safeTitle);
            n.setMessage(safeMessage);
            n.setVisitRequestId(visitRequestId);
            notificationRepository.save(n);
        } catch (Exception ex) {
            log.error(
                    "Notification send failed (recipient={}, type={}): {}",
                    recipientUserId,
                    type,
                    ex.getMessage()
            );
        }
    }

    // =========================================================================
    // Announcement Management (Admin only)
    // =========================================================================

    @Transactional
    public AnnouncementResponse createAnnouncement(User admin, CreateAnnouncementRequest request) {
        requireAdmin(admin);

        Announcement a = new Announcement();
        a.setTitle(request.title().trim());
        a.setMessage(request.message().trim());
        a.setType(request.type());
        a.setAudience(request.audience());
        a.setCreatedByUserId(admin.getId());
        a.setSocietyId(request.societyId());
        a.setEventDate(request.eventDate());
        a.setEventTime(request.eventTime() != null ? request.eventTime().trim() : null);
        a.setPurpose(request.purpose() != null ? request.purpose().trim() : null);
        a.setImageUrl(request.imageUrl() != null && !request.imageUrl().isBlank() ? request.imageUrl().trim() : null);
        a.setExpiresAt(request.expiresAt());
        a.setActive(request.isActiveDefault());
        a.setPinned(request.isPinnedDefault());

        Announcement saved = announcementRepository.save(a);
        log.info("[Announcement] Created announcement id={} title='{}' audience={}", saved.getId(), saved.getTitle(), saved.getAudience());
        return AnnouncementResponse.from(saved, false, false, 0L);
    }

    @Transactional
    public AnnouncementResponse updateAnnouncement(User admin, Long id, UpdateAnnouncementRequest request) {
        requireAdmin(admin);

        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));

        if (request.title() != null && !request.title().isBlank()) {
            a.setTitle(request.title().trim());
        }
        if (request.message() != null && !request.message().isBlank()) {
            a.setMessage(request.message().trim());
        }
        if (request.type() != null) {
            a.setType(request.type());
        }
        if (request.audience() != null) {
            a.setAudience(request.audience());
        }
        if (request.eventDate() != null) {
            a.setEventDate(request.eventDate());
        }
        if (request.eventTime() != null) {
            a.setEventTime(request.eventTime().trim());
        }
        if (request.purpose() != null) {
            a.setPurpose(request.purpose().trim());
        }
        if (request.imageUrl() != null) {
            a.setImageUrl(request.imageUrl().isBlank() ? null : request.imageUrl().trim());
        }
        if (request.expiresAt() != null) {
            a.setExpiresAt(request.expiresAt());
        }
        if (request.active() != null) {
            a.setActive(request.active());
        }
        if (request.pinned() != null) {
            a.setPinned(request.pinned());
        }

        Announcement saved = announcementRepository.save(a);
        long reads = userAnnouncementStateRepository.countReadsByAnnouncementId(saved.getId());
        return AnnouncementResponse.from(saved, false, false, reads);
    }

    @Transactional
    public AnnouncementResponse toggleActive(User admin, Long id) {
        requireAdmin(admin);

        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));

        a.setActive(!a.isActive());
        Announcement saved = announcementRepository.save(a);
        long reads = userAnnouncementStateRepository.countReadsByAnnouncementId(saved.getId());
        return AnnouncementResponse.from(saved, false, false, reads);
    }

    @Transactional
    public void deleteAnnouncement(User admin, Long id) {
        requireAdmin(admin);

        if (!announcementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found");
        }
        userAnnouncementStateRepository.deleteByAnnouncementId(id);
        announcementRepository.deleteById(id);
        log.info("[Announcement] Deleted announcement id={}", id);
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listAllForAdmin(User admin) {
        requireAdmin(admin);

        List<Announcement> list = announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc();
        return list.stream().map(a -> {
            long reads = userAnnouncementStateRepository.countReadsByAnnouncementId(a.getId());
            return AnnouncementResponse.from(a, false, false, reads);
        }).toList();
    }

    // =========================================================================
    // Public Announcement Feed (Outside Society / Landing Page)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listPublicAnnouncements() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Announcement> list = announcementRepository.findActiveByAudience(AnnouncementAudience.PUBLIC, now);
        return list.stream()
                .map(a -> AnnouncementResponse.from(a, false, false, null))
                .toList();
    }

    // =========================================================================
    // Role-Filtered Dashboard Floating Strip Announcements
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listActiveAnnouncementsForDashboard(User user) {
        requireAuthenticated(user);

        Set<AnnouncementAudience> allowedAudiences = getAudiencesForRole(user.getRole());
        OffsetDateTime now = OffsetDateTime.now();

        List<Announcement> activeAnnouncements = announcementRepository.findActiveByAudiences(allowedAudiences, now);
        if (activeAnnouncements.isEmpty()) {
            return List.of();
        }

        List<Long> ids = activeAnnouncements.stream().map(Announcement::getId).toList();
        Map<Long, UserAnnouncementState> states = userAnnouncementStateRepository
                .findByUserIdAndAnnouncementIdIn(user.getId(), ids)
                .stream()
                .collect(Collectors.toMap(UserAnnouncementState::getAnnouncementId, s -> s));

        return activeAnnouncements.stream()
                .filter(a -> {
                    UserAnnouncementState state = states.get(a.getId());
                    return state == null || state.getDismissedAt() == null;
                })
                .map(a -> {
                    UserAnnouncementState state = states.get(a.getId());
                    boolean read = state != null && state.getReadAt() != null;
                    return AnnouncementResponse.from(a, read, false, null);
                })
                .toList();
    }

    @Transactional
    public void dismissAnnouncement(User user, Long announcementId) {
        requireAuthenticated(user);

        Announcement a = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));

        ensureAudienceAccess(user, a.getAudience());

        UserAnnouncementState state = userAnnouncementStateRepository
                .findByUserIdAndAnnouncementId(user.getId(), announcementId)
                .orElseGet(() -> {
                    UserAnnouncementState s = new UserAnnouncementState();
                    s.setUserId(user.getId());
                    s.setAnnouncementId(announcementId);
                    return s;
                });

        state.setDismissedAt(OffsetDateTime.now());
        userAnnouncementStateRepository.save(state);
    }

    // =========================================================================
    // Unified Notification Feed (Bell Icon + Notification Page)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<UnifiedNotificationResponse> listForUser(User user) {
        requireAuthenticated(user);

        List<UnifiedNotificationResponse> unifiedList = new ArrayList<>();

        // 1. Role-authorized announcements (shows full announcement history for this user)
        Set<AnnouncementAudience> allowedAudiences = getAudiencesForRole(user.getRole());
        List<Announcement> announcements = user.getRole() == Role.ADMIN
                ? announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc()
                : announcementRepository.findByAudiences(allowedAudiences);

        if (!announcements.isEmpty()) {
            List<Long> annIds = announcements.stream().map(Announcement::getId).toList();
            Map<Long, UserAnnouncementState> states = userAnnouncementStateRepository
                    .findByUserIdAndAnnouncementIdIn(user.getId(), annIds)
                    .stream()
                    .collect(Collectors.toMap(UserAnnouncementState::getAnnouncementId, s -> s));

            for (Announcement a : announcements) {
                UserAnnouncementState s = states.get(a.getId());
                boolean read = s != null && s.getReadAt() != null;
                unifiedList.add(new UnifiedNotificationResponse(
                        "ann_" + a.getId(),
                        a.getId(),
                        "ANNOUNCEMENT",
                        a.getType().name(),
                        a.getTitle(),
                        a.getMessage(),
                        a.getAudience().name(),
                        a.getEventDate() != null ? a.getEventDate().toString() : null,
                        a.getEventTime(),
                        a.getPurpose(),
                        a.getImageUrl(),
                        read,
                        a.isPinned(),
                        null,
                        a.getCreatedAt(),
                        a.getExpiresAt()
                ));
            }
        }

        // 2. Personal workflow notifications from notifications table
        List<Notification> personalNotifications =
                notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(user.getId());

        for (Notification n : personalNotifications) {
            unifiedList.add(new UnifiedNotificationResponse(
                    "notif_" + n.getId(),
                    n.getId(),
                    "WORKFLOW",
                    n.getType().name(),
                    n.getTitle(),
                    n.getMessage(),
                    "PERSONAL",
                    null,
                    null,
                    null,
                    n.isReadFlag(),
                    false,
                    n.getVisitRequestId(),
                    n.getCreatedAt(),
                    null
            ));
        }

        // Sort: pinned items first, then descending by createdAt
        unifiedList.sort((o1, o2) -> {
            if (o1.pinned() != o2.pinned()) {
                return o1.pinned() ? -1 : 1;
            }
            return o2.createdAt().compareTo(o1.createdAt());
        });

        return unifiedList;
    }

    @Transactional
    public void markRead(User user, String notificationId) {
        requireAuthenticated(user);

        if (notificationId == null || notificationId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification ID is required");
        }

        String idStr = notificationId.trim();

        if (idStr.startsWith("ann_")) {
            Long rawId = Long.parseLong(idStr.substring(4));
            markAnnouncementRead(user, rawId);
            return;
        }

        if (idStr.startsWith("notif_")) {
            Long rawId = Long.parseLong(idStr.substring(6));
            markPersonalNotificationRead(user, rawId);
            return;
        }

        // Numeric ID fallback: check announcement first, then personal
        try {
            Long rawId = Long.parseLong(idStr);
            if (announcementRepository.existsById(rawId)) {
                markAnnouncementRead(user, rawId);
            } else {
                markPersonalNotificationRead(user, rawId);
            }
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid notification ID format");
        }
    }

    @Transactional
    public int markAllRead(User user) {
        requireAuthenticated(user);

        int updatedCount = 0;

        // 1. Mark personal workflow notifications read
        List<Notification> unreadPersonal =
                notificationRepository.findByRecipientUserIdAndReadFlagFalseOrderByCreatedAtDesc(user.getId());

        for (Notification n : unreadPersonal) {
            n.setReadFlag(true);
            updatedCount++;
        }
        if (!unreadPersonal.isEmpty()) {
            notificationRepository.saveAll(unreadPersonal);
        }

        // 2. Mark visible announcements read
        Set<AnnouncementAudience> allowedAudiences = getAudiencesForRole(user.getRole());
        List<Announcement> visibleAnnouncements = user.getRole() == Role.ADMIN
                ? announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc()
                : announcementRepository.findByAudiences(allowedAudiences);

        if (!visibleAnnouncements.isEmpty()) {
            List<Long> annIds = visibleAnnouncements.stream().map(Announcement::getId).toList();
            Map<Long, UserAnnouncementState> existingStates = userAnnouncementStateRepository
                    .findByUserIdAndAnnouncementIdIn(user.getId(), annIds)
                    .stream()
                    .collect(Collectors.toMap(UserAnnouncementState::getAnnouncementId, s -> s));

            List<UserAnnouncementState> toSave = new ArrayList<>();
            OffsetDateTime now = OffsetDateTime.now();

            for (Long annId : annIds) {
                UserAnnouncementState s = existingStates.get(annId);
                if (s == null) {
                    s = new UserAnnouncementState();
                    s.setUserId(user.getId());
                    s.setAnnouncementId(annId);
                    s.setReadAt(now);
                    toSave.add(s);
                    updatedCount++;
                } else if (s.getReadAt() == null) {
                    s.setReadAt(now);
                    toSave.add(s);
                    updatedCount++;
                }
            }

            if (!toSave.isEmpty()) {
                userAnnouncementStateRepository.saveAll(toSave);
            }
        }

        return updatedCount;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private void markAnnouncementRead(User user, Long announcementId) {
        Announcement a = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));

        ensureAudienceAccess(user, a.getAudience());

        UserAnnouncementState state = userAnnouncementStateRepository
                .findByUserIdAndAnnouncementId(user.getId(), announcementId)
                .orElseGet(() -> {
                    UserAnnouncementState s = new UserAnnouncementState();
                    s.setUserId(user.getId());
                    s.setAnnouncementId(announcementId);
                    return s;
                });

        if (state.getReadAt() == null) {
            state.setReadAt(OffsetDateTime.now());
            userAnnouncementStateRepository.save(state);
        }
    }

    private void markPersonalNotificationRead(User user, Long notificationId) {
        Notification n = notificationRepository
                .findByIdAndRecipientUserId(notificationId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        n.setReadFlag(true);
        notificationRepository.save(n);
    }

    public Set<AnnouncementAudience> getAudiencesForRole(Role role) {
        if (role == null) {
            return Set.of(AnnouncementAudience.PUBLIC);
        }
        return switch (role) {
            case PLATFORM_ADMIN, ADMIN -> Set.of(
                    AnnouncementAudience.ALL_MEMBERS,
                    AnnouncementAudience.RESIDENTS,
                    AnnouncementAudience.SECURITY,
                    AnnouncementAudience.PUBLIC
            );
            case RESIDENT -> Set.of(
                    AnnouncementAudience.ALL_MEMBERS,
                    AnnouncementAudience.RESIDENTS,
                    AnnouncementAudience.PUBLIC
            );
            case SECURITY -> Set.of(
                    AnnouncementAudience.ALL_MEMBERS,
                    AnnouncementAudience.SECURITY,
                    AnnouncementAudience.PUBLIC
            );
            case VISITOR -> Set.of(
                    AnnouncementAudience.ALL_MEMBERS,
                    AnnouncementAudience.PUBLIC
            );
        };
    }

    private void ensureAudienceAccess(User user, AnnouncementAudience audience) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.PLATFORM_ADMIN) {
            return;
        }
        Set<AnnouncementAudience> allowed = getAudiencesForRole(user.getRole());
        if (audience == null || !allowed.contains(audience)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to view or interact with this notification"
            );
        }
    }

    private static void requireAuthenticated(User user) {
        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
    }

    private static void requireAdmin(User user) {
        requireAuthenticated(user);
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only administrators can perform this action"
            );
        }
    }
}
