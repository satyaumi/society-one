package com.societyone.app.visitor.service;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.service.NotificationService;
import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.security.entity.SecurityStaffProfile;
import com.societyone.app.security.repository.SecurityStaffProfileRepository;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.SocietyRepository;
import com.societyone.app.visitor.dto.VisitRequestResponse;
import com.societyone.app.visitor.dto.VisitorAuthorizationRequest;
import com.societyone.app.visitor.dto.VisitorAuthorizationResponse;
import com.societyone.app.visitor.entity.*;
import com.societyone.app.visitor.repository.VisitRequestRepository;
import com.societyone.app.visitor.repository.VisitorAuthorizationRepository;
import com.societyone.app.visitor.repository.VisitorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class VisitorAuthorizationService {

    private final VisitorAuthorizationRepository authorizationRepository;
    private final VisitorRepository visitorRepository;
    private final VisitRequestRepository visitRequestRepository;
    private final SocietyRepository societyRepository;
    private final FlatRepository flatRepository;
    private final UserRepository userRepository;
    private final ResidentProfileRepository residentProfileRepository;
    private final SecurityStaffProfileRepository securityStaffProfileRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public VisitorAuthorizationService(
            VisitorAuthorizationRepository authorizationRepository,
            VisitorRepository visitorRepository,
            VisitRequestRepository visitRequestRepository,
            SocietyRepository societyRepository,
            FlatRepository flatRepository,
            UserRepository userRepository,
            ResidentProfileRepository residentProfileRepository,
            SecurityStaffProfileRepository securityStaffProfileRepository,
            NotificationService notificationService,
            AuditService auditService
    ) {
        this.authorizationRepository = authorizationRepository;
        this.visitorRepository = visitorRepository;
        this.visitRequestRepository = visitRequestRepository;
        this.societyRepository = societyRepository;
        this.flatRepository = flatRepository;
        this.userRepository = userRepository;
        this.residentProfileRepository = residentProfileRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    public VisitorAuthorizationResponse createOrAddAuthorization(
            User actor,
            VisitorAuthorizationRequest request
    ) {
        requireAuthenticated(actor);

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Flat not found"));

        Society society = flat.getSociety();

        User targetResident;
        if (actor.getRole() == Role.RESIDENT) {
            targetResident = actor;
            ResidentProfile profile = residentProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resident has no assigned flat"));
            if (!profile.getFlat().getId().equals(flat.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only authorize visitors for your own flat");
            }
        } else if (actor.getRole() == Role.SECURITY || actor.getRole() == Role.ADMIN) {
            if (request.residentId() != null) {
                targetResident = userRepository.findById(request.residentId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident user not found"));
            } else {
                List<ResidentProfile> residents = residentProfileRepository.findByFlatId(flat.getId());
                if (residents.isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No resident assigned to this flat");
                }
                targetResident = residents.getFirst().getUser();
            }

            if (actor.getRole() == Role.SECURITY) {
                SecurityStaffProfile secProfile = securityStaffProfileRepository.findByUserId(actor.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Security staff profile not found"));
                if (!secProfile.getSociety().getId().equals(society.getId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Security staff does not belong to this society");
                }
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized role to manage authorizations");
        }

        String mobile = request.mobileNumber().trim();
        Visitor visitor;
        if (request.visitorId() != null) {
            visitor = visitorRepository.findById(request.visitorId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visitor not found"));
        } else {
            visitor = visitorRepository.findFirstByMobileNumber(mobile)
                    .orElseGet(() -> {
                        Visitor v = new Visitor();
                        v.setFullName(request.fullName() != null && !request.fullName().isBlank()
                                ? request.fullName().trim() : "Regular Visitor");
                        v.setMobileNumber(mobile);
                        v.setVisitorType(request.visitorType() != null ? request.visitorType() : VisitorType.DOMESTIC_WORKER);
                        if (request.vehicleNumber() != null && !request.vehicleNumber().isBlank()) {
                            v.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
                        }
                        return visitorRepository.saveAndFlush(v);
                    });
        }

        AuthorizationType authType = request.authorizationType() != null
                ? request.authorizationType()
                : AuthorizationType.PERMANENT;

        LocalDate validFrom = request.validFrom() != null ? request.validFrom() : LocalDate.now();
        LocalDate validUntil = request.validUntil();
        if (authType == AuthorizationType.TEMPORARY_TODAY) {
            validUntil = LocalDate.now();
        }

        VisitorAuthorization auth = authorizationRepository
                .findByVisitorIdAndFlatId(visitor.getId(), flat.getId())
                .orElseGet(() -> {
                    VisitorAuthorization newAuth = new VisitorAuthorization();
                    newAuth.setVisitor(visitor);
                    newAuth.setSociety(society);
                    newAuth.setFlat(flat);
                    newAuth.setResident(targetResident);
                    return newAuth;
                });

        auth.setResident(targetResident);
        auth.setAuthorizationType(authType);
        auth.setStatus(AuthorizationStatus.ACTIVE);
        auth.setValidFrom(validFrom);
        auth.setValidUntil(validUntil);
        if (request.notes() != null) {
            auth.setNotes(request.notes().trim());
        }

        VisitorAuthorization saved = authorizationRepository.saveAndFlush(auth);

        auditService.record(
                actor.getId(),
                society.getId(),
                AuditAction.VISITOR_CREATED,
                "VISITOR_AUTHORIZATION",
                saved.getId(),
                "Authorized regular visitor " + visitor.getFullName() + " for flat " + flat.getNumber()
        );

        if (actor.getRole() == Role.SECURITY) {
            notificationService.send(
                    targetResident.getId(),
                    society.getId(),
                    NotificationType.REQUEST,
                    "Regular visitor authorized",
                    "Security authorized regular visitor " + visitor.getFullName() + " for your flat " + flat.getNumber(),
                    saved.getId()
            );
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<VisitorAuthorizationResponse> listAuthorizations(User actor, String query) {
        requireAuthenticated(actor);

        List<VisitorAuthorization> list;
        if (actor.getRole() == Role.RESIDENT) {
            list = authorizationRepository.findByResidentIdOrderByCreatedAtDesc(actor.getId());
        } else if (actor.getRole() == Role.SECURITY) {
            SecurityStaffProfile sec = securityStaffProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Security staff profile not found"));
            if (query != null && !query.isBlank()) {
                list = authorizationRepository.searchBySocietyAndQuery(sec.getSociety().getId(), query.trim());
            } else {
                list = authorizationRepository.findBySocietyIdOrderByCreatedAtDesc(sec.getSociety().getId());
            }
        } else if (actor.getRole() == Role.ADMIN) {
            Society adminSoc = societyRepository.findByOwnerOrderByNameAsc(actor).stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin society not found"));
            if (query != null && !query.isBlank()) {
                list = authorizationRepository.searchBySocietyAndQuery(adminSoc.getId(), query.trim());
            } else {
                list = authorizationRepository.findBySocietyIdOrderByCreatedAtDesc(adminSoc.getId());
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized role");
        }

        return list.stream().map(this::toResponse).toList();
    }

    public VisitorAuthorizationResponse updateStatus(User actor, Long authorizationId, AuthorizationStatus newStatus) {
        requireAuthenticated(actor);

        VisitorAuthorization auth = authorizationRepository.findById(authorizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authorization not found"));

        validateAccess(actor, auth);

        auth.setStatus(newStatus);
        VisitorAuthorization saved = authorizationRepository.save(auth);

        auditService.record(
                actor.getId(),
                auth.getSociety().getId(),
                AuditAction.VISIT_APPROVED,
                "VISITOR_AUTHORIZATION",
                saved.getId(),
                "Authorization status changed to " + newStatus + " for " + auth.getVisitor().getFullName()
        );

        return toResponse(saved);
    }

    public void deleteAuthorization(User actor, Long authorizationId) {
        requireAuthenticated(actor);

        VisitorAuthorization auth = authorizationRepository.findById(authorizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authorization not found"));

        validateAccess(actor, auth);

        authorizationRepository.delete(auth);

        auditService.record(
                actor.getId(),
                auth.getSociety().getId(),
                AuditAction.VISIT_REJECTED,
                "VISITOR_AUTHORIZATION",
                authorizationId,
                "Deleted authorization for " + auth.getVisitor().getFullName()
        );
    }

    public VisitRequestResponse checkInRegularVisitor(User securityActor, Long authorizationId) {
        requireAuthenticated(securityActor);
        if (securityActor.getRole() != Role.SECURITY && securityActor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only security staff can check in visitors");
        }

        VisitorAuthorization auth = authorizationRepository.findById(authorizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authorization not found"));

        if (!auth.isCurrentlyValid()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Regular visitor authorization is " + auth.getStatus() + (auth.getValidUntil() != null ? " (Expired)" : "") + ". Entry prohibited."
            );
        }

        Visitor visitor = auth.getVisitor();
        Society society = auth.getSociety();
        Flat flat = auth.getFlat();
        User resident = auth.getResident();

        VisitRequest vr = new VisitRequest();
        vr.setVisitor(visitor);
        vr.setSociety(society);
        vr.setFlat(flat);
        vr.setResident(resident);
        vr.setSource(VisitSource.SECURITY);
        vr.setRequestStatus(VisitRequestStatus.ACCEPTED_BY_SECURITY);
        vr.setVisitStatus(VisitStatus.CHECKED_IN);
        vr.setExpectedDate(LocalDate.now());
        vr.setExpectedTime(java.time.LocalTime.now());
        vr.setPurpose("Regular Visit: " + visitor.getVisitorType() + (auth.getNotes() != null ? " (" + auth.getNotes() + ")" : ""));
        vr.setVehicleNumber(visitor.getVehicleNumber());

        VisitRequest saved = visitRequestRepository.saveAndFlush(vr);

        notificationService.send(
                resident.getId(),
                society.getId(),
                NotificationType.ENTRY,
                "Regular visitor entered",
                visitor.getFullName() + " (" + visitor.getVisitorType() + ") has entered premises for your flat " + flat.getNumber(),
                saved.getId()
        );

        auditService.record(
                securityActor.getId(),
                society.getId(),
                AuditAction.VISITOR_CHECKED_IN,
                "VISIT_REQUEST",
                saved.getId(),
                "Regular visitor " + visitor.getFullName() + " checked in for flat " + flat.getNumber()
        );

        return new VisitRequestResponse(
                saved.getId(),
                visitor.getId(),
                visitor.getFullName(),
                visitor.getMobileNumber(),
                visitor.getVisitorType(),
                society.getId(),
                society.getName(),
                flat.getId(),
                flat.getNumber(),
                resident.getId(),
                resident.getFullName(),
                saved.getSource(),
                saved.getRequestStatus(),
                saved.getVisitStatus(),
                saved.getExpectedDate(),
                saved.getExpectedTime(),
                saved.getPurpose(),
                saved.getVehicleNumber(),
                saved.getCreatedAt()
        );
    }

    private void validateAccess(User actor, VisitorAuthorization auth) {
        if (actor.getRole() == Role.RESIDENT) {
            if (!auth.getResident().getId().equals(actor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage authorizations for your own flat");
            }
        } else if (actor.getRole() == Role.SECURITY) {
            SecurityStaffProfile sec = securityStaffProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Security staff profile not found"));
            if (!sec.getSociety().getId().equals(auth.getSociety().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not belong to this society");
            }
        } else if (actor.getRole() == Role.ADMIN) {
            Society adminSoc = societyRepository.findByOwnerOrderByNameAsc(actor).stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin society not found"));
            if (!adminSoc.getId().equals(auth.getSociety().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this society");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized role");
        }
    }

    private void requireAuthenticated(User actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
    }

    private VisitorAuthorizationResponse toResponse(VisitorAuthorization a) {
        return new VisitorAuthorizationResponse(
                a.getId(),
                a.getVisitor().getId(),
                a.getVisitor().getFullName(),
                a.getVisitor().getMobileNumber(),
                a.getVisitor().getVisitorType(),
                a.getVisitor().getVehicleNumber(),
                a.getSociety().getId(),
                a.getSociety().getName(),
                a.getFlat().getId(),
                a.getFlat().getNumber(),
                a.getResident().getId(),
                a.getResident().getFullName(),
                a.getAuthorizationType(),
                a.getStatus(),
                a.getValidFrom(),
                a.getValidUntil(),
                a.getNotes(),
                a.isCurrentlyValid(),
                a.getCreatedAt()
        );
    }
}
