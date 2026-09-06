package com.societyone.app.security.repository;

import com.societyone.app.security.entity.SecurityStaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SecurityStaffProfileRepository
        extends JpaRepository<SecurityStaffProfile, Long> {

    Optional<SecurityStaffProfile> findByUserId(Long userId);

    List<SecurityStaffProfile> findBySocietyId(Long societyId);

    boolean existsByUserId(Long userId);

    boolean existsBySocietyIdAndUserId(
            Long societyId,
            Long userId
    );
}