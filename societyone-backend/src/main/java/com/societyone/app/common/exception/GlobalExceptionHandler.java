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
                case "Password does not meet requirements" -> "PASSWORD_TOO_WEAK";
                case "At least one of email or mobile number is required" -> "VALIDATION_ERROR";
                case "Invalid OTP" -> "OTP_INVALID";
                case "OTP expired" -> "OTP_EXPIRED";
                case "OTP has already been used" -> "OTP_INVALID";
                default -> "BAD_REQUEST";
            };
            case UNAUTHORIZED -> {
                if ("Invalid credentials".equals(reason)) {
                    yield "INVALID_CREDENTIALS";
                }
                yield "UNAUTHORIZED";
            }
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            case CONFLICT -> switch (reason) {
                case "Username is already registered" -> "USERNAME_ALREADY_TAKEN";
                case "Email is already registered" -> "EMAIL_ALREADY_REGISTERED";
                case "Mobile number is already registered" -> "MOBILE_ALREADY_REGISTERED";
                case "This admin already has a society" -> "SOCIETY_ALREADY_EXISTS";
                case "A society with this name already exists" -> "DUPLICATE_SOCIETY_NAME";
                case "A building with this name already exists in the society" -> "DUPLICATE_BUILDING";
                case "This floor already exists in the building" -> "DUPLICATE_FLOOR";
                case "A flat with this number already exists in the building" -> "DUPLICATE_FLAT";
                default -> "CONFLICT";
            };
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

        ApiResponse<Void> response = ApiResponse.failure(
                "DATA_INTEGRITY_ERROR",
                "The requested operation could not be completed"
        );

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

        ApiResponse<Void> response = ApiResponse.failure(
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred"
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(response);
    }
}