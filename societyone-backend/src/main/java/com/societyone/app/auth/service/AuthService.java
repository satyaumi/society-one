package com.societyone.app.auth.service;

import com.societyone.app.auth.dto.AuthResponse;
import com.societyone.app.auth.dto.ForgotPasswordRequest;
import com.societyone.app.auth.dto.ForgotPasswordResponse;
import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.ResendOtpRequest;
import com.societyone.app.auth.dto.ResetPasswordRequest;
import com.societyone.app.auth.dto.SafeUserResponse;
import com.societyone.app.auth.dto.SignupRequest;
import com.societyone.app.auth.dto.VerifyOtpRequest;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.auth.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OtpService otpService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
    }

    // -------------------------- Public signup --------------------------

    public AuthResponse signup(SignupRequest request) {

        String username = request.username().trim();
        String email = normalize(request.email());
        String mobile = normalizeMobile(request.mobileNumber());

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

        User saved = createUser(request, Role.VISITOR, AccountStatus.ACTIVE);

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
        String email = normalize(request.email());
        String mobile = normalizeMobile(request.mobileNumber());

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
        user.setEmail(normalize(request.email()));
        user.setMobileNumber(normalizeMobile(request.mobileNumber()));

        // Never store plaintext password.
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        user.setRole(role);
        user.setAccountStatus(accountStatus);

        user.setEmailVerified(false);
        user.setMobileVerified(false);

        return userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {

        String method = request.method()
                .trim()
                .toLowerCase(Locale.ROOT);

        String identifier = request.identifier().trim();

        User user = switch (method) {

            case "email" -> userRepository
                    .findByEmailIgnoreCase(identifier)
                    .orElseThrow(this::invalidCredentials);

            case "mobile" -> userRepository
                    .findByMobileNumber(
                            normalizeMobile(identifier)
                    )
                    .orElseThrow(this::invalidCredentials);

            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Authentication method must be email or mobile"
            );
        };

        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Account is not active"
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
        User user = null;
        switch (method) {
            case "email" -> user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
            case "mobile" -> user = userRepository.findByMobileNumber(normalizeMobile(identifier)).orElse(null);
            default -> {
                // Still echo identifier back to avoid enumerating method validity
            }
        }
        if (user != null) {
            String userKey = (user.getEmail() != null) ? user.getEmail() : user.getMobileNumber();
            otpService.generateOtp(userKey != null ? userKey : identifier, "PASSWORD_RESET");
        }
        // Always return 200 with original identifier to avoid user enumeration.
        String echoId = identifier;
        return new ForgotPasswordResponse(echoId);
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
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        if ("SIGNUP".equals(purpose) || "LOGIN".equals(purpose)) {
            // For SIGNUP/LOGIN: find the user by identifier and issue a session token.
            User user = findUserByIdentifier(identifier);
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

    public void resendOtp(ResendOtpRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String purpose = request.purpose() == null || request.purpose().isBlank()
                ? "PASSWORD_RESET"
                : request.purpose().trim().toUpperCase(Locale.ROOT);
        otpService.invalidate(identifier, purpose);
        User user = findUserByIdentifier(identifier);
        if (user != null) {
            String userKey = (user.getEmail() != null) ? user.getEmail() : user.getMobileNumber();
            otpService.generateOtp(userKey != null ? userKey : identifier, purpose);
        }
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

        OtpService.VerifyResult result = otpService.verifyOtp(identifier, purpose, otp);
        switch (result) {
            case VALID -> { }
            case EXPIRED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired");
            case ALREADY_CONSUMED -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has already been used");
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        User user = findUserByIdentifier(identifier);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        // Invalidate any other OTP entries for the same identifier so it cannot be reused.
        otpService.invalidate(identifier, purpose);
    }

    // ---------------- Helpers ----------------

    private User findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        String id = identifier.trim();
        User user = userRepository.findByEmailIgnoreCase(id).orElse(null);
        if (user != null) return user;
        return userRepository.findByMobileNumber(normalizeMobile(id)).orElse(null);
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

    private String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeMobile(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.replaceAll("[^0-9+]", "");
    }
}
