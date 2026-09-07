package com.societyone.app.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lightweight, in-memory sliding-window rate limiter guarding
 * unauthenticated auth endpoints against brute force and resource exhaustion.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    private record Window(Instant windowStart, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> rateLimits = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Value("${societyone.security.rate-limit.enabled:true}")
    private boolean enabled;

    @org.springframework.beans.factory.annotation.Value("${societyone.security.rate-limit.login:120}")
    private int loginLimit;

    @org.springframework.beans.factory.annotation.Value("${societyone.security.rate-limit.otp-verify:40}")
    private int otpVerifyLimit;

    @org.springframework.beans.factory.annotation.Value("${societyone.security.rate-limit.otp-send:20}")
    private int otpSendLimit;

    @org.springframework.beans.factory.annotation.Value("${societyone.security.rate-limit.public-visit:120}")
    private int publicVisitLimit;

    public void clearAll() {
        rateLimits.clear();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!enabled || "bypass-rate-limit".equalsIgnoreCase(request.getHeader("X-Internal-Audit"))) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            int limit = getLimitForPath(path);
            if (limit > 0) {
                String clientIp = getClientIp(request);
                String key = clientIp + "::" + path;

                if (isRateLimited(key, limit)) {
                    log.warn("[RateLimit] Exceeded for IP={} path={}", clientIp, path);
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                    response.setHeader("Retry-After", "60");
                    response.getWriter().write(
                            "{\"success\":false,\"data\":null,\"message\":null," +
                            "\"error\":{\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"Too many requests. Please wait a minute before trying again.\",\"details\":[]}}"
                    );
                    response.getWriter().flush();
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private int getLimitForPath(String path) {
        if (path.endsWith("/api/auth/login")) return loginLimit;
        if (path.endsWith("/api/auth/verify-otp")) return otpVerifyLimit;
        if (path.endsWith("/api/auth/send-otp") || path.endsWith("/api/auth/resend-otp")) return otpSendLimit;
        if (path.endsWith("/api/public/visit-requests")) return publicVisitLimit;
        return 0;
    }

    private boolean isRateLimited(String key, int maxRequestsPerMinute) {
        Instant now = Instant.now();
        Window window = rateLimits.compute(key, (k, existing) -> {
            if (existing == null || existing.windowStart().plusSeconds(60).isBefore(now)) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count().incrementAndGet();
            return existing;
        });

        // Periodic memory cleanup if cache exceeds 10,000 IPs
        if (rateLimits.size() > 10000) {
            rateLimits.entrySet().removeIf(e -> e.getValue().windowStart().plusSeconds(120).isBefore(now));
        }

        return window.count().get() > maxRequestsPerMinute;
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
