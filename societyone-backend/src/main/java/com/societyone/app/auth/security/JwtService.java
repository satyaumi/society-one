package com.societyone.app.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${societyone.security.jwt.secret}") String secret,
            @Value("${societyone.security.jwt.expiration-ms}") long expirationMs
    ) {
        this.secretKey = createSecretKey(secret);
        this.expirationMs = expirationMs;
    }

    private SecretKey createSecretKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not configured");
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(secret);

            if (decoded.length < 32) {
                throw new IllegalStateException(
                        "JWT_SECRET must decode to at least 32 bytes"
                );
            }

            return Keys.hmacShaKeyFor(decoded);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                    "JWT_SECRET must be a valid Base64-encoded secret",
                    ex
            );
        }
    }

    public String generateToken(
            Long userId,
            String username,
            String role
    ) {
        Date issuedAt = new Date();
        Date expiration = new Date(
                issuedAt.getTime() + expirationMs
        );

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .claim("role", role)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        Number userId = extractClaims(token).get("userId", Number.class);
        return userId == null ? null : userId.longValue();
    }

    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isTokenValid(String token, String username) {
        try {
            Claims claims = extractClaims(token);

            return username.equals(claims.getSubject())
                    && claims.getExpiration().after(new Date());
        } catch (Exception ex) {
            return false;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}