package com.societyone.app.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.mock.env.MockPropertySource;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseUrlEnvironmentPostProcessorTest {

    private final DatabaseUrlEnvironmentPostProcessor processor = new DatabaseUrlEnvironmentPostProcessor();

    @Test
    void testRenderPostgresUrlNormalization() {
        ConfigurableEnvironment env = new StandardEnvironment();
        MockPropertySource ps = new MockPropertySource();
        ps.setProperty("DATABASE_URL", "postgres://renderuser:secretpass123@dpg-xxxx-a.oregon-postgres.render.com:5432/societyone_db");
        env.getPropertySources().addFirst(ps);

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("jdbc:postgresql://dpg-xxxx-a.oregon-postgres.render.com:5432/societyone_db", env.getProperty("spring.datasource.url"));
        assertEquals("renderuser", env.getProperty("spring.datasource.username"));
        assertEquals("secretpass123", env.getProperty("spring.datasource.password"));
    }

    @Test
    void testJdbcUrlUnchanged() {
        ConfigurableEnvironment env = new StandardEnvironment();
        MockPropertySource ps = new MockPropertySource();
        ps.setProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://localhost:5432/societyone");
        env.getPropertySources().addFirst(ps);

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("jdbc:postgresql://localhost:5432/societyone", env.getProperty("SPRING_DATASOURCE_URL"));
    }
}
