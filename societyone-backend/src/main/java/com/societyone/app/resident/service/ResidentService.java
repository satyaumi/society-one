package com.societyone.app.resident.service;

import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.resident.dto.ResidentCreateRequest;
import com.societyone.app.resident.dto.ResidentProvisionRequest;
import com.societyone.app.resident.dto.ResidentResponse;
import com.societyone.app.resident.dto.ResidentSelfLinkRequest;
import com.societyone.app.resident.dto.UnassignedResidentResponse;
import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.entity.ResidentStatus;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Floor;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.SocietyRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class ResidentService {

    private final ResidentProfileRepository residentRepository;
    private final UserRepository userRepository;
    private final FlatRepository flatRepository;
    private final SocietyRepository societyRepository;
    private final com.societyone.app.security.repository.SecurityStaffProfileRepository securityStaffProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public ResidentService(
            ResidentProfileRepository residentRepository,
            UserRepository userRepository,
            FlatRepository flatRepository,
            SocietyRepository societyRepository,
            com.societyone.app.security.repository.SecurityStaffProfileRepository securityStaffProfileRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.residentRepository = residentRepository;
        this.userRepository = userRepository;
        this.flatRepository = flatRepository;
        this.societyRepository = societyRepository;
        this.securityStaffProfileRepository = securityStaffProfileRepository;
        this.passwordEncoder = passwordEncoder;
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
                resident.getCreatedAt()
        );
    }
}
