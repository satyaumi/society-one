package com.societyone.app.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OtpServiceTest {

    private OtpService otpService;

    @BeforeEach
    void setUp() {
        otpService = new OtpService();
    }

    @Test
    @DisplayName("generateOtp returns 6-digit code and enforces resend cooldown")
    void testGenerateOtpAndCooldown() {
        String email = "resident@example.com";
        String purpose = "SIGNUP_EMAIL";

        String code = otpService.generateOtp(email, purpose);
        assertNotNull(code);
        assertEquals(6, code.length());
        assertTrue(code.matches("\\d{6}"));

        long remainingCooldown = otpService.getRemainingCooldownSeconds(email, purpose);
        assertTrue(remainingCooldown > 0 && remainingCooldown <= OtpService.RESEND_COOLDOWN_SECONDS);
    }

    @Test
    @DisplayName("verifyOtp accepts correct OTP and issues verification token")
    void testVerifyOtpSuccess() {
        String email = "verify-success@example.com";
        String purpose = "SIGNUP_EMAIL";

        String code = otpService.generateOtp(email, purpose);
        OtpService.VerifyResult result = otpService.verifyOtp(email, purpose, code);

        assertEquals(OtpService.VerifyResult.VALID, result);

        String token = otpService.getVerificationToken(email, purpose);
        assertNotNull(token);
        assertEquals(64, token.length()); // 32 bytes hex
    }

    @Test
    @DisplayName("verifyOtp rejects incorrect code and increments attempt counter")
    void testVerifyOtpIncorrectCode() {
        String email = "incorrect-otp@example.com";
        String purpose = "SIGNUP_EMAIL";

        otpService.generateOtp(email, purpose);

        OtpService.VerifyResult result = otpService.verifyOtp(email, purpose, "000000");
        assertEquals(OtpService.VerifyResult.INVALID, result);
    }

    @Test
    @DisplayName("verifyOtp blocks verification after maximum failed attempts (5)")
    void testMaxAttemptsExceeded() {
        String email = "lockout@example.com";
        String purpose = "SIGNUP_EMAIL";

        String validCode = otpService.generateOtp(email, purpose);

        // 4 failed attempts
        for (int i = 0; i < 4; i++) {
            assertEquals(OtpService.VerifyResult.INVALID, otpService.verifyOtp(email, purpose, "999999"));
        }

        // 5th failed attempt -> TOO_MANY_ATTEMPTS
        assertEquals(OtpService.VerifyResult.TOO_MANY_ATTEMPTS, otpService.verifyOtp(email, purpose, "999999"));

        // Subsequent attempt with the CORRECT code is blocked due to lockout
        assertEquals(OtpService.VerifyResult.TOO_MANY_ATTEMPTS, otpService.verifyOtp(email, purpose, validCode));
    }

    @Test
    @DisplayName("verifyOtp rejects expired OTP")
    void testExpiredOtp() {
        String email = "expired@example.com";
        String purpose = "SIGNUP_EMAIL";

        String code = otpService.generateOtp(email, purpose);
        otpService.forceExpire(email, purpose);

        OtpService.VerifyResult result = otpService.verifyOtp(email, purpose, code);
        assertEquals(OtpService.VerifyResult.EXPIRED, result);
    }

    @Test
    @DisplayName("consumeVerificationToken enforces single-use and rejects invalid tokens")
    void testConsumeVerificationTokenSingleUse() {
        String email = "single-use@example.com";
        String purpose = "SIGNUP_EMAIL";

        String code = otpService.generateOtp(email, purpose);
        assertEquals(OtpService.VerifyResult.VALID, otpService.verifyOtp(email, purpose, code));

        String validToken = otpService.getVerificationToken(email, purpose);
        assertNotNull(validToken);

        // Wrong token rejected
        assertFalse(otpService.consumeVerificationToken(email, purpose, "wrong-token-abc"));

        // Valid token consumed
        assertTrue(otpService.consumeVerificationToken(email, purpose, validToken));

        // Replay attempt fails: cannot reuse consumed token
        assertFalse(otpService.consumeVerificationToken(email, purpose, validToken));
    }

    @Test
    @DisplayName("consumeOtp succeeds and marks OTP consumed atomically")
    void testConsumeOtpAtomically() {
        String email = "consume@example.com";
        String purpose = "PASSWORD_RESET";

        String code = otpService.generateOtp(email, purpose);
        assertEquals(OtpService.VerifyResult.VALID, otpService.consumeOtp(email, purpose, code));

        // Attempting to consume again fails with ALREADY_CONSUMED
        assertEquals(OtpService.VerifyResult.ALREADY_CONSUMED, otpService.consumeOtp(email, purpose, code));
    }
}
