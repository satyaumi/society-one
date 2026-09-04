package com.societyone.app.society.repository;

import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.StructureStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface FlatRepository extends JpaRepository<Flat, Long> {

    List<Flat> findByFloorIdOrderByNumberAsc(Long floorId);

    List<Flat> findByFloorIdInOrderByNumberAsc(Collection<Long> floorIds);

    boolean existsByFloorIdAndNumberIgnoreCase(Long floorId, String number);

    boolean existsByFloorIdAndNumberIgnoreCaseAndIdNot(Long floorId, String number, Long id);

    boolean existsByBuildingIdAndNumberIgnoreCase(Long buildingId, String number);

    boolean existsByBuildingIdAndNumberIgnoreCaseAndIdNot(Long buildingId, String number, Long id);

    boolean existsByBuildingIdAndStatus(Long buildingId, StructureStatus status);

    boolean existsByFloorIdAndStatus(Long floorId, StructureStatus status);
}
