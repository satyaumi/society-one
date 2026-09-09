package com.societyone.app.auth.service;

import com.societyone.app.auth.dto.AuthResponse;
import com.societyone.app.auth.dto.ForgotPasswordRequest;
import com.societyone.app.auth.dto.ForgotPasswordResponse;
import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.ResendOtpRequest;
import com.societyone.app.auth.dto.ResetPasswordRequest;
import com.societyone.app.auth.dto.SafeUserResponse;
import com.societyone.app.auth.dto.*;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.auth.security.JwtService;
import com.societyone.app.common.email.EmailService;
import com.societyone.app.common.util.ContactNormalizationService;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.Map;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final EmailService emailService;
    private final OtpDeliveryService otpDeliveryService;
    private final ContactNormalizationService contactNormalizationService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OtpService otpService,
            EmailService emailService,
            OtpDeliveryService otpDeliveryService,
            ContactNormalizationService contactNormalizationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.emailService = emailService;
        this.otpDeliveryService = otpDeliveryService;
        this.contactNormalizationService = contactNormalizationService;
    }

    // -------------------------- Public signup --------------------------

    public AuthResponse signup(SignupRequest request) {

        String username = request.username().trim();
        String email = contactNormalizationService.normalizeEmail(request.email());
        String mobile = contactNormalizationService.normalizeMobile(request.mobileNumber());

        if (email == null && mobile == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one of email or mobile number is required"
            );
        }

        // Server-side enforcement: Email must be verified via OTP prior to account creation
        if (email != null && !email.isBlank()) {
            boolean verified = otpService.consumeVerificationToken(
                    email,
                    "SIGNUP_EMAIL",
                    request.verificationToken()
            );
            if (!verified) {
                verified = otpService.consumeVerificationToken(
                        email,
                        "SIGNUP",
                        request.verificationToken()
                );
            }
            if (!verified) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email verification is required before creating an account. Please verify your email with OTP."
                );
            }
        }

        if (!passwordMeetsPolicy(request.password())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password does not meet requirements"
            );
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username is already registered"
            );
        }

        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        if (mobile != null && userRepository.existsByMobileNumber(mobile)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mobile number is already registered"
            );
        }

        if (request.intendedRole() != null && !request.intendedRole().isBlank()) {
            String ir = request.intendedRole().trim().toUpperCase(Locale.ROOT);
            if ("VISITOR".equals(ir)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Visitors do not require an account. Please use the public visit request page."
                );
            }
            if (!"RESIDENT".equals(ir)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Self-registration is only allowed for the RESIDENT role"
                );
            }
        }
        Role targetRole = Role.RESIDENT;

        User saved = createUser(request, targetRole, AccountStatus.ACTIVE);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendWelcomeEmail(saved.getEmail(), saved.getFullName(), saved.getUsername(), saved.getRole().name());
        }

        String token = jwtService.generateToken(
                saved.getId(),
                saved.getUsername(),
                saved.getRole().name()
        );

        return new AuthResponse(
                token,
                SafeUserResponse.from(saved)
        );
    }

    // -------------------------- First-admin bootstrap --------------------------

    /**
     * True when the system has ZERO ADMIN users.
     *
     * This gates the provisioning endpoint from the outside world:
     *   - Dev / first deploy  → true, UI shows the setup wizard.
     *   - After first admin created → permanently false until DB reset.
     */
    public boolean isFirstAdminSetupAvailable() {
        return userRepository.countByRole(Role.ADMIN) == 0L;
    }

    /**
     * Create the very first ADMIN account.
     *
     * Hard security:
     *   - REJECTS the call if any ADMIN already exists (prevents replay / reuse).
     *   - Reuses the same validation as signup (identifiers, password policy, uniqueness).
     *   - Hashes password with the shared PasswordEncoder.
     *   - Assigns Role.ADMIN + AccountStatus.ACTIVE.
     *   - Issues a normal JWT so the frontend auth store logs in exactly like any other sign-in.
     */
    public AuthResponse provisionFirstAdmin(SignupRequest request) {
        if (!isFirstAdminSetupAvailable()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "First-admin setup is not available: an admin already exists"
            );
        }

        String username = request.username().trim();
        String email = contactNormalizationService.normalizeEmail(request.email());
        String mobile = contactNormalizationService.normalizeMobile(request.mobileNumber());

        if (email == null && mobile == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one of email or mobile number is required"
            );
        }

        if (!passwordMeetsPolicy(request.password())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password does not meet requirements"
            );
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username is already registered"
            );
        }

        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        if (mobile != null && userRepository.existsByMobileNumber(mobile)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mobile number is already registered"
            );
        }

        User saved = createUser(request, Role.ADMIN, AccountStatus.ACTIVE);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendWelcomeEmail(saved.getEmail(), saved.getFullName(), saved.getUsername(), saved.getRole().name());
        }

        String token = jwtService.generateToken(
                saved.getId(),
                saved.getUsername(),
                saved.getRole().name()
        );

        return new AuthResponse(
                token,
                SafeUserResponse.from(saved)
        );
    }

    // -------------------------- First Platform-Admin bootstrap --------------------------

    public boolean isFirstPlatformAdminSetupAvailable() {
        return userRepository.countByRole(Role.PLATFORM_ADMIN) == 0L;
    }

    public AuthResponse provisionFirstPlatformAdmin(SignupRequest request) {
        if (!isFirstPlatformAdminSetupAvailable()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "First platform admin setup is not available: a platform admin already exists"
            );
        }

        String username = request.username().trim();
        String email = contactNormalizationService.normalizeEmail(request.email());
        String mobile = contactNormalizationService.normalizeMobile(request.mobileNumber());

        if (email == null && mobile == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one of email or mobile number is required"
            );
        }

        if (!passwordMeetsPolicy(request.password())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password does not meet requirements"
            );
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username is already registered"
            );
        }

        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        if (mobile != null && userRepository.existsByMobileNumber(mobile)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mobile number is already registered"
            );
        }

        User saved = createUser(request, Role.PLATFORM_ADMIN, AccountStatus.ACTIVE);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendWelcomeEmail(saved.getEmail(), saved.getFullName(), saved.getUsername(), saved.getRole().name());
        }

        String token = jwtService.generateToken(
                saved.getId(),
                saved.getUsername(),
                saved.getRole().name()
        );

        return new AuthResponse(
                token,
                SafeUserResponse.from(saved)
        );
    }

    // -------------------------- Shared user factory --------------------------


    /**
     * Shared User factory used by both public signup and first-admin provisioning.
     * Ensures consistent hashing, timestamps, and field mapping.
     */
    private User createUser(
            SignupRequest request,
            Role role,
            AccountStatus accountStatus
    ) {
        User user = new User();

        user.setFullName(request.fullName().trim());
        user.setUsername(request.username().trim());
        user.setEmail(contactNormalizationService.normalizeEmail(request.email()));
        user.setMobileNumber(contactNormalizationService.normalizeMobile(request.mobileNumber()));

        // Never store plaintext password.
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        user.setRole(role);
        user.setAccountStatus(accountStatus);

        user.setEmailVerified(user.getEmail() != null && !user.getEmail().isBlank());
        user.setMobileVerified(false);

        return userRepository.save(user);
    }

    public Optional<User> findUserByMobile(String mobile) {
        if (mobile == null || mobile.isBlank()) {
            return Optional.empty();
        }
        String canonical = contactNormalizationService.tryNormalizeMobile(mobile);
        if (canonical == null || canonical.isBlank()) {
            return Optional.empty();
        }
        Optional<User> u = userRepository.findByMobileNumber(canonical);
        if (u.isPresent()) {
            return u;
        }
        if (canonical.startsWith("+91") && canonical.length() > 3) {
            String without91 = canonical.substring(3);
            u = userRepository.findByMobileNumber(without91);
            if (u.isPresent()) {
                return u;
            }
        } else if (!canonical.startsWith("+") && canonical.length() == 10) {
            u = userRepository.findByMobileNumber("+91" + canonical);
            if (u.isPresent()) {
                return u;
            }
        }
        return Optional.empty();
    }

    public Optional<User> findUserByIdentifier(String method, String rawIdentifier) {
        if (rawIdentifier == null || rawIdentifier.isBlank()) {
            return Optional.empty();
        }
        String id = rawIdentifier.trim();
        String m = method == null ? "" : method.trim().toLowerCase(Locale.ROOT);

        // 1. If method is mobile
        if ("mobile".equals(m)) {
            return findUserByMobile(id)
                    .or(() -> userRepository.findByUsernameIgnoreCase(id))
                    .or(() -> userRepository.findByEmailIgnoreCase(id));
        }

        // 2. If method is email
        if ("email".equals(m)) {
            return userRepository.findByEmailIgnoreCase(id)
                    .or(() -> userRepository.findByUsernameIgnoreCase(id))
                    .or(() -> findUserByMobile(id));
        }

        // 3. If method is username
        if ("username".equals(m)) {
            return userRepository.findByUsernameIgnoreCase(id)
                    .or(() -> userRepository.findByEmailIgnoreCase(id))
                    .or(() -> findUserByMobile(id));
        }

        // 4. Default ("username_or_email", or general identifier)
        if (id.contains("@")) {
            return userRepository.findByEmailIgnoreCase(id)
                    .or(() -> userRepository.findByUsernameIgnoreCase(id))
                    .or(() -> findUserByMobile(id));
        }

        // Try username first
        Optional<User> byUsername = userRepository.findByUsernameIgnoreCase(id);
        if (byUsername.isPresent()) {
            return byUsername;
        }

        // Try mobile next
        Optional<User> byMobile = findUserByMobile(id);
        if (byMobile.isPresent()) {
            return byMobile;
        }

        // Fallback to email
        return userRepository.findByEmailIgnoreCase(id);
    }

    public AuthResponse login(LoginRequest request) {

        String identifier = request.identifier() != null ? request.identifier().trim() : "";

        User user = findUserByIdentifier(request.method(), identifier)
                .orElseThrow(this::invalidCredentials);

        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Account is not active"
            );
        }

        if (user.getRole() == Role.VISITOR) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Visitors do not require an account. Please use the public visit request page."
            );
        }

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw invalidCredentials();
        }

        user.setLastLoginAt(OffsetDateTime.now());

        User saved = userRepository.save(user);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendLoginAlertEmail(saved.getEmail(), saved.getFullName(), saved.getUsername(), saved.getRole().name());
        }

        String token = jwtService.generateToken(
                saved.getId(),
                saved.getUsername(),
                saved.getRole().name()
        );

        return new AuthResponse(
                token,
                SafeUserResponse.from(saved)
        );
    }

    /**
     * Used by GET /api/auth/me
     */
    public SafeUserResponse getCurrentUser(User user) {
        return SafeUserResponse.from(user);
    }

    // ---------------- Forgot / Reset / Verify OTP ----------------

    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String method = request.method() == null ? "" : request.method().trim().toLowerCase(Locale.ROOT);
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        User user = findUserByIdentifier(method, identifier).orElse(null);

        if (user != null) {
            String code = otpService.generateOtp(identifier, "PASSWORD_RESET");
            String targetEmail = user.getEmail() != null && !user.getEmail().isBlank()
                    ? user.getEmail()
                    : (identifier.contains("@") ? identifier : null);
            if (targetEmail != null) {
                otpDeliveryService.send(OtpChannel.EMAIL, targetEmail, code, "PASSWORD_RESET", OtpService.TTL_MINUTES);
            }
        }

        // Always return 200 with original identifier to avoid user enumeration.
        return new ForgotPasswordResponse(identifier);
    }

    public Object verifyOtp(VerifyOtpRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String purpose = request.purpose() == null || request.purpose().isBlank()
                ? "PASSWORD_RESET"
                : request.purpose().trim().toUpperCase(Locale.ROOT);
        String otp = request.otp() == null ? "" : request.otp().trim();

        OtpService.VerifyResult result = otpService.verifyOtp(identifier, purpose, otp);
        switch (result) {
            case VALID -> { }
            case EXPIRED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired");
            case ALREADY_CONSUMED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has already been used");
            case TOO_MANY_ATTEMPTS -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many failed attempts. Please request a new OTP.");
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        // Signup verification flow: Account has not been created yet
        if ("SIGNUP_EMAIL".equals(purpose) || "SIGNUP".equals(purpose)) {
            String verificationToken = otpService.getVerificationToken(identifier, purpose);
            return Map.of(
                    "verified", true,
                    "verificationToken", verificationToken != null ? verificationToken : "",
                    "identifier", identifier
            );
        }

        User user = findUserByIdentifier(identifier);
        if (user != null) {
            if ("EMAIL_VERIFICATION".equals(purpose) || "PASSWORD_RESET".equals(purpose)) {
                if (identifier.contains("@")) {
                    user.setEmailVerified(true);
                    userRepository.save(user);
                }
            }
        }

        if ("LOGIN".equals(purpose)) {
            if (user == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
            }
            if (user.getAccountStatus() != AccountStatus.ACTIVE) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Account is not active"
                );
            }
            user.setLastLoginAt(OffsetDateTime.now());
            User saved = userRepository.save(user);

            if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
                emailService.sendLoginAlertEmail(saved.getEmail(), saved.getFullName(), saved.getUsername(), saved.getRole().name());
            }

            String token = jwtService.generateToken(
                    saved.getId(),
                    saved.getUsername(),
                    saved.getRole().name()
            );
            return new AuthResponse(token, SafeUserResponse.from(saved));
        }

        // PASSWORD_RESET purpose (and any other unknown purpose) → return verified:true sentinel.
        return Map.of("verified", true);
    }

    public String sendOtp(ResendOtpRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String purpose = request.purpose() == null || request.purpose().isBlank()
                ? "SIGNUP_EMAIL"
                : request.purpose().trim().toUpperCase(Locale.ROOT);

        long cooldown = otpService.getRemainingCooldownSeconds(identifier, purpose);
        if (cooldown > 0) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait " + cooldown + " seconds before requesting another OTP."
            );
        }

        if ("SIGNUP_EMAIL".equals(purpose) || "SIGNUP".equals(purpose)) {
            String email = contactNormalizationService.normalizeEmail(identifier);
            if (email == null || !email.contains("@")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid email address is required");
            }
            if (userRepository.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
            String code = otpService.generateOtp(email, purpose);
            otpDeliveryService.send(OtpChannel.EMAIL, email, code, purpose, OtpService.TTL_MINUTES);
            return code;
        }

        User user = findUserByIdentifier(identifier);
        if (user != null) {
            String code = otpService.generateOtp(identifier, purpose);
            String targetEmail = user.getEmail() != null && !user.getEmail().isBlank()
                    ? user.getEmail()
                    : (identifier.contains("@") ? identifier : null);
            if (targetEmail != null) {
                otpDeliveryService.send(OtpChannel.EMAIL, targetEmail, code, purpose, OtpService.TTL_MINUTES);
            }
            return code;
        } else if (identifier.contains("@")) {
            // Also generate and attempt send if identifier looks like email to prevent enumeration
            String code = otpService.generateOtp(identifier, purpose);
            otpDeliveryService.send(OtpChannel.EMAIL, identifier, code, purpose, OtpService.TTL_MINUTES);
            return code;
        }
        return null;
    }

    public String resendOtp(ResendOtpRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String purpose = request.purpose() == null || request.purpose().isBlank()
                ? "PASSWORD_RESET"
                : request.purpose().trim().toUpperCase(Locale.ROOT);

        long cooldown = otpService.getRemainingCooldownSeconds(identifier, purpose);
        if (cooldown > 0) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait " + cooldown + " seconds before requesting another OTP."
            );
        }

        otpService.invalidate(identifier, purpose);
        return sendOtp(request);
    }

    public void resetPassword(ResetPasswordRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String otp = request.otp() == null ? "" : request.otp().trim();
        String purpose = "PASSWORD_RESET";

        if (!passwordMeetsPolicy(request.newPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password does not meet requirements"
            );
        }

        OtpService.VerifyResult result = otpService.consumeOtp(identifier, purpose, otp);
        switch (result) {
            case VALID -> { }
            case EXPIRED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired");
            case ALREADY_CONSUMED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has already been used");
            case TOO_MANY_ATTEMPTS -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many failed attempts. Please request a new OTP.");
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        User user = findUserByIdentifier(identifier);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        if (identifier.contains("@")) {
            user.setEmailVerified(true);
        }
        User saved = userRepository.save(user);
        // Invalidate any other OTP entries for the same identifier so it cannot be reused.
        otpService.invalidate(identifier, purpose);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendPasswordResetSuccessEmail(saved.getEmail(), saved.getFullName(), saved.getUsername());
        }
    }

    // ---------------- Profile & Settings ----------------

    public SafeUserResponse updateProfile(User user, UpdateProfileRequest request) {
        String newUsername = request.username().trim();
        if (!newUsername.equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsernameIgnoreCase(newUsername)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
            }
            user.setUsername(newUsername);
        }
        user.setFullName(request.fullName().trim());
        User saved = userRepository.save(user);
        return SafeUserResponse.from(saved);
    }

    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (!passwordMeetsPolicy(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password does not meet requirements");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        User saved = userRepository.save(user);

        if (saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.sendPasswordResetSuccessEmail(saved.getEmail(), saved.getFullName(), saved.getUsername());
        }
    }

    public SafeUserResponse changeEmail(User user, ChangeEmailRequest request) {
        String newEmail = contactNormalizationService.normalizeEmail(request.newEmail());
        if (newEmail != null && !newEmail.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(newEmail)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
            user.setEmail(newEmail);
            user.setEmailVerified(false);
            User saved = userRepository.save(user);
            String code = otpService.generateOtp(newEmail, "EMAIL_VERIFICATION");
            otpDeliveryService.send(OtpChannel.EMAIL, newEmail, code, "EMAIL_VERIFICATION", OtpService.TTL_MINUTES);
            return SafeUserResponse.from(saved);
        }
        return SafeUserResponse.from(user);
    }

    public SafeUserResponse changeMobile(User user, ChangeMobileRequest request) {
        String newMobile = contactNormalizationService.normalizeMobile(request.newMobileNumber());
        if (newMobile != null && !newMobile.equals(user.getMobileNumber())) {
            if (userRepository.existsByMobileNumber(newMobile)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Mobile number is already registered");
            }
            user.setMobileNumber(newMobile);
            user.setMobileVerified(false);
            User saved = userRepository.save(user);
            return SafeUserResponse.from(saved);
        }
        return SafeUserResponse.from(user);
    }

    public SafeUserResponse uploadProfilePhoto(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file uploaded");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size must be under 5MB");
        }
        String contentType = file.getContentType();
        Set<String> allowedTypes = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
        if (contentType == null || !allowedTypes.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, WEBP, and GIF images are allowed");
        }

        try {
            Path uploadDir = Paths.get("uploads", "avatars");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                case "image/gif" -> ".gif";
                default -> ".jpg";
            };
            String filename = "avatar_" + user.getId() + "_" + System.currentTimeMillis() + extension;
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            user.setProfilePhotoUrl("/uploads/avatars/" + filename);
            User saved = userRepository.save(user);
            return SafeUserResponse.from(saved);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save profile image");
        }
    }

    public SafeUserResponse deleteProfilePhoto(User user) {
        String currentUrl = user.getProfilePhotoUrl();
        if (currentUrl != null && currentUrl.startsWith("/uploads/avatars/")) {
            try {
                Path filePath = Paths.get(currentUrl.substring(1));
                Files.deleteIfExists(filePath);
            } catch (Exception ignored) {
            }
        }
        user.setProfilePhotoUrl(null);
        User saved = userRepository.save(user);
        return SafeUserResponse.from(saved);
    }

    public void deleteAccount(User user, DeleteAccountRequest request) {
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is incorrect");
        }
        user.setAccountStatus(AccountStatus.INACTIVE);
        userRepository.save(user);
    }

    // ---------------- Helpers ----------------

    private User findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        String id = identifier.trim();
        User user = userRepository.findByEmailIgnoreCase(id).orElse(null);
        if (user != null) return user;
        String canonical = contactNormalizationService.tryNormalizeMobile(id);
        if (canonical != null) {
            user = userRepository.findByMobileNumber(canonical).orElse(null);
            if (user != null) return user;
        }
        return null;
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid credentials"
        );
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
}
