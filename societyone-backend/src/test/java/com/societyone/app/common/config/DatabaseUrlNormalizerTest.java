package com.societyone.app.common.config;

import org.junit.jupiter.api.Test;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseUrlNormalizerTest {

    @Test
    void testParseRenderPostgresUrl() {
        String renderUrl = "postgres://societyuser:mypassword123@dpg-c012345678-a.oregon-postgres.render.com:5432/societyone_db";
        Map<String, String> parsed = DatabaseUrlNormalizer.parse(renderUrl);

        assertEquals("jdbc:postgresql://dpg-c012345678-a.oregon-postgres.render.com:5432/societyone_db", parsed.get("spring.datasource.url"));
        assertEquals("jdbc:postgresql://dpg-c012345678-a.oregon-postgres.render.com:5432/societyone_db", parsed.get("SPRING_DATASOURCE_URL"));
        assertEquals("societyuser", parsed.get("spring.datasource.username"));
        assertEquals("societyuser", parsed.get("SPRING_DATASOURCE_USERNAME"));
        assertEquals("mypassword123", parsed.get("spring.datasource.password"));
        assertEquals("mypassword123", parsed.get("SPRING_DATASOURCE_PASSWORD"));
    }

    @Test
    void testParsePostgresqlUrlWithQuery() {
        String url = "postgresql://user:pass@host.render.com:5432/db?sslmode=require";
        Map<String, String> parsed = DatabaseUrlNormalizer.parse(url);

        assertEquals("jdbc:postgresql://host.render.com:5432/db?sslmode=require", parsed.get("spring.datasource.url"));
        assertEquals("user", parsed.get("spring.datasource.username"));
        assertEquals("pass", parsed.get("spring.datasource.password"));
    }
}
