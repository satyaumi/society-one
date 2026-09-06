package com.societyone.app.visitor.repository;

import com.societyone.app.visitor.entity.AuthorizationStatus;
import com.societyone.app.visitor.entity.VisitorAuthorization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VisitorAuthorizationRepository extends JpaRepository<VisitorAuthorization, Long> {

    List<VisitorAuthorization> findByResidentIdOrderByCreatedAtDesc(Long residentId);

    List<VisitorAuthorization> findBySocietyIdOrderByCreatedAtDesc(Long societyId);

    List<VisitorAuthorization> findByVisitorId(Long visitorId);

    Optional<VisitorAuthorization> findByVisitorIdAndFlatId(Long visitorId, Long flatId);

    List<VisitorAuthorization> findByFlatId(Long flatId);

    @Query("SELECT va FROM VisitorAuthorization va WHERE va.visitor.mobileNumber = :mobileNumber")
    List<VisitorAuthorization> findByVisitorMobileNumber(@Param("mobileNumber") String mobileNumber);

    @Query("SELECT va FROM VisitorAuthorization va WHERE va.society.id = :societyId AND (LOWER(va.visitor.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR va.visitor.mobileNumber LIKE CONCAT('%', :query, '%'))")
    List<VisitorAuthorization> searchBySocietyAndQuery(@Param("societyId") Long societyId, @Param("query") String query);
}
