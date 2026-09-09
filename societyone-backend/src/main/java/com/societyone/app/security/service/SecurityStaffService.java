package com.societyone.app.security.service;

import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.util.ContactNormalizationService;
import com.societyone.app.security.dto.SecurityStaffCreateRequest;
import com.societyone.app.security.dto.SecurityStaffResponse;
import com.societyone.app.security.entity.SecurityStaffProfile;
import com.societyone.app.security.entity.SecurityStaffStatus;
import com.societyone.app.security.repository.SecurityStaffProfileRepository;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.SocietyRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class SecurityStaffService {

    private final SecurityStaffProfileRepository staffRepository;
    private final UserRepository userRepository;
    private final SocietyRepository societyRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.societyone.app.common.email.EmailService emailService;
    private final ContactNormalizationService contactNormalizationService;

    public SecurityStaffService(
            SecurityStaffProfileRepository staffRepository,
            UserRepository userRepository,
            SocietyRepository societyRepository,
            PasswordEncoder passwordEncoder,
            com.societyone.app.common.email.EmailService emailService,
            ContactNormalizationService contactNormalizationService
    ) {
        this.staffRepository = staffRepository;
        this.userRepository = userRepository;
        this.societyRepository = societyRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.contactNormalizationService = contactNormalizationService;
    }

    public SecurityStaffResponse create(
            User admin,
            SecurityStaffCreateRequest request
    ) {
        requireAdmin(admin);
        Society society = requireAdminSociety(admin);

        if (!passwordMeetsPolicy(request.password())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is too weak"
            );
        }

        String canonicalEmail = contactNormalizationService.normalizeEmail(request.email());
        String canonicalMobile = contactNormalizationService.normalizeMobile(request.mobileNumber());

        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username is already registered"
            );
        }

        if (canonicalEmail != null && userRepository.existsByEmailIgnoreCase(canonicalEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        if (canonicalMobile != null && userRepository.existsByMobileNumber(canonicalMobile)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mobile number is already registered"
            );
        }

        User user = new User();
        user.setUsername(request.username().trim());
        user.setFullName(request.fullName().trim());
        user.setEmail(canonicalEmail);
        user.setMobileNumber(canonicalMobile);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.SECURITY);
        user.setAccountStatus(AccountStatus.ACTIVE);
        User savedUser = userRepository.save(user);

        if (savedUser.getEmail() != null && !savedUser.getEmail().isBlank()) {
            emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getFullName(), savedUser.getUsername(), "SECURITY_STAFF");
        }

        SecurityStaffProfile profile = new SecurityStaffProfile();
        profile.setUser(savedUser);
        profile.setSociety(society);
        profile.setStatus(SecurityStaffStatus.ACTIVE);
        SecurityStaffProfile savedProfile = staffRepository.save(profile);

        return toResponse(savedProfile);
    }

    public List<SecurityStaffResponse> getAll(User admin) {
        requireAdmin(admin);
        Society society = requireAdminSociety(admin);
        return staffRepository.findBySocietyId(society.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SecurityStaffResponse get(User admin, Long id) {
        requireAdmin(admin);
        Society society = requireAdminSociety(admin);

        SecurityStaffProfile profile = staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Security staff profile not found"
                ));
        if (!profile.getSociety().getId().equals(society.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Security staff profile not found"
            );
        }
        return toResponse(profile);
    }

    public SecurityStaffResponse updateStatus(
            User admin,
            Long staffId,
            SecurityStaffStatus newStatus
    ) {
        requireAdmin(admin);
        Society society = requireAdminSociety(admin);

        SecurityStaffProfile profile = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Security staff profile not found"
                ));
        if (!profile.getSociety().getId().equals(society.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Security staff profile not found"
            );
        }

        profile.setStatus(newStatus);
        User user = profile.getUser();
        if (user.getAccountStatus() != AccountStatus.LOCKED) {
            user.setAccountStatus(
                    newStatus == SecurityStaffStatus.ACTIVE
                            ? AccountStatus.ACTIVE
                            : AccountStatus.INACTIVE
            );
            userRepository.save(user);
        }
        return toResponse(staffRepository.save(profile));
    }

    // ---- helpers ----

    private static void requireAdmin(User actor) {
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.PLATFORM_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private Society requireAdminSociety(User admin) {
        if (admin.getRole() == Role.PLATFORM_ADMIN) {
            return societyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No society found"));
        }
        return societyRepository.findByOwnerOrderByNameAsc(admin)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN"));
    }

    static boolean passwordMeetsPolicy(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private SecurityStaffResponse toResponse(SecurityStaffProfile profile) {
        User user = profile.getUser();
        Society society = profile.getSociety();
        return new SecurityStaffResponse(
                profile.getId(),
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getMobileNumber(),
                society.getId(),
                society.getName(),
                profile.getStatus() != null ? profile.getStatus().name() : null,
                profile.getCreatedAt()
        );
    }
}
