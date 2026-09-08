package com.societyone.app.audit.repository;

import com.societyone.app.audit.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findBySocietyIdOrderByCreatedAtDesc(
            Long societyId,
            Pageable pageable
    );

    List<AuditLog> findBySocietyIdOrderByCreatedAtDesc(
            Long societyId
    );

    Optional<AuditLog> findByIdAndSocietyId(
            Long id,
            Long societyId
    );

    List<AuditLog> findByActorUserIdOrderByCreatedAtDesc(
            Long actorUserId,
            Pageable pageable
    );

    List<AuditLog> findAllByOrderByCreatedAtDesc(
            Pageable pageable
    );

    long countByCreatedAtAfter(java.time.OffsetDateTime createdAt);
}
