package com.societyone.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SocietyoneBackendApplication {

	public static void main(String[] args) {
		loadDotEnvIfPresent();
		com.societyone.app.common.config.DatabaseUrlNormalizer.normalizeAndSetSystemProperties();
		SpringApplication.run(SocietyoneBackendApplication.class, args);
	}

	/**
	 * Automatically locate and load .env configuration regardless of whether the application
	 * is launched from the project root, from societyone-backend directory, or from an IDE.
	 */
	private static void loadDotEnvIfPresent() {
		List<Path> candidatePaths = List.of(
				Paths.get(".env"),
				Paths.get("societyone-backend", ".env"),
				Paths.get("..", "societyone-backend", ".env")
		);

		for (Path candidate : candidatePaths) {
			File file = candidate.toFile();
			if (file.exists() && file.isFile()) {
				try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
					String line;
					while ((line = reader.readLine()) != null) {
						line = line.trim();
						if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
							continue;
						}
						int eqIdx = line.indexOf('=');
						String key = line.substring(0, eqIdx).trim();
						String value = line.substring(eqIdx + 1).trim();
						if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
							value = value.substring(1, value.length() - 1);
						}
						if (System.getProperty(key) == null && System.getenv(key) == null) {
							System.setProperty(key, value);
						}
					}
					System.out.println("[SocietyOne] Loaded environment configuration from: " + file.getAbsolutePath());
					return;
				} catch (Exception e) {
					System.err.println("[SocietyOne] Warning: Failed to read .env from " + file.getAbsolutePath() + ": " + e.getMessage());
				}
			}
		}
	}

}

