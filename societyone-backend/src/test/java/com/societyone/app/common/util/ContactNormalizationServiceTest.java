package com.societyone.app.common.util;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class ContactNormalizationServiceTest {

    private final ContactNormalizationService service = new ContactNormalizationService();

    @Test
    void normalizesTenDigitIndianMobileToE164() {
        assertEquals("+919876543210", service.normalizeMobile("9876543210"));
    }

    @Test
    void normalizesSpacedCountryCodeToE164() {
        assertEquals("+919876543210", service.normalizeMobile("+91 9876543210"));
    }

    @Test
    void normalizesEmailCaseAndWhitespace() {
        assertEquals("admin@example.com", service.normalizeEmail("  Admin@Example.COM  "));
    }

    @Test
    void rejectsInvalidMobile() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.normalizeMobile("12345")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason() != null && ex.getReason().toLowerCase().contains("invalid"));
    }
}
