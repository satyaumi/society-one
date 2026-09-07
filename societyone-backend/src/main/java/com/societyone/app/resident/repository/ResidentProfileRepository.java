package com.societyone.app.resident.repository;

import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.entity.ResidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResidentProfileRepository
        extends JpaRepository<ResidentProfile, Long> {

    Optional<ResidentProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<ResidentProfile> findByFlatId(Long flatId);

    List<ResidentProfile> findByFlatIdAndStatus(
            Long flatId,
            ResidentStatus status
    );

    List<ResidentProfile> findByFlat_SocietyIdOrderByCreatedAtDesc(Long societyId);

    boolean existsByFlatIdAndStatus(Long flatId, ResidentStatus status);

    Optional<ResidentProfile> findFirstByFlatIdAndStatus(Long flatId, ResidentStatus status);

    Long countByFlat_SocietyId(Long societyId);
}