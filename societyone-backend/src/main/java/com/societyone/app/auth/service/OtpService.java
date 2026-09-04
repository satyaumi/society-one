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
    private static final long TTL_MINUTES = 5L;
    private static final SecureRandom RNG = new SecureRandom();

    public enum VerifyResult {
        VALID,
        INVALID,
        EXPIRED,
        ALREADY_CONSUMED,
        NOT_FOUND
    }

    record OtpEntry(
            String code,
            String purpose,
            Instant expiresAt,
            boolean consumed
    ) {}

    /**
     * Key = identifier + "::" + purpose (normalized).
     */
    private final ConcurrentHashMap<String, OtpEntry> store = new ConcurrentHashMap<>();

    public String generateOtp(String identifier, String purpose) {
        String key = keyOf(identifier, purpose);
        String code = String.format("%06d", RNG.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(TTL_MINUTES, ChronoUnit.MINUTES);
        store.put(key, new OtpEntry(code, purpose, expiresAt, false));
        log.info(
                "[OTP] Generated for identifier={} purpose={} OTP={} expiresAt={}",
                identifier,
                purpose,
                code,
                expiresAt
        );
        return code;
    }

    public VerifyResult verifyOtp(String identifier, String purpose, String otp) {
        String key = keyOf(identifier, purpose);
        OtpEntry entry = store.get(key);
        if (entry == null) return VerifyResult.NOT_FOUND;
        if (entry.consumed()) return VerifyResult.ALREADY_CONSUMED;
        if (Instant.now().isAfter(entry.expiresAt())) return VerifyResult.EXPIRED;
        if (!Objects.equals(entry.code(), otp)) return VerifyResult.INVALID;
        store.put(key, new OtpEntry(entry.code(), entry.purpose(), entry.expiresAt(), true));
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
                            entry.consumed()
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
