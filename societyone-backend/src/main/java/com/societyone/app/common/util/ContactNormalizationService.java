package com.societyone.app.common.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class ContactNormalizationService {

    private static final String DEFAULT_REGION = "IN";

    private final PhoneNumberUtil phoneNumberUtil = PhoneNumberUtil.getInstance();

    public String normalizeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            return null;
        }
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    public String normalizeMobile(String rawMobile) {
        return normalizeMobile(rawMobile, DEFAULT_REGION);
    }

    public String normalizeMobile(String rawMobile, String defaultRegion) {
        if (rawMobile == null || rawMobile.isBlank()) {
            return null;
        }

        String cleaned = rawMobile.trim();

        try {
            Phonenumber.PhoneNumber number = phoneNumberUtil.parse(cleaned, defaultRegion);

            if (!phoneNumberUtil.isValidNumber(number)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid mobile number. Please enter a valid 10-digit Indian mobile number."
                );
            }

            return phoneNumberUtil.format(number, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid mobile number format. Please enter a valid mobile number (e.g., 9876543210)."
            );
        }
    }

    public String tryNormalizeMobile(String rawMobile) {
        try {
            return normalizeMobile(rawMobile);
        } catch (ResponseStatusException e) {
            return null;
        }
    }

    public boolean isSameCanonicalMobile(String mobileA, String mobileB) {
        String canonicalA = tryNormalizeMobile(mobileA);
        String canonicalB = tryNormalizeMobile(mobileB);
        if (canonicalA == null || canonicalB == null) {
            return false;
        }
        return canonicalA.equals(canonicalB);
    }

    public boolean isSameCanonicalEmail(String emailA, String emailB) {
        String canonicalA = normalizeEmail(emailA);
        String canonicalB = normalizeEmail(emailB);
        if (canonicalA == null || canonicalB == null) {
            return false;
        }
        return canonicalA.equals(canonicalB);
    }

    public String formatMobileForDisplay(String canonicalMobile) {
        if (canonicalMobile == null || canonicalMobile.isBlank()) {
            return "";
        }
        try {
            Phonenumber.PhoneNumber number = phoneNumberUtil.parse(canonicalMobile, DEFAULT_REGION);
            return phoneNumberUtil.format(number, PhoneNumberUtil.PhoneNumberFormat.INTERNATIONAL);
        } catch (NumberParseException e) {
            return canonicalMobile;
        }
    }
}
