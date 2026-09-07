package com.societyone.app.resident.service;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.service.NotificationService;
import com.societyone.app.resident.dto.*;
import com.societyone.app.resident.entity.*;
import com.societyone.app.resident.repository.ResidentOnboardingRepository;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Floor;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.FloorRepository;
import com.societyone.app.society.repository.SocietyRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ResidentService {

    private final ResidentProfileRepository residentRepository;
    private final UserRepository userRepository;
    private final FlatRepository flatRepository;
    private final SocietyRepository societyRepository;
    private final com.societyone.app.security.repository.SecurityStaffProfileRepository securityStaffProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResidentOnboardingRepository onboardingRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public ResidentService(
            ResidentProfileRepository residentRepository,
            UserRepository userRepository,
            FlatRepository flatRepository,
            SocietyRepository societyRepository,
            com.societyone.app.security.repository.SecurityStaffProfileRepository securityStaffProfileRepository,
            PasswordEncoder passwordEncoder,
            ResidentOnboardingRepository onboardingRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            NotificationService notificationService,
            AuditService auditService
    ) {
        this.residentRepository = residentRepository;
        this.userRepository = userRepository;
        this.flatRepository = flatRepository;
        this.societyRepository = societyRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.onboardingRepository = onboardingRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    public ResidentResponse createResident(
            User actor,
            Long userId,
            ResidentCreateRequest request
    ) {
        requireAdmin(actor);
        Society adminSociety = requireAdminSociety(actor);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (residentRepository.existsByUserId(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "User already has a resident profile"
            );
        }

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Flat not found"
                ));

        if (!flat.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        ResidentProfile resident = new ResidentProfile();
        resident.setUser(user);
        resident.setFlat(flat);
        resident.setResidentType(request.residentType());
        resident.setStatus(ResidentStatus.ACTIVE);

        if (user.getAccountStatus() != AccountStatus.LOCKED) {
            user.setAccountStatus(AccountStatus.ACTIVE);
        }
        user.setRole(Role.RESIDENT);
        userRepository.save(user);

        ResidentProfile saved = residentRepository.save(resident);
        return toResponse(saved);
    }

    public ResidentResponse provisionResident(
            User actor,
            ResidentProvisionRequest request
    ) {
        requireAdmin(actor);
        Society adminSociety = requireAdminSociety(actor);

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Flat not found"
                ));

        if (!flat.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Flat does not belong to your society");
        }

        String username = request.username().trim();
        String mobile = request.mobileNumber().trim();
        String email = request.email() != null && !request.email().isBlank() ? request.email().trim().toLowerCase() : null;

        User user;
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
            if (residentRepository.existsByUserId(user.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "User already has a resident profile");
            }
        } else {
            if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
            if (userRepository.existsByMobileNumber(mobile)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Mobile number is already registered");
            }

            user = new User();
            user.setUsername(username);
            user.setFullName(request.fullName().trim());
            user.setEmail(email);
            user.setMobileNumber(mobile);
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRole(Role.RESIDENT);
            user.setAccountStatus(AccountStatus.ACTIVE);
            user = userRepository.save(user);
        }

        user.setRole(Role.RESIDENT);
        userRepository.save(user);

        ResidentProfile resident = new ResidentProfile();
        resident.setUser(user);
        resident.setFlat(flat);
        resident.setResidentType(request.residentType());
        resident.setStatus(ResidentStatus.ACTIVE);

        ResidentProfile saved = residentRepository.save(resident);
        return toResponse(saved);
    }

    public List<ResidentResponse> listForAdminSociety(User actor) {
        requireAdmin(actor);
        Society adminSociety = requireAdminSociety(actor);
        return residentRepository.findByFlat_SocietyIdOrderByCreatedAtDesc(adminSociety.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<UnassignedResidentResponse> listUnassignedResidents(User actor) {
        requireAdmin(actor);
        return userRepository.findUnassignedByRole(Role.RESIDENT)
                .stream()
                .map(u -> new UnassignedResidentResponse(
                        u.getId(),
                        u.getUsername(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getMobileNumber(),
                        u.getCreatedAt()
                ))
                .toList();
    }

    public ResidentResponse selfLinkFlat(User actor, ResidentSelfLinkRequest request) {
        if (actor.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only resident accounts can link to flats");
        }

        if (residentRepository.existsByUserId(actor.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Resident profile already linked to a flat"
            );
        }

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Flat not found"
                ));

        ResidentProfile resident = new ResidentProfile();
        resident.setUser(actor);
        resident.setFlat(flat);
        resident.setResidentType(request.residentType());
        resident.setStatus(ResidentStatus.ACTIVE);

        ResidentProfile saved = residentRepository.save(resident);
        return toResponse(saved);
    }

    @Transactional
    public List<ResidentResponse> getResidentsByFlat(User actor, Long flatId) {
        Flat flat = flatRepository.findById(flatId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Flat not found"
                ));

        if (actor.getRole() == Role.ADMIN) {
            Society adminSociety = requireAdminSociety(actor);
            if (!flat.getSociety().getId().equals(adminSociety.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
            }
        } else if (actor.getRole() == Role.SECURITY) {
            com.societyone.app.security.entity.SecurityStaffProfile secProfile = securityStaffProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN"));
            if (!flat.getSociety().getId().equals(secProfile.getSociety().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
            }
        } else if (actor.getRole() == Role.RESIDENT) {
            ResidentProfile ownProfile = residentRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN"));
            if (!ownProfile.getFlat().getId().equals(flatId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
            }
        } else if (actor.getRole() == Role.VISITOR) {
            // Visitors can look up residents of destination flat to create visit requests
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        return residentRepository.findByFlatId(flatId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ResidentResponse getResident(User actor, Long residentId) {
        ResidentProfile resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Resident profile not found"
                ));

        if (actor.getRole() == Role.ADMIN) {
            Society adminSociety = requireAdminSociety(actor);
            if (!resident.getFlat().getSociety().getId().equals(adminSociety.getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident profile not found");
            }
        } else if (actor.getRole() == Role.RESIDENT) {
            if (!resident.getUser().getId().equals(actor.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
            }
        } else if (actor.getRole() == Role.SECURITY) {
            com.societyone.app.security.entity.SecurityStaffProfile secProfile = securityStaffProfileRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN"));
            if (!resident.getFlat().getSociety().getId().equals(secProfile.getSociety().getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident profile not found");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }

        return toResponse(resident);
    }

    public ResidentResponse updateStatus(
            User actor,
            Long residentId,
            ResidentStatus newStatus
    ) {
        requireAdmin(actor);
        Society adminSociety = requireAdminSociety(actor);

        ResidentProfile resident = residentRepository.findById(residentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Resident profile not found"
                ));

        if (!resident.getFlat().getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resident profile not found");
        }

        if (newStatus != ResidentStatus.ACTIVE && newStatus != ResidentStatus.INACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid visitor request state transition"
            );
        }

        resident.setStatus(newStatus);
        User user = resident.getUser();
        if (user.getAccountStatus() != AccountStatus.LOCKED) {
            user.setAccountStatus(
                    newStatus == ResidentStatus.ACTIVE
                            ? AccountStatus.ACTIVE
                            : AccountStatus.INACTIVE
            );
            userRepository.save(user);
        }
        return toResponse(residentRepository.save(resident));
    }

    public ResidentResponse getOwnProfile(User actor) {
        if (actor.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        ResidentProfile profile = residentRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Resident profile not found"
                ));
        return toResponse(profile);
    }

    // ---- Onboarding & Allocation Lifecycle ----

    public ResidentOnboardingResponse submitOnboarding(User actor, ResidentOnboardingSubmitRequest request) {
        if (actor.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only resident users can submit onboarding details");
        }

        if (residentRepository.existsByUserId(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resident already has an allocated apartment/flat");
        }

        Society society = null;
        if (request.societyId() != null) {
            society = societyRepository.findById(request.societyId()).orElse(null);
        }
        if (society == null && request.preferredBuildingId() != null) {
            Building b = buildingRepository.findById(request.preferredBuildingId()).orElse(null);
            if (b != null) {
                society = b.getSociety();
            }
        }
        if (society == null) {
            society = societyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No society registered in system"));
        }

        Building prefBuilding = null;
        if (request.preferredBuildingId() != null) {
            prefBuilding = buildingRepository.findById(request.preferredBuildingId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Preferred building not found"));
            if (!prefBuilding.getSociety().getId().equals(society.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferred building does not belong to selected society");
            }
        }

        ResidentOnboardingRequest onboarding = onboardingRepository.findByUserId(actor.getId())
                .orElseGet(ResidentOnboardingRequest::new);

        onboarding.setUser(actor);
        onboarding.setSociety(society);
        onboarding.setFullName(request.fullName().trim());
        onboarding.setResidentType(request.residentType());
        onboarding.setFlatTypePreference(request.flatTypePreference() != null ? request.flatTypePreference().trim() : null);
        onboarding.setFamilyMemberCount(request.familyMemberCount() != null && request.familyMemberCount() > 0 ? request.familyMemberCount() : 1);
        onboarding.setPreferredBuilding(prefBuilding);
        onboarding.setPreferredFlatNumber(request.preferredFlatNumber() != null ? request.preferredFlatNumber().trim() : null);
        onboarding.setEmergencyContactName(request.emergencyContactName() != null ? request.emergencyContactName().trim() : null);
        onboarding.setEmergencyContactPhone(request.emergencyContactPhone() != null ? request.emergencyContactPhone().trim() : null);
        onboarding.setVehicleNumber(request.vehicleNumber() != null ? request.vehicleNumber().trim() : null);
        onboarding.setStatus(OnboardingStatus.SUBMITTED);
        onboarding.setAdminNotes(null);

        ResidentOnboardingRequest saved = onboardingRepository.save(onboarding);

        if (society.getOwner() != null) {
            notificationService.send(
                    society.getOwner().getId(),
                    society.getId(),
                    NotificationType.SYSTEM,
                    "New Resident Onboarding Request",
                    actor.getFullName() + " has submitted resident onboarding details for review.",
                    null
            );
        }

        auditService.record(
                actor.getId(),
                society.getId(),
                AuditAction.RESIDENT_ONBOARDING_SUBMITTED,
                "RESIDENT_ONBOARDING",
                saved.getId(),
                "Resident " + actor.getUsername() + " submitted onboarding details"
        );

        return toOnboardingResponse(saved);
    }

    public ResidentOnboardingResponse getMyOnboardingStatus(User actor) {
        if (actor.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only residents can view onboarding status");
        }

        Optional<ResidentProfile> profileOpt = residentRepository.findByUserId(actor.getId());
        if (profileOpt.isPresent()) {
            return toOnboardingResponseFromProfile(profileOpt.get());
        }

        Optional<ResidentOnboardingRequest> reqOpt = onboardingRepository.findByUserId(actor.getId());
        if (reqOpt.isPresent()) {
            return toOnboardingResponse(reqOpt.get());
        }

        Society society = societyRepository.findAll().stream().findFirst().orElse(null);
        return toEmptyOnboardingResponse(actor, society);
    }

    public List<ResidentOnboardingResponse> listOnboardingRequests(User admin) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);
        return onboardingRepository.findBySocietyIdOrderByCreatedAtDesc(adminSociety.getId())
                .stream()
                .map(this::toOnboardingResponse)
                .toList();
    }

    public ResidentOnboardingResponse getOnboardingRequest(User admin, Long requestId) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);
        ResidentOnboardingRequest req = onboardingRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Onboarding request not found"));

        if (!req.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Request does not belong to your society");
        }

        if (req.getStatus() == OnboardingStatus.SUBMITTED) {
            req.setStatus(OnboardingStatus.UNDER_ADMIN_REVIEW);
            req = onboardingRepository.save(req);
            auditService.record(
                    admin.getId(),
                    adminSociety.getId(),
                    AuditAction.RESIDENT_ONBOARDING_REVIEWED,
                    "RESIDENT_ONBOARDING",
                    req.getId(),
                    "Admin started review of onboarding request for " + req.getUser().getUsername()
            );
        }

        return toOnboardingResponse(req);
    }

    public ResidentOnboardingResponse requestChanges(User admin, Long requestId, AdminChangeRequest request) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);
        ResidentOnboardingRequest req = onboardingRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Onboarding request not found"));

        if (!req.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Request does not belong to your society");
        }

        if (req.getStatus() == OnboardingStatus.ALLOCATED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot request changes on an already allocated request");
        }

        req.setStatus(OnboardingStatus.CHANGES_REQUESTED);
        req.setAdminNotes(request.notes().trim());
        ResidentOnboardingRequest saved = onboardingRepository.save(req);

        notificationService.send(
                req.getUser().getId(),
                adminSociety.getId(),
                NotificationType.SYSTEM,
                "Action Required — Update Resident Details",
                "Admin requested updates to your resident onboarding: " + request.notes().trim(),
                null
        );

        auditService.record(
                admin.getId(),
                adminSociety.getId(),
                AuditAction.RESIDENT_CHANGES_REQUESTED,
                "RESIDENT_ONBOARDING",
                saved.getId(),
                "Admin requested changes for " + req.getUser().getUsername() + ": " + request.notes().trim()
        );

        return toOnboardingResponse(saved);
    }

    public ResidentOnboardingResponse rejectOnboarding(User admin, Long requestId, AdminChangeRequest request) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);
        ResidentOnboardingRequest req = onboardingRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Onboarding request not found"));

        if (!req.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Request does not belong to your society");
        }

        if (req.getStatus() == OnboardingStatus.ALLOCATED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reject an already allocated request");
        }

        req.setStatus(OnboardingStatus.REJECTED);
        req.setAdminNotes(request.notes().trim());
        ResidentOnboardingRequest saved = onboardingRepository.save(req);

        notificationService.send(
                req.getUser().getId(),
                adminSociety.getId(),
                NotificationType.SYSTEM,
                "Onboarding Request Rejected",
                "Your resident onboarding request was rejected: " + request.notes().trim(),
                null
        );

        auditService.record(
                admin.getId(),
                adminSociety.getId(),
                AuditAction.FLAT_ALLOCATION_REJECTED,
                "RESIDENT_ONBOARDING",
                saved.getId(),
                "Admin rejected onboarding request for " + req.getUser().getUsername() + ": " + request.notes().trim()
        );

        return toOnboardingResponse(saved);
    }

    public synchronized ResidentOnboardingResponse allocateFlat(User admin, Long requestId, FlatAllocationRequest request) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);
        ResidentOnboardingRequest onboarding = onboardingRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Onboarding request not found"));

        if (!onboarding.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Request does not belong to your society");
        }

        if (onboarding.getStatus() == OnboardingStatus.ALLOCATED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apartment has already been allocated for this request");
        }

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Flat not found"));

        if (!flat.getSociety().getId().equals(adminSociety.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Flat does not belong to your society");
        }

        // Occupancy check: prevent two active residents in the same flat
        if (residentRepository.existsByFlatIdAndStatus(flat.getId(), ResidentStatus.ACTIVE)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Flat " + flat.getNumber() + " is already occupied by an active resident"
            );
        }

        User residentUser = onboarding.getUser();
        if (residentRepository.existsByUserId(residentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "User already has an active resident profile linked to a flat"
            );
        }

        String finalFlatType = request.confirmedFlatType() != null && !request.confirmedFlatType().isBlank()
                ? request.confirmedFlatType().trim()
                : onboarding.getFlatTypePreference();

        OffsetDateTime now = OffsetDateTime.now();

        // Create official ResidentProfile
        ResidentProfile profile = new ResidentProfile();
        profile.setUser(residentUser);
        profile.setFlat(flat);
        profile.setResidentType(onboarding.getResidentType());
        profile.setStatus(ResidentStatus.ACTIVE);
        profile.setFlatType(finalFlatType);
        profile.setMaintenanceInfo(request.maintenanceInfo() != null ? request.maintenanceInfo().trim() : null);
        profile.setParkingSlot(request.parkingStatus() != null ? request.parkingStatus().trim() : null);
        profile.setFamilyMemberCount(onboarding.getFamilyMemberCount());
        profile.setEmergencyContactName(onboarding.getEmergencyContactName());
        profile.setEmergencyContactPhone(onboarding.getEmergencyContactPhone());
        profile.setVehicleNumber(onboarding.getVehicleNumber());
        profile.setAllocatedAt(now);
        residentRepository.save(profile);

        // Update User account status if needed
        if (residentUser.getAccountStatus() != AccountStatus.LOCKED) {
            residentUser.setAccountStatus(AccountStatus.ACTIVE);
            userRepository.save(residentUser);
        }

        // Update Onboarding Request
        onboarding.setStatus(OnboardingStatus.ALLOCATED);
        onboarding.setAllocatedFlat(flat);
        onboarding.setAllocatedBy(admin);
        onboarding.setConfirmedFlatType(finalFlatType);
        onboarding.setMaintenanceInfo(request.maintenanceInfo() != null ? request.maintenanceInfo().trim() : null);
        onboarding.setParkingStatus(request.parkingStatus() != null ? request.parkingStatus().trim() : null);
        onboarding.setAllocatedAt(now);
        if (request.notes() != null && !request.notes().isBlank()) {
            onboarding.setAdminNotes(request.notes().trim());
        }
        ResidentOnboardingRequest saved = onboardingRepository.save(onboarding);

        // Notify Resident
        notificationService.send(
                residentUser.getId(),
                adminSociety.getId(),
                NotificationType.APPROVAL,
                "Apartment Allocated",
                "Your apartment Flat " + flat.getNumber() + " in " + flat.getBuilding().getName() + " has been officially assigned by Admin.",
                null
        );

        // Audit log
        auditService.record(
                admin.getId(),
                adminSociety.getId(),
                AuditAction.FLAT_ALLOCATED,
                "FLAT_ALLOCATION",
                flat.getId(),
                "Allocated Flat " + flat.getNumber() + " (" + flat.getBuilding().getName() + ") to resident " + residentUser.getUsername()
        );

        return toOnboardingResponse(saved);
    }

    public List<FlatAvailabilityResponse> getFlatsWithAvailability(User admin, Long buildingId) {
        requireAdmin(admin);
        Society adminSociety = requireAdminSociety(admin);

        List<Flat> flats;
        if (buildingId != null) {
            Building bld = buildingRepository.findById(buildingId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found"));
            if (!bld.getSociety().getId().equals(adminSociety.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Building does not belong to your society");
            }
            flats = flatRepository.findByBuildingIdOrderByNumberAsc(buildingId);
        } else {
            flats = flatRepository.findBySocietyIdOrderByNumberAsc(adminSociety.getId());
        }

        return flats.stream().map(flat -> {
            Optional<ResidentProfile> activeProfile = residentRepository.findFirstByFlatIdAndStatus(flat.getId(), ResidentStatus.ACTIVE);
            boolean isOccupied = activeProfile.isPresent();
            String occupiedBy = isOccupied ? activeProfile.get().getUser().getFullName() : null;
            return new FlatAvailabilityResponse(
                    flat.getId(),
                    flat.getNumber(),
                    flat.getFloor().getId(),
                    flat.getFloor().getNumber(),
                    flat.getBuilding().getId(),
                    flat.getBuilding().getName(),
                    isOccupied,
                    occupiedBy,
                    flat.getStatus().name()
            );
        }).toList();
    }

    // ---- helpers ----

    private static void requireAdmin(User actor) {
        if (actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private Society requireAdminSociety(User admin) {
        return societyRepository.findByOwnerOrderByNameAsc(admin)
                .stream()
                .findFirst()
                .or(() -> societyRepository.findAll().stream().findFirst())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN"));
    }

    private ResidentResponse toResponse(ResidentProfile resident) {
        User user = resident.getUser();
        Flat flat = resident.getFlat();
        Floor floor = flat.getFloor();
        Building building = floor.getBuilding();
        Society society = building.getSociety();
        return new ResidentResponse(
                resident.getId(),
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getMobileNumber(),
                flat.getId(),
                flat.getNumber(),
                floor.getId(),
                floor.getNumber(),
                building.getId(),
                building.getName(),
                society.getId(),
                society.getName(),
                resident.getResidentType(),
                resident.getStatus(),
                resident.getCreatedAt(),
                resident.getFlatType(),
                resident.getMaintenanceInfo(),
                resident.getParkingSlot(),
                resident.getFamilyMemberCount() != null ? resident.getFamilyMemberCount() : 1,
                resident.getAllocatedAt() != null ? resident.getAllocatedAt() : resident.getCreatedAt()
        );
    }

    public ResidentOnboardingResponse toOnboardingResponse(ResidentOnboardingRequest req) {
        User user = req.getUser();
        Society society = req.getSociety();
        Building prefBld = req.getPreferredBuilding();
        Flat allocFlat = req.getAllocatedFlat();
        Floor allocFloor = allocFlat != null ? allocFlat.getFloor() : null;
        Building allocBld = allocFlat != null ? allocFlat.getBuilding() : null;

        return new ResidentOnboardingResponse(
                req.getId(),
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getMobileNumber(),
                society.getId(),
                society.getName(),
                req.getFullName(),
                req.getResidentType(),
                req.getFlatTypePreference(),
                req.getFamilyMemberCount(),
                prefBld != null ? prefBld.getId() : null,
                prefBld != null ? prefBld.getName() : null,
                req.getPreferredFlatNumber(),
                req.getEmergencyContactName(),
                req.getEmergencyContactPhone(),
                req.getVehicleNumber(),
                req.getStatus(),
                req.getAdminNotes(),
                allocFlat != null ? allocFlat.getId() : null,
                allocFlat != null ? allocFlat.getNumber() : null,
                allocFloor != null ? allocFloor.getId() : null,
                allocFloor != null ? allocFloor.getNumber() : null,
                allocBld != null ? allocBld.getId() : null,
                allocBld != null ? allocBld.getName() : null,
                req.getConfirmedFlatType(),
                req.getMaintenanceInfo(),
                req.getParkingStatus(),
                req.getAllocatedAt(),
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }

    public ResidentOnboardingResponse toOnboardingResponseFromProfile(ResidentProfile profile) {
        User user = profile.getUser();
        Flat flat = profile.getFlat();
        Floor floor = flat.getFloor();
        Building bld = floor.getBuilding();
        Society society = bld.getSociety();

        return new ResidentOnboardingResponse(
                profile.getId(),
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getMobileNumber(),
                society.getId(),
                society.getName(),
                user.getFullName(),
                profile.getResidentType(),
                profile.getFlatType(),
                profile.getFamilyMemberCount() != null ? profile.getFamilyMemberCount() : 1,
                bld.getId(),
                bld.getName(),
                flat.getNumber(),
                profile.getEmergencyContactName(),
                profile.getEmergencyContactPhone(),
                profile.getVehicleNumber(),
                OnboardingStatus.ALLOCATED,
                "Official flat allocated by Admin",
                flat.getId(),
                flat.getNumber(),
                floor.getId(),
                floor.getNumber(),
                bld.getId(),
                bld.getName(),
                profile.getFlatType(),
                profile.getMaintenanceInfo(),
                profile.getParkingSlot(),
                profile.getAllocatedAt() != null ? profile.getAllocatedAt() : profile.getCreatedAt(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    public ResidentOnboardingResponse toEmptyOnboardingResponse(User resident, Society society) {
        return new ResidentOnboardingResponse(
                null,
                resident.getId(),
                resident.getUsername(),
                resident.getFullName(),
                resident.getEmail(),
                resident.getMobileNumber(),
                society != null ? society.getId() : null,
                society != null ? society.getName() : null,
                resident.getFullName(),
                ResidentType.OWNER,
                null,
                1,
                null,
                null,
                null,
                null,
                null,
                null,
                OnboardingStatus.ONBOARDING_REQUIRED,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
