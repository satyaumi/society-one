package com.societyone.app.resident.repository;

import com.societyone.app.resident.entity.OnboardingStatus;
import com.societyone.app.resident.entity.ResidentOnboardingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResidentOnboardingRepository extends JpaRepository<ResidentOnboardingRequest, Long> {

    Optional<ResidentOnboardingRequest> findByUserIdAndSocietyId(Long userId, Long societyId);

    Optional<ResidentOnboardingRequest> findByUserId(Long userId);

    List<ResidentOnboardingRequest> findBySocietyIdOrderByCreatedAtDesc(Long societyId);

    List<ResidentOnboardingRequest> findBySocietyIdAndStatusOrderByCreatedAtDesc(Long societyId, OnboardingStatus status);

    boolean existsByAllocatedFlatIdAndStatus(Long flatId, OnboardingStatus status);
}
