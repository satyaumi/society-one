package com.societyone.app.auth.controller;

import com.societyone.app.auth.dto.AuthResponse;
import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.SafeUserResponse;
import com.societyone.app.auth.dto.SignupRequest;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.service.AuthService;
import com.societyone.app.common.api.ApiResponse;

import jakarta.validation.Valid;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Create a new account.
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
}