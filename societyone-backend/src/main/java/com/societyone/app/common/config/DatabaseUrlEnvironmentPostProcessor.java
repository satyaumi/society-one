package com.societyone.app.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Automatically detects and normalizes cloud provider database URLs (such as Render/Heroku DATABASE_URL).
 * Converts `postgres://` or `postgresql://` URIs to standard `jdbc:postgresql://` format with username/password extraction.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(DatabaseUrlEnvironmentPostProcessor.class);

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dbUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("spring.datasource.url");
        }

        if (dbUrl == null || dbUrl.isBlank()) {
            return;
        }

        String trimmed = dbUrl.trim();
        Map<String, Object> overrides = new HashMap<>();

        if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
            try {
                String uriStr = trimmed;
                if (uriStr.startsWith("postgres://")) {
                    uriStr = "postgresql://" + uriStr.substring("postgres://".length());
                }

                URI uri = URI.create(uriStr);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + path;
                if (uri.getQuery() != null && !uri.getQuery().isBlank()) {
                    jdbcUrl += "?" + uri.getQuery();
                }

                overrides.put("spring.datasource.url", jdbcUrl);
                overrides.put("SPRING_DATASOURCE_URL", jdbcUrl);

                if (uri.getUserInfo() != null) {
                    String[] userParts = uri.getUserInfo().split(":", 2);
                    if (userParts.length > 0 && !userParts[0].isBlank()) {
                        overrides.put("spring.datasource.username", userParts[0]);
                        overrides.put("SPRING_DATASOURCE_USERNAME", userParts[0]);
                    }
                    if (userParts.length > 1) {
                        overrides.put("spring.datasource.password", userParts[1]);
                        overrides.put("SPRING_DATASOURCE_PASSWORD", userParts[1]);
                    }
                }
                log.info("[DatabaseUrlEnvironmentPostProcessor] Normalized Render database URL to JDBC format: jdbc:postgresql://{}:{}/{}", host, port, path);
            } catch (Exception e) {
                String jdbcUrl = "jdbc:" + trimmed;
                overrides.put("spring.datasource.url", jdbcUrl);
                overrides.put("SPRING_DATASOURCE_URL", jdbcUrl);
                log.warn("[DatabaseUrlEnvironmentPostProcessor] Fallback prepended jdbc: prefix to database URL");
            }
        }

        if (!overrides.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("renderDatabaseUrlNormalization", overrides));
        }
    }
}
