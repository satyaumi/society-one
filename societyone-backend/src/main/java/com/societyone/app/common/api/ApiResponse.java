package com.societyone.app.common.api;

import java.util.List;

public record ApiResponse<T>(
        boolean success,
        T data,
        String message,
        ApiError error
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(
                true,
                data,
                null,
                null
        );
    }

    public static <T> ApiResponse<T> success(
            T data,
            String message
    ) {
        return new ApiResponse<>(
                true,
                data,
                message,
                null
        );
    }

    public static <T> ApiResponse<T> failure(
            String code,
            String message
    ) {
        return new ApiResponse<>(
                false,
                null,
                null,
                new ApiError(
                        code,
                        message,
                        List.of()
                )
        );
    }

    public static <T> ApiResponse<T> failure(
            String code,
            String message,
            List<ApiErrorDetail> details
    ) {
        return new ApiResponse<>(
                false,
                null,
                null,
                new ApiError(
                        code,
                        message,
                        details
                )
        );
    }

    public record ApiError(
            String code,
            String message,
            List<ApiErrorDetail> details
    ) {
    }

    public record ApiErrorDetail(
            String field,
            String message
    ) {
    }
}