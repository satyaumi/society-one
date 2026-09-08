package com.societyone.app.platform.dto;

public record PlatformSocietyDirectoryItem(
        Long id,
        String name,
        String address,
        String city,
        String state,
        String postalCode,
        String contactPhone,
        String contactEmail,
        String status,
        Long adminUserId,
        String adminFullName,
        String adminEmail,
        String adminPhone,
        long buildingCount,
        long floorCount,
        long flatCount,
        long residentCount,
        long securityCount,
        String createdAt,
        String updatedAt
) {}
