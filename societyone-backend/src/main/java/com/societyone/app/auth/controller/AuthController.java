package com.societyone.app.auth.controller;

import com.societyone.app.auth.dto.AuthResponse;
import com.societyone.app.auth.dto.ForgotPasswordRequest;
import com.societyone.app.auth.dto.ForgotPasswordResponse;
import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.ResendOtpRequest;
import com.societyone.app.auth.dto.ResetPasswordRequest;
import com.societyone.app.auth.dto.SafeUserResponse;
import com.societyone.app.auth.dto.SignupRequest;
import com.societyone.app.auth.dto.VerifyOtpRequest;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.service.AuthService;
import com.societyone.app.common.api.ApiResponse;

import jakarta.validation.Valid;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Create a new account.
     *
     * Public signup is intentionally restricted to VISITOR role only.
     * Admin + Security accounts are created via invitation/provisioning, not here.
     */
    @PostMapping("/signup")
    public ApiResponse<AuthResponse> signup(
            @Valid @RequestBody SignupRequest request
    ) {

        AuthResponse response = authService.signup(request);

        return ApiResponse.success(
                response,
                "Account created successfully"
        );
    }

    /**
     * Check whether first-admin setup is available.
     *
     * Returns { available: true } only when the database has ZERO ADMIN users.
     * The frontend uses this to optionally show the "Create society admin" wizard.
     * Once an admin exists, this endpoint permanently returns false until DB reset.
     */
    @GetMapping("/setup/status")
    public ApiResponse<Map<String, Boolean>> setupStatus() {
        boolean available = authService.isFirstAdminSetupAvailable();
        return ApiResponse.success(
                Map.of("available", available),
                available ? "First-admin setup is available" : "Admin setup is complete"
        );
    }

    /**
     * Provision the FIRST ADMIN account.
     *
     * Server-side hardening:
     *   - Immediately FORBIDDEN if any ADMIN already exists (countByRole(ADMIN) > 0).
     *   - Uses the same password policy, identifier validation, and uniqueness checks as signup.
     *   - Hashes the password with the configured PasswordEncoder.
     *   - Issues a standard JWT so the frontend auth store boots normally.
     *
     * This endpoint is intentionally NOT behind an auth wall: the whole point is that
     * the system has no admins yet, so no one could hold an ADMIN JWT to call it.
     * The single-use guard (countByRole) is the rate-limiter + security gate.
     */
    @PostMapping("/setup/first-admin")
    public ApiResponse<AuthResponse> provisionFirstAdmin(
            @Valid @RequestBody SignupRequest request
    ) {
        AuthResponse response = authService.provisionFirstAdmin(request);
        return ApiResponse.success(
                response,
                "First admin account created successfully"
        );
    }

    /**
     * Login using email or mobile number.
     */
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {

        AuthResponse response = authService.login(request);

        return ApiResponse.success(
                response,
                "Login successful"
        );
    }

    /**
     * Return the currently authenticated user.
     *
     * The JWT filter places the User entity into Authentication.
     */
    @GetMapping("/me")
    public ApiResponse<SafeUserResponse> me(
            Authentication authentication
    ) {

        User user = (User) authentication.getPrincipal();

        SafeUserResponse response =
                authService.getCurrentUser(user);

        return ApiResponse.success(response);
    }

    /**
     * JWT authentication is stateless.
     *
     * The frontend removes the token locally.
     * There is no server-side session to invalidate.
     */
    @PostMapping("/logout")
    public ApiResponse<Void> logout() {

        return ApiResponse.success(
                null,
                "Logged out successfully"
        );
    }

    /**
     * Start the forgot-password flow.
     *
     * Always echoes back the identifier to avoid user enumeration.
     * If the account exists, an OTP is generated and logged server-side.
     */
    @PostMapping("/forgot-password")
    public ApiResponse<ForgotPasswordResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        ForgotPasswordResponse response = authService.forgotPassword(request);
        return ApiResponse.success(
                response,
                "If this account exists, a verification code has been sent"
        );
    }

    /**
     * Verify an OTP.
     *
     * Purpose PASSWORD_RESET -> returns {verified:true} so frontend can proceed.
     * Purpose SIGNUP/LOGIN   -> returns full AuthResponse (JWT + user).
     */
    @PostMapping("/verify-otp")
    public ApiResponse<Object> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        Object result = authService.verifyOtp(request);
        if (result instanceof AuthResponse auth) {
            return ApiResponse.success(auth, "Verification successful");
        }
        return ApiResponse.success(result, "Verification successful");
    }

    /**
     * Resend a previously generated OTP (invalidates the old one).
     */
    @PostMapping("/resend-otp")
    public ApiResponse<Void> resendOtp(
            @Valid @RequestBody ResendOtpRequest request
    ) {
        authService.resendOtp(request);
        return ApiResponse.success(null, "Verification code resent");
    }

    /**
     * Reset password after OTP verification.
     */
    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(request);
        return ApiResponse.success(
                null,
                "Password has been updated successfully"
        );
    }
}