package com.societyone.app.society.repository;

import com.societyone.app.society.entity.Floor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface FloorRepository extends JpaRepository<Floor, Long> {

    List<Floor> findByBuildingIdOrderByNumberAsc(Long buildingId);

    List<Floor> findByBuildingIdInOrderByNumberAsc(Collection<Long> buildingIds);

    boolean existsByBuildingIdAndNumber(Long buildingId, Integer number);

    boolean existsByBuildingIdAndNumberAndIdNot(Long buildingId, Integer number, Long id);
}
