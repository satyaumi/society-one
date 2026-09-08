package com.societyone.app.common.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class KeepAliveScheduler {

    private static final Logger log = LoggerFactory.getLogger(KeepAliveScheduler.class);

    @Value("${RENDER_EXTERNAL_URL:https://society-one-backend.onrender.com}")
    private String renderExternalUrl;

    @Value("${app.keepalive.enabled:true}")
    private boolean keepAliveEnabled;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Heartbeat ping every 10 minutes (600,000 ms) to keep the Render instance awake.
     * Initial delay of 2 minutes to allow full boot before first ping.
     */
    @Scheduled(fixedRate = 600000, initialDelay = 120000)
    public void pingSelf() {
        if (!keepAliveEnabled || renderExternalUrl == null || renderExternalUrl.isBlank()) {
            return;
        }

        try {
            String targetUrl = renderExternalUrl.trim();
            if (targetUrl.endsWith("/")) {
                targetUrl = targetUrl.substring(0, targetUrl.length() - 1);
            }
            String healthUrl = targetUrl + "/api/health";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(healthUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "SocietyOne-KeepAlive/1.0")
                    .GET()
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() == 200) {
                            log.info("[KeepAlive] Heartbeat ping successful (HTTP 200) -> {}", healthUrl);
                        } else {
                            log.warn("[KeepAlive] Heartbeat ping returned HTTP {} -> {}", response.statusCode(), healthUrl);
                        }
                    })
                    .exceptionally(ex -> {
                        log.debug("[KeepAlive] Heartbeat ping warning: {}", ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.debug("[KeepAlive] Failed to dispatch ping: {}", e.getMessage());
        }
    }
}
