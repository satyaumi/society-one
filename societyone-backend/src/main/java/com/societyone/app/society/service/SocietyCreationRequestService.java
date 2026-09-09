package com.societyone.app.society.service;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.email.EmailService;
import com.societyone.app.platform.dto.AdminHandoverRequest;
import com.societyone.app.platform.dto.SocietyRequestReviewAction;
import com.societyone.app.society.dto.SocietyCreationRequestResponse;
import com.societyone.app.society.dto.SocietyCreationSubmitRequest;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.entity.SocietyCreationRequest;
import com.societyone.app.society.entity.SocietyRequestStatus;
import com.societyone.app.society.entity.StructureStatus;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.SocietyCreationRequestRepository;
import com.societyone.app.society.repository.SocietyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class SocietyCreationRequestService {

    private final SocietyCreationRequestRepository requestRepository;
    private final SocietyRepository societyRepository;
    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;
    private static final SecureRandom RANDOM = new SecureRandom();

    public SocietyCreationRequestService(
            SocietyCreationRequestRepository requestRepository,
            SocietyRepository societyRepository,
            BuildingRepository buildingRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            EmailService emailService
    ) {
        this.requestRepository = requestRepository;
        this.societyRepository = societyRepository;
        this.buildingRepository = buildingRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.emailService = emailService;
    }

    // =========================================================================
    // Public Submission & Tracking
    // =========================================================================

    public SocietyCreationRequestResponse submitRequest(
            SocietyCreationSubmitRequest request,
            MultipartFile document
    ) {
        String societyName = normalize(request.societyName());
        if (societyRepository.existsByNameIgnoreCase(societyName)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An active society with the name '" + request.societyName() + "' already exists."
            );
        }

        if (requestRepository.existsBySocietyNameIgnoreCaseAndStatusNotIn(
                societyName,
                List.of(SocietyRequestStatus.REJECTED, SocietyRequestStatus.CANCELLED)
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An active application for '" + request.societyName() + "' is already submitted or under review."
            );
        }

        SocietyCreationRequest entity = new SocietyCreationRequest();
        entity.setReferenceCode(generateReferenceCode());
        entity.setPrimaryContactName(request.primaryContactName().trim());
        entity.setPrimaryContactEmail(normalizeEmail(request.primaryContactEmail()));
        entity.setPrimaryContactPhone(normalizePhone(request.primaryContactPhone()));
        entity.setSocietyOfficialEmail(normalizeEmail(request.societyOfficialEmail()));

        if (request.secondaryContactName() != null && !request.secondaryContactName().isBlank()) {
            entity.setSecondaryContactName(request.secondaryContactName().trim());
            entity.setSecondaryContactPhone(normalizePhone(request.secondaryContactPhone()));
            entity.setSecondaryContactEmail(normalizeEmail(request.secondaryContactEmail()));
        }

        entity.setSocietyName(request.societyName().trim());
        entity.setRegistrationNumber(blankToNull(request.registrationNumber()));
        entity.setSocietyType(request.societyType() != null && !request.societyType().isBlank()
                ? request.societyType().trim() : "HOUSING_SOCIETY");
        entity.setTotalFlats(request.totalFlats() != null && request.totalFlats() > 0 ? request.totalFlats() : 1);
        entity.setNumberOfWings(request.numberOfWings() != null && request.numberOfWings() > 0 ? request.numberOfWings() : 1);
        entity.setAddress(request.address().trim());
        entity.setCity(request.city().trim());
        entity.setState(request.state().trim());
        entity.setPostalCode(request.postalCode().trim());
        entity.setManagementMethod(request.managementMethod() != null && !request.managementMethod().isBlank()
                ? request.managementMethod().trim() : "MANUAL");
        entity.setStatus(SocietyRequestStatus.SUBMITTED);

        // Handle Optional Document Upload
        if (document != null && !document.isEmpty()) {
            storeDocument(entity, document);
        }

        // Link existing user if applicant already has an account
        userRepository.findByEmailIgnoreCase(entity.getPrimaryContactEmail())
                .or(() -> userRepository.findByMobileNumber(entity.getPrimaryContactPhone()))
                .ifPresent(entity::setApplicantUser);

        SocietyCreationRequest saved = requestRepository.save(entity);

        auditService.record(
                saved.getApplicantUser() != null ? saved.getApplicantUser().getId() : null,
                null,
                AuditAction.SOCIETY_REQUEST_SUBMITTED,
                "SOCIETY_REQUEST",
                saved.getId(),
                "Submitted society creation request for " + saved.getSocietyName() + " (Ref: " + saved.getReferenceCode() + ")"
        );

        // Send confirmation email to primary applicant
        try {
            emailService.sendGeneralNotificationEmail(
                    saved.getPrimaryContactEmail(),
                    saved.getPrimaryContactName(),
                    "Society Creation Request Submitted (" + saved.getReferenceCode() + ")",
                    "REQUEST SUBMITTED",
                    "#2563eb",
                    "We have received your request to create and register <strong>" + saved.getSocietyName() +
                            "</strong> on SocietyOne. Your application is now queued for Platform Management review.<br><br>" +
                            "<strong>Application Reference:</strong> " + saved.getReferenceCode() + "<br>" +
                            "<strong>Status:</strong> Under Review<br><br>" +
                            "You can track the progress of your application anytime at our portal.",
                    "Application Ref",
                    saved.getReferenceCode()
            );
        } catch (Exception ignored) {
        }

        return SocietyCreationRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SocietyCreationRequestResponse> trackRequest(String query) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a reference code, email, or phone number to track.");
        }
        String cleanQuery = query.trim();

        // 1. Direct reference code lookup (e.g. REQ-SOC-XXXXXX or #REQ-SOC-XXXXXX)
        String refCode = cleanQuery.replace("#", "").toUpperCase(Locale.ROOT);
        Optional<SocietyCreationRequest> byRef = requestRepository.findByReferenceCode(refCode);
        if (byRef.isPresent()) {
            return List.of(SocietyCreationRequestResponse.from(byRef.get()));
        }

        // 2. Email lookup
        if (cleanQuery.contains("@")) {
            List<SocietyCreationRequest> byEmail = requestRepository.findByPrimaryContactEmailIgnoreCaseOrderByCreatedAtDesc(cleanQuery.toLowerCase(Locale.ROOT));
            if (!byEmail.isEmpty()) {
                return byEmail.stream().map(SocietyCreationRequestResponse::from).toList();
            }
        }

        // 3. Phone lookup
        String cleanPhone = normalizePhone(cleanQuery);
        if (cleanPhone != null && cleanPhone.length() >= 7) {
            List<SocietyCreationRequest> byPhone = requestRepository.findByPrimaryContactPhoneOrderByCreatedAtDesc(cleanPhone);
            if (!byPhone.isEmpty()) {
                return byPhone.stream().map(SocietyCreationRequestResponse::from).toList();
            }
        }

        // 4. Try parsing as numeric ID
        try {
            Long id = Long.parseLong(cleanQuery);
            return requestRepository.findById(id)
                    .map(r -> List.of(SocietyCreationRequestResponse.from(r)))
                    .orElse(List.of());
        } catch (NumberFormatException ignored) {
        }

        return List.of();
    }

    // =========================================================================
    // Platform Management Review & Operations
    // =========================================================================

    @Transactional(readOnly = true)
    public List<SocietyCreationRequestResponse> listRequests(User actor, String statusFilter) {
        requirePlatformAdmin(actor);
        if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                SocietyRequestStatus status = SocietyRequestStatus.valueOf(statusFilter.trim().toUpperCase(Locale.ROOT));
                return requestRepository.findByStatusOrderByCreatedAtDesc(status)
                        .stream().map(SocietyCreationRequestResponse::from).toList();
            } catch (IllegalArgumentException ignored) {
            }
        }
        return requestRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(SocietyCreationRequestResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SocietyCreationRequestResponse getRequest(User actor, Long requestId) {
        requirePlatformAdmin(actor);
        SocietyCreationRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        return SocietyCreationRequestResponse.from(req);
    }

    public SocietyCreationRequestResponse markUnderReview(User actor, Long requestId, SocietyRequestReviewAction action) {
        requirePlatformAdmin(actor);
        SocietyCreationRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (req.getStatus() == SocietyRequestStatus.UNDER_REVIEW) {
            return SocietyCreationRequestResponse.from(req);
        }
        if (req.getStatus() != SocietyRequestStatus.SUBMITTED
                && req.getStatus() != SocietyRequestStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot mark as Under Review. Current status: " + req.getStatus()
            );
        }

        User reviewer = resolveManagedActor(actor);
        req.setStatus(SocietyRequestStatus.UNDER_REVIEW);
        req.setReviewerUser(reviewer);
        req.setReviewedAt(OffsetDateTime.now());
        if (action != null && action.notes() != null) {
            req.setReviewNotes(action.notes().trim());
        }
        SocietyCreationRequest saved = requestRepository.save(req);

        auditService.record(
                actor.getId(),
                null,
                AuditAction.SOCIETY_REQUEST_REVIEWED,
                "SOCIETY_REQUEST",
                saved.getId(),
                "Marked society request " + saved.getReferenceCode() + " as under review"
        );

        return SocietyCreationRequestResponse.from(saved);
    }

    public SocietyCreationRequestResponse requestChanges(User actor, Long requestId, SocietyRequestReviewAction action) {
        requirePlatformAdmin(actor);
        SocietyCreationRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (req.getStatus() != SocietyRequestStatus.SUBMITTED
                && req.getStatus() != SocietyRequestStatus.UNDER_REVIEW) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot request changes. Current status: " + req.getStatus()
            );
        }

        if (action == null || action.notes() == null || action.notes().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide change request notes explaining what details need updating.");
        }

        User reviewer = resolveManagedActor(actor);
        req.setStatus(SocietyRequestStatus.CHANGES_REQUESTED);
        req.setReviewerUser(reviewer);
        req.setReviewedAt(OffsetDateTime.now());
        req.setReviewNotes(action.notes().trim());
        SocietyCreationRequest saved = requestRepository.save(req);

        auditService.record(
                actor.getId(),
                null,
                AuditAction.SOCIETY_REQUEST_CHANGES_REQUESTED,
                "SOCIETY_REQUEST",
                saved.getId(),
                "Requested changes for society request " + saved.getReferenceCode() + ": " + action.notes()
        );

        // Send email notification to applicant
        try {
            emailService.sendGeneralNotificationEmail(
                    saved.getPrimaryContactEmail(),
                    saved.getPrimaryContactName(),
                    "Action Required: Changes Requested for " + saved.getSocietyName(),
                    "CHANGES REQUESTED",
                    "#f59e0b",
                    "The SocietyOne Platform Management team has reviewed your society creation application (" +
                            saved.getReferenceCode() + ") and requested updates before approval:<br><br>" +
                            "<strong>Reviewer Notes:</strong><br><em>" + action.notes().trim() + "</em><br><br>" +
                            "Please contact support or update your application details.",
                    "Application Ref",
                    saved.getReferenceCode()
            );
        } catch (Exception ignored) {
        }

        return SocietyCreationRequestResponse.from(saved);
    }

    public SocietyCreationRequestResponse rejectRequest(User actor, Long requestId, SocietyRequestReviewAction action) {
        requirePlatformAdmin(actor);
        SocietyCreationRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (req.getStatus() != SocietyRequestStatus.SUBMITTED
                && req.getStatus() != SocietyRequestStatus.UNDER_REVIEW
                && req.getStatus() != SocietyRequestStatus.CHANGES_REQUESTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot reject application. Current status: " + req.getStatus()
            );
        }

        if (action == null || action.reason() == null || action.reason().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please provide a rejection reason.");
        }

        User reviewer = resolveManagedActor(actor);
        req.setStatus(SocietyRequestStatus.REJECTED);
        req.setReviewerUser(reviewer);
        req.setReviewedAt(OffsetDateTime.now());
        req.setRejectionReason(action.reason().trim());
        SocietyCreationRequest saved = requestRepository.save(req);

        auditService.record(
                actor.getId(),
                null,
                AuditAction.SOCIETY_REQUEST_REJECTED,
                "SOCIETY_REQUEST",
                saved.getId(),
                "Rejected society request " + saved.getReferenceCode() + ": " + action.reason()
        );

        // Send email notification to applicant
        try {
            emailService.sendGeneralNotificationEmail(
                    saved.getPrimaryContactEmail(),
                    saved.getPrimaryContactName(),
                    "Update on your Society Application (" + saved.getReferenceCode() + ")",
                    "APPLICATION REJECTED",
                    "#ef4444",
                    "We regret to inform you that your society registration application for <strong>" +
                            saved.getSocietyName() + "</strong> was not approved at this time.<br><br>" +
                            "<strong>Reason:</strong><br><em>" + action.reason().trim() + "</em>",
                    "Application Ref",
                    saved.getReferenceCode()
            );
        } catch (Exception ignored) {
        }

        return SocietyCreationRequestResponse.from(saved);
    }

    public SocietyCreationRequestResponse approveAndCreateSociety(
            User actor,
            Long requestId,
            SocietyRequestReviewAction action
    ) {
        requirePlatformAdmin(actor);
        SocietyCreationRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        if (req.getStatus() == SocietyRequestStatus.APPROVED || req.getStatus() == SocietyRequestStatus.SOCIETY_CREATED
                || req.getStatus() == SocietyRequestStatus.ADMIN_ASSIGNED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This society creation request has already been approved and created.");
        }

        String societyName = normalize(req.getSocietyName());
        if (societyRepository.existsByNameIgnoreCase(societyName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A society with name '" + req.getSocietyName() + "' already exists.");
        }

        User reviewer = resolveManagedActor(actor);

        // 1. Resolve or Provision the Society Admin User
        User adminUser = resolveOrProvisionSocietyAdmin(req, action != null ? action.adminPassword() : null);

        // 2. Create and Persist the Society entity
        Society society = new Society();
        society.setName(req.getSocietyName() != null ? req.getSocietyName().trim() : "Society");
        society.setAddress(req.getAddress() != null ? req.getAddress().trim() : "");
        society.setCity(req.getCity() != null ? req.getCity().trim() : "");
        society.setState(req.getState() != null ? req.getState().trim() : "");
        society.setPostalCode(req.getPostalCode() != null ? req.getPostalCode().trim() : "");
        society.setContactPhone(req.getPrimaryContactPhone());
        society.setContactEmail(req.getPrimaryContactEmail());
        society.setStatus(StructureStatus.ACTIVE);
        society.setOwner(adminUser);

        Society savedSociety = societyRepository.save(society);

        // 3. Automatically create initial default towers/wings if configured
        int wings = req.getNumberOfWings() != null && req.getNumberOfWings() > 0 ? req.getNumberOfWings() : 1;
        for (int i = 1; i <= wings; i++) {
            Building building = new Building();
            building.setSociety(savedSociety);
            building.setName(wings == 1 ? "Tower A" : "Wing " + (char) ('A' + (i - 1)));
            building.setStatus(StructureStatus.ACTIVE);
            buildingRepository.save(building);
        }

        // 4. Update the Request Status
        req.setStatus(SocietyRequestStatus.SOCIETY_CREATED);
        req.setCreatedSociety(savedSociety);
        req.setReviewerUser(reviewer);
        req.setReviewedAt(OffsetDateTime.now());
        if (action != null && action.notes() != null) {
            req.setReviewNotes(action.notes().trim());
        }
        SocietyCreationRequest savedReq = requestRepository.save(req);

        // 5. Audit records
        auditService.record(
                actor.getId(),
                savedSociety.getId(),
                AuditAction.SOCIETY_REQUEST_APPROVED,
                "SOCIETY_REQUEST",
                savedReq.getId(),
                "Approved society request " + savedReq.getReferenceCode() + " for " + savedSociety.getName()
        );
        auditService.record(
                actor.getId(),
                savedSociety.getId(),
                AuditAction.SOCIETY_CREATED,
                "SOCIETY",
                savedSociety.getId(),
                "Created society " + savedSociety.getName() + " from approved application"
        );
        auditService.record(
                actor.getId(),
                savedSociety.getId(),
                AuditAction.SOCIETY_ADMIN_ASSIGNED,
                "USER",
                adminUser.getId(),
                "Assigned Society Admin " + adminUser.getFullName() + " (" + adminUser.getUsername() + ") to " + savedSociety.getName()
        );

        // 6. Send Congratulatory & Onboarding Email to the new Society Admin
        try {
            emailService.sendGeneralNotificationEmail(
                    adminUser.getEmail() != null ? adminUser.getEmail() : savedReq.getPrimaryContactEmail(),
                    adminUser.getFullName(),
                    "Society Approved! Welcome to SocietyOne (" + savedSociety.getName() + ")",
                    "SOCIETY ACTIVATED",
                    "#10b981",
                    "Congratulations! Your society <strong>" + savedSociety.getName() +
                            "</strong> has been approved by Platform Management and is now live on SocietyOne.<br><br>" +
                            "<strong>Assigned Administrator:</strong> " + adminUser.getFullName() + " (" + adminUser.getUsername() + ")<br>" +
                            "<strong>Society ID:</strong> #" + savedSociety.getId() + "<br><br>" +
                            "You can now log in to the Society Admin Dashboard to configure towers, allocate flats, manage security staff, and onboard residents.",
                    "Society Name",
                    savedSociety.getName()
            );
        } catch (Exception ignored) {
        }

        return SocietyCreationRequestResponse.from(savedReq);
    }

    public void reassignSocietyAdmin(User actor, Long societyId, AdminHandoverRequest request) {
        requirePlatformAdmin(actor);
        Society society = societyRepository.findById(societyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Society not found"));

        User newAdmin = userRepository.findById(request.newAdminUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "New admin user not found"));

        if (newAdmin.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The target user account is not active.");
        }

        // Ensure target user has ADMIN role
        if (newAdmin.getRole() != Role.ADMIN && newAdmin.getRole() != Role.PLATFORM_ADMIN) {
            newAdmin.setRole(Role.ADMIN);
            userRepository.save(newAdmin);
        }

        User previousAdmin = society.getOwner();
        society.setOwner(newAdmin);
        societyRepository.save(society);

        auditService.record(
                actor.getId(),
                society.getId(),
                AuditAction.SOCIETY_ADMIN_REASSIGNED,
                "SOCIETY",
                society.getId(),
                "Reassigned society " + society.getName() + " admin from " +
                        (previousAdmin != null ? previousAdmin.getUsername() : "None") +
                        " to " + newAdmin.getUsername() +
                        (request.reason() != null ? " (Reason: " + request.reason() + ")" : "")
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private User resolveManagedActor(User actor) {
        if (actor == null || actor.getId() == null) {
            return null;
        }
        return userRepository.findById(actor.getId()).orElse(actor);
    }

    private User resolveOrProvisionSocietyAdmin(SocietyCreationRequest req, String customPassword) {
        String email = req.getPrimaryContactEmail();
        String phone = req.getPrimaryContactPhone();

        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(email)
                .or(() -> userRepository.findByMobileNumber(phone));

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (user.getRole() != Role.ADMIN && user.getRole() != Role.PLATFORM_ADMIN) {
                user.setRole(Role.ADMIN);
            }
            if (customPassword != null && customPassword.trim().length() >= 6) {
                user.setPasswordHash(passwordEncoder.encode(customPassword.trim()));
            }
            user.setAccountStatus(AccountStatus.ACTIVE);
            return userRepository.save(user);
        }

        // Provision new Society Admin user
        // (either no existing user found, or existing user already owns another society)
        User newUser = new User();
        newUser.setFullName(req.getPrimaryContactName().trim());
        newUser.setEmail(email);
        newUser.setMobileNumber(phone);
        newUser.setUsername(generateUniqueUsername(req.getPrimaryContactName(), email));

        String rawPassword = (customPassword != null && customPassword.trim().length() >= 6)
                ? customPassword.trim()
                : "Admin@" + (1000 + RANDOM.nextInt(9000));
        newUser.setPasswordHash(passwordEncoder.encode(rawPassword));
        newUser.setRole(Role.ADMIN);
        newUser.setAccountStatus(AccountStatus.ACTIVE);
        newUser.setEmailVerified(true);
        newUser.setMobileVerified(true);

        User savedUser = userRepository.save(newUser);

        try {
            emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getFullName(), savedUser.getUsername(), savedUser.getRole().name());
        } catch (Exception ignored) {
        }

        return savedUser;
    }

    private String generateUniqueUsername(String fullName, String email) {
        String base = (fullName != null ? fullName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "") : "admin");
        if (base.length() < 3) {
            base = email.split("@")[0].toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        }
        if (base.length() < 3) {
            base = "admin";
        }
        if (base.length() > 20) {
            base = base.substring(0, 20);
        }

        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            candidate = base + suffix;
            suffix++;
        }
        return candidate;
    }

    private void storeDocument(SocietyCreationRequest entity, MultipartFile file) {
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document size must be under 10MB");
        }
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);
        }
        Set<String> allowedExts = Set.of(".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx");
        if (!allowedExts.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Allowed document formats: PDF, PNG, JPG, WEBP, DOC, DOCX");
        }

        try {
            Path uploadDir = Paths.get("uploads", "society-docs");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String storedFilename = "socdoc_" + System.currentTimeMillis() + "_" + RANDOM.nextInt(10000) + extension;
            Path targetPath = uploadDir.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            entity.setDocumentUrl("/uploads/society-docs/" + storedFilename);
            entity.setDocumentFilename(originalFilename);
            entity.setDocumentSizeBytes(file.getSize());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save registration document.");
        }
    }

    private String generateReferenceCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder("REQ-SOC-");
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private void requirePlatformAdmin(User actor) {
        if (actor.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Platform Management access required");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeEmail(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String value) {
        if (value == null || value.isBlank()) return null;
        return value.replaceAll("[^0-9+]", "");
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
