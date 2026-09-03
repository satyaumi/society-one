package com.societyone.app.auth.dto;

public record AuthResponse(
        String token,
        SafeUserResponse user
) {}
