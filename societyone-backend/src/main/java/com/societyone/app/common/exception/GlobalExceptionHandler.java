package com.societyone.app.common.exception;

import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.api.ApiResponse.ApiErrorDetail;

import jakarta.validation.ConstraintViolationException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /*
     * Handles @Valid validation errors.
     *
     * Example:
     * username is blank
     * password is too short
     */
    private static final java.util.Set<String> PASSWORD_FIELDS =
            java.util.Set.of("password", "newPassword", "confirmPassword");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException exception
    ) {

        List<ApiErrorDetail> details = exception
                .getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ApiErrorDetail(
                        error.getField(),
                        error.getDefaultMessage()
                ))
                .toList();

        boolean hasPasswordError = details.stream()
                .map(ApiErrorDetail::field)
                .anyMatch(PASSWORD_FIELDS::contains);

        String code = hasPasswordError ? "PASSWORD_TOO_WEAK" : "VALIDATION_ERROR";
        String message = hasPasswordError
                ? "Password does not meet requirements"
                : "Request validation failed";

        ApiResponse<Void> response = ApiResponse.failure(
                code,
                message,
                details
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch() {
        ApiResponse<Void> response = ApiResponse.failure(
                "BAD_REQUEST",
                "The requested resource id is invalid"
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        log.warn("Malformed HTTP request body: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.failure(
                "MALFORMED_REQUEST",
                "The request body is malformed or unreadable"
        );
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /*
     * Handles ResponseStatusException thrown by AuthService.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(
            ResponseStatusException exception
    ) {

        HttpStatus status = HttpStatus.valueOf(
                exception.getStatusCode().value()
        );

        String reason = exception.getReason() != null
                ? exception.getReason()
                : status.getReasonPhrase();

        String code = switch (status) {
            case BAD_REQUEST -> switch (reason) {
                case "Authentication method must be email or mobile" -> "BAD_REQUEST";
                case "Password does not meet requirements",
                     "Password is too weak" -> "WEAK_PASSWORD";
                case "At least one of email or mobile number is required" -> "VALIDATION_ERROR";
                case "Invalid OTP" -> "OTP_INVALID";
                case "OTP expired" -> "OTP_EXPIRED";
                case "OTP has already been used" -> "OTP_INVALID";
                case "Too many failed attempts. Please request a new OTP." -> "OTP_MAX_ATTEMPTS";
                case "Invalid visitor request state transition" -> "INVALID_STATE_TRANSITION";
                default -> "BAD_REQUEST";
            };
            case TOO_MANY_REQUESTS -> "OTP_COOLDOWN";
            case UNAUTHORIZED -> {
                if ("Invalid credentials".equals(reason)) {
                    yield "INVALID_CREDENTIALS";
                }
                yield "UNAUTHORIZED";
            }
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> switch (reason) {
                case "User not found" -> "USER_NOT_FOUND";
                case "Flat not found" -> "FLAT_NOT_FOUND";
                case "Resident profile not found" -> "RESIDENT_NOT_FOUND";
                case "Security staff profile not found" -> "SECURITY_STAFF_NOT_FOUND";
                case "Visitor not found" -> "VISITOR_NOT_FOUND";
                case "Visit request not found" -> "REQUEST_NOT_FOUND";
                default -> "NOT_FOUND";
            };
            case CONFLICT -> switch (reason) {
                case "Username is already registered" -> "USERNAME_ALREADY_TAKEN";
                case "Email is already registered" -> "EMAIL_ALREADY_REGISTERED";
                case "Mobile number is already registered" -> "MOBILE_ALREADY_REGISTERED";
                case "This admin already has a society" -> "SOCIETY_ALREADY_EXISTS";
                case "A society with this name already exists" -> "DUPLICATE_SOCIETY_NAME";
                case "A building with this name already exists in the society" -> "DUPLICATE_BUILDING";
                case "This floor already exists in the building" -> "DUPLICATE_FLOOR";
                case "A flat with this number already exists in the building" -> "DUPLICATE_FLAT";
                case "User already has a resident profile" -> "DUPLICATE_RESIDENT";
                case "User already has a security staff profile" -> "DUPLICATE_SECURITY_STAFF";
                default -> "CONFLICT";
            };
            case SERVICE_UNAVAILABLE -> {
                if (reason != null && (reason.contains("SMTP") || reason.contains("Email"))) {
                    yield "SMTP_NOT_CONFIGURED";
                }
                yield "SERVICE_UNAVAILABLE";
            }
            case BAD_GATEWAY -> {
                if (reason != null && (reason.contains("SMTP") || reason.contains("Email"))) {
                    yield "SMTP_DELIVERY_FAILED";
                }
                yield "BAD_GATEWAY";
            }
            default -> "REQUEST_ERROR";
        };

        ApiResponse<Void> response = ApiResponse.failure(
                code,
                reason
        );

        return ResponseEntity
                .status(status)
                .body(response);
    }

    /*
     * Handles database constraint errors.
     *
     * This protects the API from exposing PostgreSQL details.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            DataIntegrityViolationException exception
    ) {
        String message = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";

        String code = "CONFLICT";
        String reason = "The requested operation could not be completed";

        if (message.contains("uk_resident_profiles_user_id") || message.contains("resident_profiles_user_id_key")) {
            code = "DUPLICATE_RESIDENT";
            reason = "User already has a resident profile";
        } else if (message.contains("uk_security_staff_user_id")
                || message.contains("security_staff_profiles_user_id_key")
                || message.contains("security_staff_user_id_unique")) {
            code = "DUPLICATE_SECURITY_STAFF";
            reason = "User already has a security staff profile";
        } else if (message.contains("uk_users_username") || message.contains("users_username_key")) {
            code = "USERNAME_ALREADY_TAKEN";
            reason = "Username is already registered";
        } else if (message.contains("uk_users_email") || message.contains("users_email_key")) {
            code = "EMAIL_ALREADY_REGISTERED";
            reason = "Email is already registered";
        } else if (message.contains("uk_users_mobile") || message.contains("users_mobile_number_key")) {
            code = "MOBILE_ALREADY_REGISTERED";
            reason = "Mobile number is already registered";
        } else if (message.contains("uk_societies_owner") || message.contains("societies_owner_id_key")) {
            code = "SOCIETY_ALREADY_EXISTS";
            reason = "This admin already has a society";
        } else if (message.contains("uk_societies_name") || message.contains("societies_name_key")) {
            code = "DUPLICATE_SOCIETY_NAME";
            reason = "A society with this name already exists";
        } else if (message.contains("uk_buildings_society_name") || message.contains("buildings_society_id_name_key")) {
            code = "DUPLICATE_BUILDING";
            reason = "A building with this name already exists in the society";
        } else if (message.contains("uk_floors_building_number") || message.contains("floors_building_id_number_key")) {
            code = "DUPLICATE_FLOOR";
            reason = "This floor already exists in the building";
        } else if (message.contains("uk_flats_floor_number")
                || message.contains("uk_flats_building_number")
                || message.contains("flats_floor_id_number_key")
                || message.contains("flats_building_id_number_key")) {
            code = "DUPLICATE_FLAT";
            reason = "A flat with this number already exists in the building";
        }

        ApiResponse<Void> response = ApiResponse.failure(code, reason);

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    /*
     * Handles Bean Validation constraint violations.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException exception
    ) {

        ApiResponse<Void> response = ApiResponse.failure(
                "VALIDATION_ERROR",
                "Request validation failed"
        );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /*
     * Handles Spring Security access denied errors from @PreAuthorize / method security.
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException exception
    ) {
        ApiResponse<Void> response = ApiResponse.failure(
                "FORBIDDEN",
                "You are not allowed to perform this action"
        );
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(response);
    }

    /*
     * Handles Spring Security bad credentials.
     */
    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(
            org.springframework.security.authentication.BadCredentialsException exception
    ) {
        ApiResponse<Void> response = ApiResponse.failure(
                "UNAUTHORIZED",
                "Invalid credentials"
        );
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(response);
    }

    /*
     * Final safety net.
     *
     * Never expose stack traces or internal exception details
     * to the frontend.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(
            Exception exception
    ) {
        log.error("Unhandled exception caught by GlobalExceptionHandler: {}", exception.getMessage(), exception);
        String msg = exception.getMessage() != null
                ? exception.getClass().getSimpleName() + ": " + exception.getMessage()
                : "An unexpected error occurred (" + exception.getClass().getSimpleName() + ")";
        ApiResponse<Void> response = ApiResponse.failure(
                "INTERNAL_SERVER_ERROR",
                msg
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(response);
    }
}