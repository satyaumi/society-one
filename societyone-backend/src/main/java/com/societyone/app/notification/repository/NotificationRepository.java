package com.societyone.app.notification.repository;

import com.societyone.app.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(
            Long recipientUserId
    );

    List<Notification> findByRecipientUserIdAndReadFlagFalseOrderByCreatedAtDesc(
            Long recipientUserId
    );

    Optional<Notification> findByIdAndRecipientUserId(
            Long id,
            Long recipientUserId
    );
}
