package com.societyone.app.notification.repository;

import com.societyone.app.notification.entity.Announcement;
import com.societyone.app.notification.entity.AnnouncementAudience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    @Query("""
        SELECT a FROM Announcement a
        WHERE a.audience = :audience
          AND a.active = true
          AND (a.expiresAt IS NULL OR a.expiresAt > :now)
        ORDER BY a.pinned DESC, a.createdAt DESC
    """)
    List<Announcement> findActiveByAudience(
            @Param("audience") AnnouncementAudience audience,
            @Param("now") OffsetDateTime now
    );

    @Query("""
        SELECT a FROM Announcement a
        WHERE a.audience IN :audiences
          AND a.active = true
          AND (a.expiresAt IS NULL OR a.expiresAt > :now)
        ORDER BY a.pinned DESC, a.createdAt DESC
    """)
    List<Announcement> findActiveByAudiences(
            @Param("audiences") Collection<AnnouncementAudience> audiences,
            @Param("now") OffsetDateTime now
    );

    @Query("""
        SELECT a FROM Announcement a
        WHERE a.audience IN :audiences
        ORDER BY a.pinned DESC, a.createdAt DESC
    """)
    List<Announcement> findByAudiences(
            @Param("audiences") Collection<AnnouncementAudience> audiences
    );

    List<Announcement> findAllByOrderByPinnedDescCreatedAtDesc();
}
