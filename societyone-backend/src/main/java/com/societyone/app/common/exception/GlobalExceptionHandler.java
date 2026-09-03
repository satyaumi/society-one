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

        ApiResponse<Void> response = ApiResponse.failure(
                "VALIDATION_ERROR",
                "Request validation failed",
                details
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

        String code = switch (status) {
            case BAD_REQUEST -> "BAD_REQUEST";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            case CONFLICT -> "CONFLICT";
            default -> "REQUEST_ERROR";
        };

        ApiResponse<Void> response = ApiResponse.failure(
                code,
                exception.getReason() != null
                        ? exception.getReason()
                        : status.getReasonPhrase()
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