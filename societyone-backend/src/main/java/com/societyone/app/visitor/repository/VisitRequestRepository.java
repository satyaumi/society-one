package com.societyone.app.visitor.repository;

import com.societyone.app.visitor.entity.VisitRequest;
import com.societyone.app.visitor.entity.VisitRequestStatus;
import com.societyone.app.visitor.entity.VisitStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface VisitRequestRepository
        extends JpaRepository<VisitRequest, Long> {
    
    List<VisitRequest> findBySocietyIdOrderByCreatedAtDesc(
            Long societyId
    );

    List<VisitRequest> findByFlatIdOrderByCreatedAtDesc(
            Long flatId
    );

    List<VisitRequest> findByResidentIdOrderByCreatedAtDesc(
            Long residentId
    );

    List<VisitRequest> findBySocietyIdAndExpectedDateOrderByExpectedTimeAsc(
            Long societyId,
            LocalDate expectedDate
    );

    List<VisitRequest> findBySocietyIdAndRequestStatus(
            Long societyId,
            VisitRequestStatus requestStatus
    );

    List<VisitRequest> findBySocietyIdAndVisitStatus(
            Long societyId,
            VisitStatus visitStatus
    );

    Optional<VisitRequest> findByIdAndSocietyId(
            Long id,
            Long societyId
    );

    long countByExpectedDate(LocalDate expectedDate);

    List<VisitRequest> findByVisitor_MobileNumberOrderByCreatedAtDesc(String mobileNumber);

    @org.springframework.data.jpa.repository.Query("SELECT vr FROM VisitRequest vr WHERE vr.visitorUser.id = :userId OR (vr.visitor.mobileNumber = :mobile AND :mobile IS NOT NULL) ORDER BY vr.createdAt DESC")
    List<VisitRequest> findByVisitorUserOrMobile(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("mobile") String mobile
    );
}