package com.societyone.app.visitor.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;

import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.repository.ResidentProfileRepository;

import com.societyone.app.security.entity.SecurityStaffProfile;
import com.societyone.app.security.repository.SecurityStaffProfileRepository;

import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.SocietyRepository;

import com.societyone.app.visitor.dto.VisitRequestCreateRequest;
import com.societyone.app.visitor.dto.VisitRequestResponse;
import com.societyone.app.visitor.dto.VisitorCreateRequest;
import com.societyone.app.visitor.dto.VisitorResponse;

import com.societyone.app.visitor.entity.VisitRequest;
import com.societyone.app.visitor.entity.VisitRequestStatus;
import com.societyone.app.visitor.entity.VisitSource;
import com.societyone.app.visitor.entity.VisitStatus;
import com.societyone.app.visitor.entity.Visitor;

import com.societyone.app.visitor.repository.VisitRequestRepository;
import com.societyone.app.visitor.repository.VisitorRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class VisitorService {

    private static final String INVALID_STATE_TRANSITION_MSG =
            "Invalid visitor request state transition";

    private final VisitorRepository visitorRepository;
    private final VisitRequestRepository visitRequestRepository;
    private final SocietyRepository societyRepository;
    private final FlatRepository flatRepository;
    private final UserRepository userRepository;
    private final ResidentProfileRepository residentProfileRepository;
    private final SecurityStaffProfileRepository securityStaffProfileRepository;
    private final com.societyone.app.common.email.EmailService emailService;

    public VisitorService(
            VisitorRepository visitorRepository,
            VisitRequestRepository visitRequestRepository,
            SocietyRepository societyRepository,
            FlatRepository flatRepository,
            UserRepository userRepository,
            ResidentProfileRepository residentProfileRepository,
            SecurityStaffProfileRepository securityStaffProfileRepository,
            com.societyone.app.common.email.EmailService emailService
    ) {
        this.visitorRepository = visitorRepository;
        this.visitRequestRepository = visitRequestRepository;
        this.societyRepository = societyRepository;
        this.flatRepository = flatRepository;
        this.userRepository = userRepository;
        this.residentProfileRepository = residentProfileRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.emailService = emailService;
    }

    // ============================================================
    // Visitor creation
    // ============================================================

    public VisitorResponse createVisitor(
            User actor,
            VisitorCreateRequest request
    ) {
        requireAuthenticated(actor);

        Visitor visitor = new Visitor();

        visitor.setFullName(
                request.fullName().trim()
        );

        visitor.setMobileNumber(
                request.mobileNumber().trim()
        );

        visitor.setVisitorType(
                request.visitorType()
        );

        if (request.vehicleNumber() != null
                && !request.vehicleNumber().isBlank()) {

            visitor.setVehicleNumber(
                    request.vehicleNumber()
                            .trim()
                            .toUpperCase()
            );
        }

        if (request.photoUrl() != null && !request.photoUrl().isBlank()) {
            visitor.setPhotoUrl(request.photoUrl().trim());
        }

        return toVisitorResponse(
                visitorRepository.save(visitor)
        );
    }

    // ============================================================
    // List visitors
    // ============================================================

    @Transactional(readOnly = true)
    public List<VisitorResponse> listVisitors(
            User actor
    ) {
        requireAuthenticated(actor);

        return switch (actor.getRole()) {
            case ADMIN -> {
                Society society = getAdminSociety(actor);
                yield visitorRepository
                        .findDistinctBySocietyIdOrderByCreatedAtDesc(
                                society.getId()
                        )
                        .stream()
                        .map(this::toVisitorResponse)
                        .toList();
            }
            case SECURITY -> {
                SecurityStaffProfile profile =
                        getSecurityStaffProfile(actor);
                yield visitorRepository
                        .findDistinctBySocietyIdOrderByCreatedAtDesc(
                                profile.getSociety().getId()
                        )
                        .stream()
                        .map(this::toVisitorResponse)
                        .toList();
            }
            case RESIDENT -> visitorRepository
                    .findDistinctByResidentIdOrderByCreatedAtDesc(
                            actor.getId()
                    )
                    .stream()
                    .map(this::toVisitorResponse)
                    .toList();
            case VISITOR -> {
                List<VisitRequest> reqs = visitRequestRepository
                        .findByVisitorUserOrMobile(actor.getId(), actor.getMobileNumber());
                yield reqs.stream()
                        .map(VisitRequest::getVisitor)
                        .distinct()
                        .map(this::toVisitorResponse)
                        .toList();
            }
        };
    }

    // ============================================================
    // Get visitor by id
    // ============================================================

    @Transactional(readOnly = true)
    public VisitorResponse getVisitor(
            User actor,
            Long visitorId
    ) {
        requireAuthenticated(actor);

        Visitor visitor = visitorRepository
                .findById(visitorId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Visitor not found"
                        )
                );

        validateVisitorAccess(actor, visitor);

        return toVisitorResponse(visitor);
    }

    // ============================================================
    // Create visit request
    // ============================================================

    public VisitRequestResponse createVisitRequest(
            User actor,
            VisitRequestCreateRequest request
    ) {
        requireAuthenticated(actor);

        Visitor visitor =
                visitorRepository.findById(
                        request.visitorId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Visitor not found"
                        )
                );

        Society society =
                societyRepository.findById(
                        request.societyId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Society not found"
                        )
                );

        Flat flat =
                flatRepository.findById(
                        request.flatId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Flat not found"
                        )
                );

        User resident =
                userRepository.findById(
                        request.residentId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Resident not found"
                        )
                );

        validateFlatBelongsToSociety(flat, society);

        validateResidentAssignment(
                resident,
                flat,
                society
        );

        validateActorAccess(
                actor,
                society,
                flat,
                resident
        );

        VisitRequest visitRequest =
                new VisitRequest();

        visitRequest.setVisitor(visitor);
        visitRequest.setSociety(society);
        visitRequest.setFlat(flat);
        visitRequest.setResident(resident);

        if (actor != null && actor.getRole() == Role.VISITOR) {
            visitRequest.setVisitorUser(actor);
            if ((actor.getMobileNumber() == null || actor.getMobileNumber().isBlank())
                    && visitor.getMobileNumber() != null && !visitor.getMobileNumber().isBlank()) {
                if (!userRepository.existsByMobileNumber(visitor.getMobileNumber())) {
                    actor.setMobileNumber(visitor.getMobileNumber());
                    userRepository.save(actor);
                }
            }
        }

        visitRequest.setSource(
                request.source()
        );

        visitRequest.setRequestStatus(
                initialRequestStatus(
                        request.source()
                )
        );

        visitRequest.setVisitStatus(
                VisitStatus.EXPECTED
        );

        visitRequest.setExpectedDate(
                request.expectedDate()
        );

        visitRequest.setExpectedTime(
                request.expectedTime()
        );

        visitRequest.setPurpose(
                request.purpose()
        );

        visitRequest.setVehicleNumber(
                request.vehicleNumber()
        );

        if (request.photoUrl() != null && !request.photoUrl().isBlank()) {
            visitor.setPhotoUrl(request.photoUrl().trim());
            visitorRepository.save(visitor);
        }

        return toVisitRequestResponse(
                visitRequestRepository.save(
                        visitRequest
                )
        );
    }

    // ============================================================
    // List visit requests (role-aware)
    // ============================================================

    @Transactional(readOnly = true)
    public List<VisitRequestResponse> listVisitRequests(
            User actor
    ) {
        requireAuthenticated(actor);

        return switch (actor.getRole()) {
            case ADMIN -> {
                Society society = getAdminSociety(actor);
                yield visitRequestRepository
                        .findBySocietyIdOrderByCreatedAtDesc(
                                society.getId()
                        )
                        .stream()
                        .map(this::toVisitRequestResponse)
                        .toList();
            }
            case SECURITY -> {
                SecurityStaffProfile profile =
                        getSecurityStaffProfile(actor);
                yield visitRequestRepository
                        .findBySocietyIdOrderByCreatedAtDesc(
                                profile.getSociety().getId()
                        )
                        .stream()
                        .map(this::toVisitRequestResponse)
                        .toList();
            }
            case RESIDENT -> visitRequestRepository
                    .findByResidentIdOrderByCreatedAtDesc(
                            actor.getId()
                    )
                    .stream()
                    .map(this::toVisitRequestResponse)
                    .toList();
            case VISITOR -> visitRequestRepository
                    .findByVisitorUserOrMobile(actor.getId(), actor.getMobileNumber())
                    .stream()
                    .map(this::toVisitRequestResponse)
                    .toList();
        };
    }

    // ============================================================
    // Get visit request
    // ============================================================

    @Transactional(readOnly = true)
    public VisitRequestResponse getRequest(
            User actor,
            Long requestId
    ) {
        VisitRequest request =
                getRequestEntity(requestId);

        validateActorAccess(
                actor,
                request.getSociety(),
                request.getFlat(),
                request.getResident()
        );

        return toVisitRequestResponse(request);
    }

    // ============================================================
    // Resident approval
    // ============================================================

    public VisitRequestResponse approveByResident(
            User resident,
            Long requestId
    ) {
        requireAuthenticated(resident);

        VisitRequest request = getRequestEntity(requestId);

        boolean isDirectRecipient = request.getResident().getId().equals(resident.getId());
        boolean isSocietyAdmin = resident.getRole() == Role.ADMIN
                && getAdminSociety(resident).getId().equals(request.getSociety().getId());

        if (!isDirectRecipient && !isSocietyAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only approve requests addressed to you or your society"
            );
        }

        if (request.getRequestStatus()
                != VisitRequestStatus.PENDING_RESIDENT) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setRequestStatus(
                VisitRequestStatus.APPROVED_BY_RESIDENT
        );

        VisitRequest saved = visitRequestRepository.save(request);

        // Notify online visitor via email if email was provided during online registration
        if (saved.getVisitor() != null && saved.getVisitor().getEmail() != null && !saved.getVisitor().getEmail().isBlank()) {
            String dest = saved.getFlat() != null ? "Flat " + saved.getFlat().getNumber() : "Society Management / Office";
            emailService.sendOnlineVisitStatusUpdateToVisitorEmail(
                    saved.getVisitor().getEmail(),
                    saved.getVisitor().getFullName(),
                    resident.getFullName(),
                    saved.getSociety().getName(),
                    dest,
                    saved.getExpectedDate().toString(),
                    saved.getExpectedTime() != null ? saved.getExpectedTime().toString() : "Scheduled Time",
                    true
            );
        }

        return toVisitRequestResponse(saved);
    }

    // ============================================================
    // Resident rejection
    // ============================================================

    public VisitRequestResponse rejectByResident(
            User resident,
            Long requestId
    ) {
        requireAuthenticated(resident);

        VisitRequest request = getRequestEntity(requestId);

        boolean isDirectRecipient = request.getResident().getId().equals(resident.getId());
        boolean isSocietyAdmin = resident.getRole() == Role.ADMIN
                && getAdminSociety(resident).getId().equals(request.getSociety().getId());

        if (!isDirectRecipient && !isSocietyAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only reject requests addressed to you or your society"
            );
        }

        if (request.getRequestStatus()
                != VisitRequestStatus.PENDING_RESIDENT) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setRequestStatus(
                VisitRequestStatus.REJECTED_BY_RESIDENT
        );

        request.setVisitStatus(
                VisitStatus.CANCELLED
        );

        VisitRequest saved = visitRequestRepository.save(request);

        // Notify online visitor via email if email was provided during online registration
        if (saved.getVisitor() != null && saved.getVisitor().getEmail() != null && !saved.getVisitor().getEmail().isBlank()) {
            String dest = saved.getFlat() != null ? "Flat " + saved.getFlat().getNumber() : "Society Management / Office";
            emailService.sendOnlineVisitStatusUpdateToVisitorEmail(
                    saved.getVisitor().getEmail(),
                    saved.getVisitor().getFullName(),
                    resident.getFullName(),
                    saved.getSociety().getName(),
                    dest,
                    saved.getExpectedDate().toString(),
                    saved.getExpectedTime() != null ? saved.getExpectedTime().toString() : "Scheduled Time",
                    false
            );
        }

        return toVisitRequestResponse(saved);
    }

    // ============================================================
    // Security accepts visitor
    // ============================================================

    public VisitRequestResponse acceptBySecurity(
            User security,
            Long requestId
    ) {
        requireSecurity(security);

        VisitRequest request =
                getRequestEntity(requestId);

        validateSecuritySocietyAccess(
                security,
                request.getSociety()
        );

        if (!isReadyForSecurityDecision(request)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setRequestStatus(
                VisitRequestStatus.ACCEPTED_BY_SECURITY
        );

        request.setVisitStatus(
                VisitStatus.WAITING_AT_GATE
        );

        return toVisitRequestResponse(
                visitRequestRepository.save(request)
        );
    }

    // ============================================================
    // Security rejects visitor
    // ============================================================

    public VisitRequestResponse rejectBySecurity(
            User security,
            Long requestId
    ) {
        requireSecurity(security);

        VisitRequest request =
                getRequestEntity(requestId);

        validateSecuritySocietyAccess(
                security,
                request.getSociety()
        );

        if (!isReadyForSecurityDecision(request)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setRequestStatus(
                VisitRequestStatus.REJECTED_BY_SECURITY
        );

        request.setVisitStatus(
                VisitStatus.CANCELLED
        );

        return toVisitRequestResponse(
                visitRequestRepository.save(request)
        );
    }

    // ============================================================
    // Security check-in
    // ============================================================

    public VisitRequestResponse checkIn(
            User security,
            Long requestId
    ) {
        requireSecurity(security);

        VisitRequest request =
                getRequestEntity(requestId);

        validateSecuritySocietyAccess(
                security,
                request.getSociety()
        );

        boolean validRequestStatus =
                request.getRequestStatus() == VisitRequestStatus.ACCEPTED_BY_SECURITY
                || request.getRequestStatus() == VisitRequestStatus.APPROVED_BY_RESIDENT
                || request.getRequestStatus() == VisitRequestStatus.PENDING_SECURITY;

        boolean validVisitStatus =
                request.getVisitStatus() == VisitStatus.WAITING_AT_GATE
                || request.getVisitStatus() == VisitStatus.EXPECTED
                || request.getVisitStatus() == null;

        if (!validRequestStatus || !validVisitStatus) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setRequestStatus(
                VisitRequestStatus.ACCEPTED_BY_SECURITY
        );

        request.setVisitStatus(
                VisitStatus.CHECKED_IN
        );

        return toVisitRequestResponse(
                visitRequestRepository.save(request)
        );
    }

    // ============================================================
    // Security check-out
    // ============================================================

    public VisitRequestResponse checkOut(
            User security,
            Long requestId
    ) {
        requireSecurity(security);

        VisitRequest request =
                getRequestEntity(requestId);

        validateSecuritySocietyAccess(
                security,
                request.getSociety()
        );

        if (request.getVisitStatus()
                != VisitStatus.CHECKED_IN) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        request.setVisitStatus(
                VisitStatus.CHECKED_OUT
        );

        return toVisitRequestResponse(
                visitRequestRepository.save(request)
        );
    }

    // ============================================================
    // Cancel visit request
    // ============================================================

    public VisitRequestResponse cancelRequest(
            User actor,
            Long requestId
    ) {
        requireAuthenticated(actor);

        VisitRequest request =
                getRequestEntity(requestId);

        if (actor.getRole() == Role.RESIDENT) {
            if (!request.getResident()
                    .getId()
                    .equals(actor.getId())) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You can only cancel your own requests"
                );
            }
        } else if (actor.getRole() == Role.VISITOR) {
            String actorMobile = actor.getMobileNumber();
            String visitorMobile = request.getVisitor().getMobileNumber();
            if (actorMobile == null || !actorMobile.trim().equals(visitorMobile != null ? visitorMobile.trim() : "")) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You can only cancel your own requests"
                );
            }
        } else if (actor.getRole() == Role.ADMIN) {
            Society adminSociety = getAdminSociety(actor);
            if (!adminSociety.getId()
                    .equals(request.getSociety().getId())) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this society"
                );
            }
        } else if (actor.getRole() == Role.SECURITY) {
            validateSecuritySocietyAccess(
                    actor,
                    request.getSociety()
            );
        } else {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to cancel this request"
            );
        }

        if (request.getVisitStatus() == VisitStatus.CHECKED_IN
                || request.getVisitStatus() == VisitStatus.CHECKED_OUT) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    INVALID_STATE_TRANSITION_MSG
            );
        }

        if (request.getVisitStatus() == VisitStatus.CANCELLED) {
            return toVisitRequestResponse(request);
        }

        request.setVisitStatus(VisitStatus.CANCELLED);

        return toVisitRequestResponse(
                visitRequestRepository.save(request)
        );
    }

    // ============================================================
    // Flat / Society validation
    // ============================================================

    private void validateFlatBelongsToSociety(
            Flat flat,
            Society society
    ) {
        if (!flat.getSociety()
                .getId()
                .equals(society.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Flat does not belong to the selected society"
            );
        }
    }

    // ============================================================
    // Resident / Flat validation
    // ============================================================

    private void validateResidentAssignment(
            User resident,
            Flat flat,
            Society society
    ) {
        ResidentProfile profile =
                residentProfileRepository
                        .findByUserId(resident.getId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Selected user is not a resident"
                                )
                        );

        if (resident.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selected user is not a resident"
            );
        }

        if (!profile.getFlat()
                .getId()
                .equals(flat.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Resident is not assigned to the selected flat"
            );
        }

        if (!profile.getFlat()
                .getSociety()
                .getId()
                .equals(society.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Resident's flat does not belong to the selected society"
            );
        }
    }

    // ============================================================
    // Actor access validation
    // ============================================================

    private void validateActorAccess(
            User actor,
            Society society,
            Flat flat,
            User resident
    ) {
        requireAuthenticated(actor);

        if (actor.getRole() == Role.ADMIN) {

            Society adminSociety =
                    getAdminSociety(actor);

            if (!adminSociety.getId()
                    .equals(society.getId())) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this society"
                );
            }

            return;
        }

        if (actor.getRole() == Role.RESIDENT) {

            if (!actor.getId()
                    .equals(resident.getId())) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You can only create visits for yourself"
                );
            }

            return;
        }

        if (actor.getRole() == Role.SECURITY) {

            validateSecuritySocietyAccess(actor, society);

            return;
        }

        if (actor.getRole() != Role.VISITOR) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission for this operation"
            );
        }
    }

    // ============================================================
    // Visitor access validation
    // ============================================================

    private void validateVisitorAccess(
            User actor,
            Visitor visitor
    ) {
        if (actor.getRole() == Role.ADMIN) {
            Society adminSociety = getAdminSociety(actor);
            boolean hasAccess = visitRequestRepository
                    .findBySocietyIdOrderByCreatedAtDesc(
                            adminSociety.getId()
                    )
                    .stream()
                    .anyMatch(vr -> vr.getVisitor()
                            .getId()
                            .equals(visitor.getId()));
            if (!hasAccess) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this visitor"
                );
            }
            return;
        }

        if (actor.getRole() == Role.SECURITY) {
            SecurityStaffProfile profile =
                    getSecurityStaffProfile(actor);
            boolean hasAccess = visitRequestRepository
                    .findBySocietyIdOrderByCreatedAtDesc(
                            profile.getSociety().getId()
                    )
                    .stream()
                    .anyMatch(vr -> vr.getVisitor()
                            .getId()
                            .equals(visitor.getId()));
            if (!hasAccess) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this visitor"
                );
            }
            return;
        }

        if (actor.getRole() == Role.RESIDENT) {
            boolean hasAccess = visitRequestRepository
                    .findByResidentIdOrderByCreatedAtDesc(
                            actor.getId()
                    )
                    .stream()
                    .anyMatch(vr -> vr.getVisitor()
                            .getId()
                            .equals(visitor.getId()));
            if (!hasAccess) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this visitor"
                );
            }
            return;
        }

        if (actor.getRole() == Role.VISITOR) {
            String actorMobile = actor.getMobileNumber();
            String visitorMobile = visitor.getMobileNumber();
            if (actorMobile != null && actorMobile.trim().equals(visitorMobile != null ? visitorMobile.trim() : "")) {
                return;
            }
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "You do not have access to this visitor"
        );
    }

    // ============================================================
    // Initial request status
    // ============================================================

    private static boolean isReadyForSecurityDecision(VisitRequest request) {
        return request.getRequestStatus() == VisitRequestStatus.PENDING_SECURITY
                || request.getRequestStatus() == VisitRequestStatus.APPROVED_BY_RESIDENT;
    }

    private VisitRequestStatus initialRequestStatus(
            VisitSource source
    ) {
        return switch (source) {

            case RESIDENT ->
                    VisitRequestStatus.PENDING_SECURITY;

            case SECURITY ->
                    VisitRequestStatus.PENDING_RESIDENT;

            case VISITOR ->
                    VisitRequestStatus.PENDING_RESIDENT;
        };
    }

    // ============================================================
    // Admin society
    // ============================================================

    private Society getAdminSociety(
            User admin
    ) {
        if (admin.getRole() != Role.ADMIN && admin.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

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
                                HttpStatus.NOT_FOUND,
                                "Admin has no society"
                        )
                );
    }

    // ============================================================
    // Security staff profile resolution
    // ============================================================

    private SecurityStaffProfile getSecurityStaffProfile(
            User security
    ) {
        return securityStaffProfileRepository
                .findByUserId(security.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "Security staff profile not found"
                        )
                );
    }

    // ============================================================
    // Security validation
    // ============================================================

    private void requireSecurity(
            User security
    ) {
        requireAuthenticated(security);

        if (security.getRole() != Role.SECURITY) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only security staff can perform this action"
            );
        }
    }

    private void validateSecuritySocietyAccess(
            User security,
            Society society
    ) {
        SecurityStaffProfile profile =
                getSecurityStaffProfile(security);

        if (!profile.getSociety()
                .getId()
                .equals(society.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Security staff does not belong to this society"
            );
        }
    }

    // ============================================================
    // Request lookup
    // ============================================================

    private VisitRequest getRequestEntity(
            Long requestId
    ) {
        return visitRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Visit request not found"
                        )
                );
    }

    // ============================================================
    // Authentication helpers
    // ============================================================

    private void requireAuthenticated(
            User actor
    ) {
        if (actor == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }
    }

    private void requireRole(
            User user,
            Role role
    ) {
        requireAuthenticated(user);

        if (user.getRole() != role) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only " + role.name()
                            + " can perform this action"
            );
        }
    }

    // ============================================================
    // Photo handling & lookup
    // ============================================================

    public String uploadVisitorPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size must be under 5MB");
        }
        String contentType = file.getContentType();
        Set<String> allowedTypes = Set.of("image/jpeg", "image/png", "image/webp");
        if (contentType == null || !allowedTypes.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG, PNG, and WebP images are allowed");
        }

        try {
            Path uploadDir = Paths.get("uploads", "visitors");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
            String filename = "visitor_" + UUID.randomUUID() + extension;
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/visitors/" + filename;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save visitor image");
        }
    }

    @Transactional(readOnly = true)
    public Optional<VisitorResponse> findByMobile(User actor, String mobileNumber) {
        requireAuthenticated(actor);
        if (mobileNumber == null || mobileNumber.isBlank()) {
            return Optional.empty();
        }
        return visitorRepository.findFirstByMobileNumber(mobileNumber.trim())
                .map(this::toVisitorResponse);
    }

    public VisitorResponse updateVisitorPhoto(User actor, Long visitorId, String photoUrl) {
        requireAuthenticated(actor);
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visitor not found"));
        validateVisitorAccess(actor, visitor);
        visitor.setPhotoUrl(photoUrl != null && !photoUrl.isBlank() ? photoUrl.trim() : null);
        return toVisitorResponse(visitorRepository.save(visitor));
    }

    // ============================================================
    // DTO mapping
    // ============================================================

    private VisitorResponse toVisitorResponse(
            Visitor visitor
    ) {
        return new VisitorResponse(
                visitor.getId(),
                visitor.getFullName(),
                visitor.getMobileNumber(),
                visitor.getVisitorType(),
                visitor.getVehicleNumber(),
                visitor.getPhotoUrl(),
                visitor.getCreatedAt()
        );
    }

    private VisitRequestResponse toVisitRequestResponse(
            VisitRequest request
    ) {
        String buildingName = (request.getFlat() != null && request.getFlat().getBuilding() != null)
                ? request.getFlat().getBuilding().getName() : null;

        Long flatId = request.getFlat() != null ? request.getFlat().getId() : null;
        String flatNumber = request.getFlat() != null ? request.getFlat().getNumber() : "Office / Admin";

        return new VisitRequestResponse(
                request.getId(),
                request.getVisitor().getId(),
                request.getVisitor().getFullName(),
                request.getVisitor().getMobileNumber(),
                request.getVisitor().getVisitorType(),
                request.getVisitor().getPhotoUrl(),
                request.getSociety().getId(),
                request.getSociety().getName(),
                buildingName,
                flatId,
                flatNumber,
                request.getResident().getId(),
                request.getResident().getFullName(),
                request.getSource(),
                request.getRequestStatus(),
                request.getVisitStatus(),
                request.getExpectedDate(),
                request.getExpectedTime(),
                request.getPurpose(),
                request.getVehicleNumber(),
                request.getCreatedAt(),
                request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getCreatedAt()
        );
    }
}
