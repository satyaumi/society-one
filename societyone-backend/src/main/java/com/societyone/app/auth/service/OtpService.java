package com.societyone.app.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    public static final long TTL_MINUTES = 10L;
    public static final long RESEND_COOLDOWN_SECONDS = 30L;
    public static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RNG = new SecureRandom();

    public enum VerifyResult {
        VALID,
        INVALID,
        EXPIRED,
        ALREADY_CONSUMED,
        TOO_MANY_ATTEMPTS,
        NOT_FOUND
    }

    record OtpEntry(
            String code,
            String purpose,
            Instant expiresAt,
            boolean consumed,
            int attempts,
            Instant createdAt,
            boolean verified
    ) {}

    /**
     * Key = identifier + "::" + purpose (normalized).
     */
    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();

    /**
     * Get remaining cooldown seconds before a new OTP can be requested.
     * Returns 0 if no active cooldown.
     */
    public long getRemainingCooldownSeconds(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null) return 0;
        Instant allowedAfter = entry.createdAt().plus(RESEND_COOLDOWN_SECONDS, ChronoUnit.SECONDS);
        long remaining = Instant.now().until(allowedAfter, ChronoUnit.SECONDS);
        return Math.max(0, remaining);
    }

    /**
     * Generate a new 6-digit OTP for the given identifier and purpose.
     * Invalidates any previously active OTP for the same identifier and purpose.
     */
    public String generateOtp(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        Instant now = Instant.now();
        Instant expiresAt = now.plus(TTL_MINUTES, ChronoUnit.MINUTES);

        store.put(key, new OtpEntry(code, purpose, expiresAt, false, 0, now, false));

        log.info(
                "[OTP] Generated for identifier={} purpose={} OTP={} expiresAt={}",
                identifier,
                purpose,
                code,
                expiresAt
        );
        return code;
    }

    /**
     * Verify an OTP without necessarily consuming it immediately (for two-phase verification).
     */
    public VerifyResult verifyOtp(String identifier, String purpose, String otp) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null) return VerifyResult.NOT_FOUND;
        if (entry.consumed()) return VerifyResult.ALREADY_CONSUMED;
        if (Instant.now().isAfter(entry.expiresAt())) return VerifyResult.EXPIRED;
        if (entry.attempts() >= MAX_ATTEMPTS) return VerifyResult.TOO_MANY_ATTEMPTS;

        if (!Objects.equals(entry.code(), otp)) {
            int nextAttempts = entry.attempts() + 1;
            store.put(key, new OtpEntry(
                    entry.code(),
                    entry.purpose(),
                    entry.expiresAt(),
                    entry.consumed(),
                    nextAttempts,
                    entry.createdAt(),
                    entry.verified()
            ));
            if (nextAttempts >= MAX_ATTEMPTS) {
                return VerifyResult.TOO_MANY_ATTEMPTS;
            }
            return VerifyResult.INVALID;
        }

        // Mark verified = true so consumer can finalize (e.g. resetPassword)
        store.put(key, new OtpEntry(
                entry.code(),
                entry.purpose(),
                entry.expiresAt(),
                false,
                entry.attempts(),
                entry.createdAt(),
                true
        ));
        return VerifyResult.VALID;
    }

    /**
     * Consumes the OTP atomically for a sensitive action like password reset.
     * Succeeds if the code matches OR if the OTP was already verified in the current session.
     */
    public VerifyResult consumeOtp(String identifier, String purpose, String otp) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null) return VerifyResult.NOT_FOUND;
        if (entry.consumed()) return VerifyResult.ALREADY_CONSUMED;
        if (Instant.now().isAfter(entry.expiresAt())) return VerifyResult.EXPIRED;
        if (entry.attempts() >= MAX_ATTEMPTS) return VerifyResult.TOO_MANY_ATTEMPTS;

        boolean matches = Objects.equals(entry.code(), otp);
        boolean wasVerified = entry.verified();

        if (!matches && !wasVerified) {
            int nextAttempts = entry.attempts() + 1;
            store.put(key, new OtpEntry(
                    entry.code(),
                    entry.purpose(),
                    entry.expiresAt(),
                    entry.consumed(),
                    nextAttempts,
                    entry.createdAt(),
                    entry.verified()
            ));
            if (nextAttempts >= MAX_ATTEMPTS) {
                return VerifyResult.TOO_MANY_ATTEMPTS;
            }
            return VerifyResult.INVALID;
        }

        // Mark consumed = true
        store.put(key, new OtpEntry(
                entry.code(),
                entry.purpose(),
                entry.expiresAt(),
                true,
                entry.attempts(),
                entry.createdAt(),
                true
        ));
        return VerifyResult.VALID;
    }

    public void invalidate(String identifier, String purpose) {
        store.remove(keyOf(identifier, purpose));
    }

    /** Package-private for tests: force-expire an OTP entry. */
    void forceExpire(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry != null) {
            store.put(
                    key,
                    new OtpEntry(
                            entry.code(),
                            entry.purpose(),
                            Instant.now().minusSeconds(1),
                            entry.consumed(),
                            entry.attempts(),
                            entry.createdAt(),
                            entry.verified()
                    )
            );
        }
    }

    private static String keyOf(String identifier, String purpose) {
        String id = identifier == null ? "" : identifier.trim().toLowerCase();
        String p = purpose == null ? "" : purpose.trim().toUpperCase();
        return id + "::" + p;
    }
}
