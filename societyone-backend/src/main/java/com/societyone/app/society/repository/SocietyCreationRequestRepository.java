package com.societyone.app.society.repository;

import com.societyone.app.society.entity.SocietyCreationRequest;
import com.societyone.app.society.entity.SocietyRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SocietyCreationRequestRepository extends JpaRepository<SocietyCreationRequest, Long> {

    Optional<SocietyCreationRequest> findByReferenceCode(String referenceCode);

    List<SocietyCreationRequest> findByPrimaryContactEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    List<SocietyCreationRequest> findByPrimaryContactPhoneOrderByCreatedAtDesc(String phone);

    List<SocietyCreationRequest> findByStatusOrderByCreatedAtDesc(SocietyRequestStatus status);

    List<SocietyCreationRequest> findAllByOrderByCreatedAtDesc();

    boolean existsBySocietyNameIgnoreCaseAndStatusNotIn(String name, List<SocietyRequestStatus> excludedStatuses);

    long countByStatus(SocietyRequestStatus status);

    @Query("SELECT COUNT(r) FROM SocietyCreationRequest r WHERE r.status IN ('SUBMITTED', 'UNDER_REVIEW')")
    long countPendingRequests();
}
