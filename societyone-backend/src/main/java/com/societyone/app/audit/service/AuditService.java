package com.societyone.app.audit.service;

import com.societyone.app.audit.dto.AuditLogResponse;
import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.entity.AuditLog;
import com.societyone.app.audit.repository.AuditLogRepository;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.SocietyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AuditService {

    private static final Logger log =
            LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final SocietyRepository societyRepository;
    private final UserRepository userRepository;

    public AuditService(
            AuditLogRepository auditLogRepository,
            SocietyRepository societyRepository,
            UserRepository userRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.societyRepository = societyRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            Long actorUserId,
            Long societyId,
            AuditAction action,
            String entityType,
            Long entityId,
            String description
    ) {
        try {
            AuditLog audit = new AuditLog();
            audit.setActorUserId(actorUserId);
            audit.setSocietyId(societyId);
            audit.setAction(action);
            audit.setEntityType(entityType);
            audit.setEntityId(entityId);
            audit.setDescription(description);
            auditLogRepository.save(audit);
        } catch (Exception ex) {
            log.error(
                    "Audit record failed (actor={}, action={}): {}",
                    actorUserId,
                    action,
                    ex.getMessage()
            );
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> listForUser(User user) {
        if (user.getRole() == Role.ADMIN) {
            Society society = getAdminSociety(user);
            return auditLogRepository
                    .findBySocietyIdOrderByCreatedAtDesc(
                            society.getId(),
                            PageRequest.of(
                                    0,
                                    500,
                                    Sort.by(Sort.Direction.DESC, "createdAt")
                            )
                    )
                    .stream()
                    .map(this::toResponse)
                    .toList();
        } else {
            return auditLogRepository
                    .findByActorUserIdOrderByCreatedAtDesc(
                            user.getId(),
                            PageRequest.of(
                                    0,
                                    100,
                                    Sort.by(Sort.Direction.DESC, "createdAt")
                            )
                    )
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> listForAdmin(User admin) {
        return listForUser(admin);
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getById(User admin, Long auditId) {
        requireAdmin(admin);
        Society society = getAdminSociety(admin);
        AuditLog audit = auditLogRepository
                .findByIdAndSocietyId(auditId, society.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Audit record not found"
                        )
                );
        return toResponse(audit);
    }

    private AuditLogResponse toResponse(AuditLog audit) {
        String actorUsername = null;
        if (audit.getActorUserId() != null) {
            User actor = userRepository
                    .findById(audit.getActorUserId())
                    .orElse(null);
            if (actor != null) {
                actorUsername = actor.getUsername();
            }
        }
        return new AuditLogResponse(
                audit.getId(),
                audit.getActorUserId(),
                actorUsername,
                audit.getSocietyId(),
                audit.getAction(),
                audit.getEntityType(),
                audit.getEntityId(),
                audit.getDescription(),
                audit.getCreatedAt()
        );
    }

    private static void requireAdmin(User actor) {
        if (actor == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
        if (actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Forbidden"
            );
        }
    }

    private Society getAdminSociety(User admin) {
        if (admin.getRole() == Role.PLATFORM_ADMIN) {
            return societyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No society found"));
        }
        return societyRepository
                .findByOwnerOrderByNameAsc(admin)
                .stream()
                .findFirst()
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "Forbidden"
                        )
                );
    }
}
