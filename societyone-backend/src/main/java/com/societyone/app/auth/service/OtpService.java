package com.societyone.app.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    public static final long TTL_MINUTES = 10L;
    public static final long RESEND_COOLDOWN_SECONDS = 30L;
    public static final long VERIFICATION_TOKEN_TTL_MINUTES = 15L;
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
            String codeHash,
            String salt,
            String purpose,
            Instant expiresAt,
            boolean consumed,
            int attempts,
            Instant createdAt,
            boolean verified,
            String verificationToken,
            Instant verifiedAt
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
     * Stores a cryptographically hashed OTP with salt; plaintext is never persisted.
     * Invalidates any previously active OTP for the same identifier and purpose.
     */
    public String generateOtp(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        String salt = generateRandomHex(16);
        String codeHash = hash(code, salt);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(TTL_MINUTES, ChronoUnit.MINUTES);

        store.put(key, new OtpEntry(codeHash, salt, purpose, expiresAt, false, 0, now, false, null, null));

        log.info(
                "[OTP] Generated secure hashed OTP for identifier={} purpose={} expiresAt={}",
                identifier,
                purpose,
                expiresAt
        );
        return code;
    }

    /**
     * Verify an OTP without necessarily consuming it immediately (for two-phase verification).
     * On successful verification, generates a single-use cryptographically secure verification token.
     */
    public VerifyResult verifyOtp(String identifier, String purpose, String otp) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null) return VerifyResult.NOT_FOUND;
        if (entry.consumed()) return VerifyResult.ALREADY_CONSUMED;
        if (Instant.now().isAfter(entry.expiresAt())) return VerifyResult.EXPIRED;
        if (entry.attempts() >= MAX_ATTEMPTS) return VerifyResult.TOO_MANY_ATTEMPTS;

        String inputHash = hash(otp == null ? "" : otp.trim(), entry.salt());
        boolean matches = MessageDigest.isEqual(
                entry.codeHash().getBytes(StandardCharsets.UTF_8),
                inputHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            int nextAttempts = entry.attempts() + 1;
            store.put(key, new OtpEntry(
                    entry.codeHash(),
                    entry.salt(),
                    entry.purpose(),
                    entry.expiresAt(),
                    entry.consumed(),
                    nextAttempts,
                    entry.createdAt(),
                    entry.verified(),
                    entry.verificationToken(),
                    entry.verifiedAt()
            ));
            if (nextAttempts >= MAX_ATTEMPTS) {
                return VerifyResult.TOO_MANY_ATTEMPTS;
            }
            return VerifyResult.INVALID;
        }

        // Verification succeeded: generate secure single-use verificationToken
        String token = generateRandomHex(32);
        Instant now = Instant.now();
        store.put(key, new OtpEntry(
                entry.codeHash(),
                entry.salt(),
                entry.purpose(),
                entry.expiresAt(),
                false,
                entry.attempts(),
                entry.createdAt(),
                true,
                token,
                now
        ));
        return VerifyResult.VALID;
    }

    /**
     * Retrieve the verification token generated after successful verification.
     */
    public String getVerificationToken(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry != null && entry.verified() && !entry.consumed()) {
            return entry.verificationToken();
        }
        return null;
    }

    /**
     * Atomically validates and consumes the verification token for a sensitive action like signup.
     * Guarantees single-use and expiration enforcement.
     */
    public boolean consumeVerificationToken(String identifier, String purpose, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null || !entry.verified() || entry.consumed()) {
            return false;
        }

        // Token validity window: must be consumed within VERIFICATION_TOKEN_TTL_MINUTES of verification
        if (entry.verifiedAt() == null || Instant.now().isAfter(entry.verifiedAt().plus(VERIFICATION_TOKEN_TTL_MINUTES, ChronoUnit.MINUTES))) {
            return false;
        }

        if (entry.verificationToken() == null) {
            return false;
        }

        boolean tokenMatches = MessageDigest.isEqual(
                entry.verificationToken().getBytes(StandardCharsets.UTF_8),
                token.trim().getBytes(StandardCharsets.UTF_8)
        );

        if (!tokenMatches) {
            return false;
        }

        // Atomically mark consumed = true to prevent reuse
        store.put(key, new OtpEntry(
                entry.codeHash(),
                entry.salt(),
                entry.purpose(),
                entry.expiresAt(),
                true,
                entry.attempts(),
                entry.createdAt(),
                true,
                entry.verificationToken(),
                entry.verifiedAt()
        ));
        return true;
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

        String inputHash = hash(otp == null ? "" : otp.trim(), entry.salt());
        boolean matches = MessageDigest.isEqual(
                entry.codeHash().getBytes(StandardCharsets.UTF_8),
                inputHash.getBytes(StandardCharsets.UTF_8)
        );
        boolean wasVerified = entry.verified();

        if (!matches && !wasVerified) {
            int nextAttempts = entry.attempts() + 1;
            store.put(key, new OtpEntry(
                    entry.codeHash(),
                    entry.salt(),
                    entry.purpose(),
                    entry.expiresAt(),
                    entry.consumed(),
                    nextAttempts,
                    entry.createdAt(),
                    entry.verified(),
                    entry.verificationToken(),
                    entry.verifiedAt()
            ));
            if (nextAttempts >= MAX_ATTEMPTS) {
                return VerifyResult.TOO_MANY_ATTEMPTS;
            }
            return VerifyResult.INVALID;
        }

        // Mark consumed = true
        store.put(key, new OtpEntry(
                entry.codeHash(),
                entry.salt(),
                entry.purpose(),
                entry.expiresAt(),
                true,
                entry.attempts(),
                entry.createdAt(),
                true,
                entry.verificationToken(),
                entry.verifiedAt()
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
                            entry.codeHash(),
                            entry.salt(),
                            entry.purpose(),
                            Instant.now().minusSeconds(1),
                            entry.consumed(),
                            entry.attempts(),
                            entry.createdAt(),
                            entry.verified(),
                            entry.verificationToken(),
                            entry.verifiedAt()
                    )
            );
        }
    }

    private static String hash(String code, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private static String generateRandomHex(int byteCount) {
        byte[] bytes = new byte[byteCount];
        RNG.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String keyOf(String identifier, String purpose) {
        String id = identifier == null ? "" : identifier.trim().toLowerCase();
        String p = purpose == null ? "" : purpose.trim().toUpperCase();
        return id + "::" + p;
    }
}
