package com.societyone.app.notification.repository;

import com.societyone.app.notification.entity.UserAnnouncementState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserAnnouncementStateRepository extends JpaRepository<UserAnnouncementState, Long> {

    Optional<UserAnnouncementState> findByUserIdAndAnnouncementId(Long userId, Long announcementId);

    List<UserAnnouncementState> findByUserIdAndAnnouncementIdIn(Long userId, Collection<Long> announcementIds);

    List<UserAnnouncementState> findByUserId(Long userId);

    @Query("""
        SELECT COUNT(s) FROM UserAnnouncementState s
        WHERE s.announcementId = :announcementId
          AND s.readAt IS NOT NULL
    """)
    long countReadsByAnnouncementId(@Param("announcementId") Long announcementId);

    void deleteByAnnouncementId(Long announcementId);
}
