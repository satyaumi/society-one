package com.societyone.app.notification.service;

import com.societyone.app.auth.entity.User;
import com.societyone.app.notification.dto.NotificationResponse;
import com.societyone.app.notification.entity.Notification;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class NotificationService {

    private static final Logger log =
            LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository
    ) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

    @Transactional(readOnly = true)
    public List<NotificationResponse> listForUser(User user) {
        requireAuthenticated(user);

        return notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(
                        user.getId()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NotificationResponse markRead(User user, Long notificationId) {
        requireAuthenticated(user);

        Notification n = notificationRepository
                .findByIdAndRecipientUserId(
                        notificationId,
                        user.getId()
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Notification not found"
                        )
                );

        n.setReadFlag(true);
        return toResponse(notificationRepository.save(n));
    }

    @Transactional
    public int markAllRead(User user) {
        requireAuthenticated(user);

        List<Notification> unread =
                notificationRepository
                        .findByRecipientUserIdAndReadFlagFalseOrderByCreatedAtDesc(
                                user.getId()
                        );

        for (Notification n : unread) {
            n.setReadFlag(true);
        }

        if (!unread.isEmpty()) {
            notificationRepository.saveAll(unread);
        }

        return unread.size();
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.isReadFlag(),
                n.getSocietyId(),
                n.getVisitRequestId(),
                n.getCreatedAt()
        );
    }

    private static void requireAuthenticated(User user) {
        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
    }
}
