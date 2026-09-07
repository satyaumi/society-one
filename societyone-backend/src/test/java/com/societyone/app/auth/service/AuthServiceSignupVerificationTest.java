package com.societyone.app.auth.service;

import com.societyone.app.auth.dto.LoginRequest;
import com.societyone.app.auth.dto.ResendOtpRequest;
import com.societyone.app.auth.dto.SignupRequest;
import com.societyone.app.auth.dto.VerifyOtpRequest;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.auth.security.JwtService;
import com.societyone.app.common.email.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceSignupVerificationTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private OtpService otpService;
    private EmailService emailService;
    private OtpDeliveryService otpDeliveryService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = mock(JwtService.class);
        emailService = mock(EmailService.class);

        otpService = new OtpService();
        EmailOtpSender emailSender = new EmailOtpSender(emailService);
        MobileSmsOtpSender smsSender = new MobileSmsOtpSender();
        otpDeliveryService = new OtpDeliveryService(List.of(emailSender, smsSender));

        when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "hashed_" + invocation.getArgument(0));
        when(passwordEncoder.matches(anyString(), anyString())).thenAnswer(invocation ->
                ("hashed_" + invocation.getArgument(0)).equals(invocation.getArgument(1)));

        when(jwtService.generateToken(any(), anyString(), anyString())).thenReturn("mock-jwt-token");

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                otpService,
                emailService,
                otpDeliveryService
        );
    }

    @Test
    @DisplayName("Email signup is REJECTED with 400 when email is not verified via OTP")
    void testEmailSignupRejectsUnverifiedEmail() {
        SignupRequest request = new SignupRequest(
                "Alice Resident",
                "aliceresident",
                "alice@example.com",
                null,
                "Password@123",
                "RESIDENT",
                null // No verification token
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authService.signup(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Email verification is required"));
    }

    @Test
    @DisplayName("Email signup is REJECTED when invalid verification token is supplied")
    void testEmailSignupRejectsInvalidToken() {
        SignupRequest request = new SignupRequest(
                "Bob Resident",
                "bobresident",
                "bob@example.com",
                null,
                "Password@123",
                "RESIDENT",
                "invalid-token-12345"
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> authService.signup(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Email verification is required"));
    }

    @Test
    @DisplayName("Complete Email signup flow succeeds with verified OTP and single-use token")
    void testEmailSignupCompleteFlow() {
        String email = "carol@example.com";

        // Step 1: Send OTP
        authService.sendOtp(new ResendOtpRequest(email, "SIGNUP_EMAIL"));
        verify(emailService, times(1)).sendOtpEmail(eq(email), anyString(), eq("SIGNUP_EMAIL"), eq(OtpService.TTL_MINUTES));

        // Step 2: Verify OTP
        String validCode = otpService.generateOtp(email, "SIGNUP_EMAIL");
        Object verifyResult = authService.verifyOtp(new VerifyOtpRequest(email, validCode, "SIGNUP_EMAIL"));

        assertTrue(verifyResult instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) verifyResult;
        assertEquals(true, map.get("verified"));
        String verificationToken = (String) map.get("verificationToken");
        assertNotNull(verificationToken);
        assertFalse(verificationToken.isBlank());

        // Step 3: Signup with valid token
        SignupRequest signupRequest = new SignupRequest(
                "Carol Resident",
                "carolresident",
                email,
                "+919876543210",
                "Password@123",
                "RESIDENT",
                verificationToken
        );

        var authResponse = authService.signup(signupRequest);
        assertNotNull(authResponse);
        assertEquals("mock-jwt-token", authResponse.token());
        assertEquals("carolresident", authResponse.user().username());

        // Verify entity state saved in repository
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertTrue(savedUser.isEmailVerified());
        assertFalse(savedUser.isMobileVerified());

        // Step 4: Token cannot be reused (Single-Use Guard)
        ResponseStatusException replayEx = assertThrows(ResponseStatusException.class, () -> authService.signup(signupRequest));
        assertEquals(HttpStatus.BAD_REQUEST, replayEx.getStatusCode());
    }

    @Test
    @DisplayName("Mobile signup succeeds directly WITHOUT requiring OTP verification")
    void testMobileSignupWithoutOtp() {
        SignupRequest mobileSignup = new SignupRequest(
                "Dave Resident",
                "daveresident",
                null,
                "+919876543210",
                "Password@123",
                "RESIDENT",
                null
        );

        var authResponse = authService.signup(mobileSignup);
        assertNotNull(authResponse);
        assertEquals("daveresident", authResponse.user().username());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertFalse(savedUser.isEmailVerified());
        assertFalse(savedUser.isMobileVerified());

        // Verifies NO email OTP was sent
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("First-admin setup provisioning succeeds without requiring prior OTP")
    void testProvisionFirstAdmin() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        SignupRequest adminRequest = new SignupRequest(
                "Admin User",
                "adminuser",
                "admin@example.com",
                "+919876543210",
                "Password@123",
                null
        );

        var authResponse = authService.provisionFirstAdmin(adminRequest);
        assertNotNull(authResponse);
        assertEquals("adminuser", authResponse.user().username());
        assertEquals("ADMIN", authResponse.user().role());
    }

    @Test
    @DisplayName("Existing Login flow functions normally")
    void testExistingLogin() {
        User existingUser = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(existingUser, "id", 101L);
        existingUser.setUsername("existinguser");
        existingUser.setPasswordHash(passwordEncoder.encode("Password@123"));
        existingUser.setRole(Role.RESIDENT);
        existingUser.setAccountStatus(AccountStatus.ACTIVE);

        when(userRepository.findByUsernameIgnoreCase("existinguser")).thenReturn(Optional.of(existingUser));

        LoginRequest loginRequest = new LoginRequest("username", "existinguser", "Password@123", "RESIDENT");
        var authResponse = authService.login(loginRequest);

        assertNotNull(authResponse);
        assertEquals("existinguser", authResponse.user().username());
    }
}
