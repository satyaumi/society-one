package com.societyone.app.auth.dto;

import com.societyone.app.auth.entity.User;

public record SafeUserResponse(
        String id,
        String name,
        String username,
        String email,
        String mobile,
        String role,
        String accountStatus,
        String lastLoginAt,
        String profilePhotoUrl,
        String avatar
) {
    public static SafeUserResponse from(User user) {
        String photo = user.getProfilePhotoUrl();
        return new SafeUserResponse(
                String.valueOf(user.getId()),
                user.getFullName(),
                user.getUsername(),
                user.getEmail(),
                user.getMobileNumber(),
                user.getRole().name(),
                user.getAccountStatus().name(),
                user.getLastLoginAt() == null
                        ? null
                        : user.getLastLoginAt().toString(),
                photo,
                photo
        );
    }
}