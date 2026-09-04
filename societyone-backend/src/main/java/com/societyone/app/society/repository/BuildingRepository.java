package com.societyone.app.society.repository;

import com.societyone.app.society.entity.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BuildingRepository extends JpaRepository<Building, Long> {

    List<Building> findBySocietyIdOrderByNameAsc(Long societyId);

    List<Building> findBySocietyIdInOrderByNameAsc(Collection<Long> societyIds);

    boolean existsBySocietyIdAndNameIgnoreCase(Long societyId, String name);

    boolean existsBySocietyIdAndNameIgnoreCaseAndIdNot(Long societyId, String name, Long id);
}
