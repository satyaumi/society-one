package com.societyone.app.common.config;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility to normalize Render/cloud postgres:// or postgresql:// database URLs
 * into standard JDBC format (jdbc:postgresql://...) with extracted credentials.
 */
public final class DatabaseUrlNormalizer {

    private DatabaseUrlNormalizer() {
    }

    public static void normalizeAndSetSystemProperties() {
        String dbUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getenv("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getProperty("SPRING_DATASOURCE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getProperty("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getProperty("spring.datasource.url");
        }

        Map<String, String> normalized = parse(dbUrl);
        for (Map.Entry<String, String> entry : normalized.entrySet()) {
            System.setProperty(entry.getKey(), entry.getValue());
        }
    }

    public static Map<String, String> parse(String dbUrl) {
        Map<String, String> result = new HashMap<>();
        if (dbUrl == null || dbUrl.isBlank()) {
            return result;
        }

        String trimmed = dbUrl.trim();
        if (trimmed.startsWith("ostgresql://")) {
            trimmed = "postgresql://" + trimmed.substring("ostgresql://".length());
        } else if (trimmed.startsWith("ostgres://")) {
            trimmed = "postgres://" + trimmed.substring("ostgres://".length());
        }

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

                result.put("spring.datasource.url", jdbcUrl);
                result.put("SPRING_DATASOURCE_URL", jdbcUrl);

                if (uri.getUserInfo() != null) {
                    String[] userParts = uri.getUserInfo().split(":", 2);
                    if (userParts.length > 0 && !userParts[0].isBlank()) {
                        result.put("spring.datasource.username", userParts[0]);
                        result.put("SPRING_DATASOURCE_USERNAME", userParts[0]);
                    }
                    if (userParts.length > 1) {
                        result.put("spring.datasource.password", userParts[1]);
                        result.put("SPRING_DATASOURCE_PASSWORD", userParts[1]);
                    }
                }
            } catch (Exception e) {
                String fallback = "jdbc:" + trimmed;
                result.put("spring.datasource.url", fallback);
                result.put("SPRING_DATASOURCE_URL", fallback);
            }
        }
        return result;
    }
}
