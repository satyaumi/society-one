package com.societyone.app.common.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> getRoot() {
        return ResponseEntity.ok(Map.of(
                "service", "SocietyOne Backend API",
                "status", "UP",
                "version", "0.0.1-SNAPSHOT",
                "frontendUrl", "https://society-one-frontend.vercel.app",
                "healthCheck", "/api/health",
                "publicSummary", "/api/public/summary",
                "message", "Welcome to SocietyOne REST API. Please use the frontend application to access the user interface."
        ));
    }
}
