package com.societyone.app.society.repository;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Society;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SocietyRepository extends JpaRepository<Society, Long> {

    List<Society> findByOwnerOrderByNameAsc(User owner);
    
    Optional<Society> findByOwner(User owner);
    Optional<Society> findByIdAndOwner(Long id, User owner);

    boolean existsByOwner(User owner);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    long countByStatus(com.societyone.app.society.entity.StructureStatus status);
}
