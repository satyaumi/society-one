package com.societyone.app.visitor.repository;

import com.societyone.app.visitor.entity.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {

    @Query("SELECT DISTINCT v FROM Visitor v " +
           "JOIN VisitRequest vr ON vr.visitor.id = v.id " +
           "WHERE vr.society.id = :societyId " +
           "ORDER BY v.createdAt DESC")
    List<Visitor> findDistinctBySocietyIdOrderByCreatedAtDesc(
            @Param("societyId") Long societyId
    );

    @Query("SELECT DISTINCT v FROM Visitor v " +
           "JOIN VisitRequest vr ON vr.visitor.id = v.id " +
           "WHERE vr.resident.id = :residentId " +
           "ORDER BY v.createdAt DESC")
    List<Visitor> findDistinctByResidentIdOrderByCreatedAtDesc(
            @Param("residentId") Long residentId
    );

    List<Visitor> findByMobileNumberOrderByCreatedAtDesc(String mobileNumber);

    java.util.Optional<Visitor> findFirstByMobileNumber(String mobileNumber);
}