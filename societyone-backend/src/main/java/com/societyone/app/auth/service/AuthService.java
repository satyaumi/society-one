package com.societyone.app.auth.service;

import com.societyone.app.auth.dto.AuthResponse;
import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.SafeUserResponse;
import com.societyone.app.auth.dto.SignupRequest;
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

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse signup(SignupRequest request) {

        String username = request.username().trim();
        String email = normalize(request.email());
        String mobile = normalizeMobile(request.mobileNumber());

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

        User user = new User();

        user.setFullName(request.fullName().trim());
        user.setUsername(username);
        user.setEmail(email);
        user.setMobileNumber(mobile);

        // Never store plaintext password.
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        // Public signup must never trust the frontend intendedRole.
        user.setRole(Role.VISITOR);

        user.setAccountStatus(AccountStatus.ACTIVE);

        user.setEmailVerified(false);
        user.setMobileVerified(false);

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

        /*
         * OTP verification is intentionally not faked here.
         * Real email/mobile verification can be enforced when
         * the OTP subsystem is implemented.
         */

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

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid credentials"
        );
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