package com.societyone.app.society.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.society.dto.BuildingRequest;
import com.societyone.app.society.dto.BuildingResponse;
import com.societyone.app.society.dto.FlatRequest;
import com.societyone.app.society.dto.FlatResponse;
import com.societyone.app.society.dto.FloorRequest;
import com.societyone.app.society.dto.FloorResponse;
import com.societyone.app.society.dto.SocietyRequest;
import com.societyone.app.society.dto.SocietyResponse;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Floor;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.entity.StructureStatus;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.FloorRepository;
import com.societyone.app.society.repository.SocietyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class SocietyStructureService {

    private final SocietyRepository societyRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final FlatRepository flatRepository;

    public SocietyStructureService(
            SocietyRepository societyRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository
    ) {
        this.societyRepository = societyRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.flatRepository = flatRepository;
    }

    @Transactional(readOnly = true)
    public List<SocietyResponse> listSocieties(User actor) {
        if (actor.getRole() != Role.ADMIN) {
            return List.of();
        }
        return toTrees(societyRepository.findByOwnerOrderByNameAsc(actor));
    }

    @Transactional(readOnly = true)
    public SocietyResponse getSociety(User actor, Long societyId) {
        return toTree(requireOwnedSociety(actor, societyId));
    }

    public SocietyResponse createSociety(User actor, SocietyRequest request) {
        requireAdmin(actor);
        if (societyRepository.existsByOwner(actor)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This admin already has a society"
            );
        }
        String name = normalizeName(request.name());
        if (societyRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A society with this name already exists"
            );
        }

        Society society = new Society();
        applySocietyFields(society, request, name);
        society.setStatus(StructureStatus.ACTIVE);
        society.setOwner(actor);
        return toTree(societyRepository.save(society));
    }

    public SocietyResponse updateSociety(User actor, Long societyId, SocietyRequest request) {
        Society society = requireOwnedSociety(actor, societyId);
        String name = normalizeName(request.name());
        if (societyRepository.existsByNameIgnoreCaseAndIdNot(name, societyId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A society with this name already exists"
            );
        }
        applySocietyFields(society, request, name);
        return toTree(societyRepository.save(society));
    }

    public BuildingResponse createBuilding(User actor, Long societyId, BuildingRequest request) {
        Society society = requireOwnedSociety(actor, societyId);
        String name = normalizeName(request.name());
        if (buildingRepository.existsBySocietyIdAndNameIgnoreCase(society.getId(), name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A building with this name already exists in the society"
            );
        }
        Building building = new Building();
        building.setSociety(society);
        building.setName(name);
        building.setStatus(StructureStatus.ACTIVE);
        return toBuildingResponse(buildingRepository.save(building), List.of(), Map.of());
    }

    @Transactional(readOnly = true)
    public List<BuildingResponse> listBuildings(User actor, Long societyId) {
        Society society = requireOwnedSociety(actor, societyId);
        return toTrees(List.of(society)).getFirst().buildings();
    }

    public BuildingResponse updateBuilding(User actor, Long buildingId, BuildingRequest request) {
        Building building = requireOwnedBuilding(actor, buildingId);
        String name = normalizeName(request.name());
        if (buildingRepository.existsBySocietyIdAndNameIgnoreCaseAndIdNot(
                building.getSociety().getId(),
                name,
                buildingId
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A building with this name already exists in the society"
            );
        }
        building.setName(name);
        if (request.status() != null && !request.status().isBlank()) {
            StructureStatus status = parseStatus(request.status());
            if (status == StructureStatus.INACTIVE
                    && flatRepository.existsByBuildingIdAndStatus(buildingId, StructureStatus.ACTIVE)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Deactivate all flats in this building first"
                );
            }
            building.setStatus(status);
        }
        Building saved = buildingRepository.save(building);
        return toTrees(List.of(saved.getSociety())).getFirst().buildings().stream()
                .filter(item -> item.id().equals(String.valueOf(saved.getId())))
                .findFirst()
                .orElseGet(() -> toBuildingResponse(saved, List.of(), Map.of()));
    }

    public FloorResponse createFloor(User actor, Long buildingId, FloorRequest request) {
        Building building = requireOwnedBuilding(actor, buildingId);
        if (floorRepository.existsByBuildingIdAndNumber(building.getId(), request.number())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This floor already exists in the building"
            );
        }
        Floor floor = new Floor();
        floor.setBuilding(building);
        floor.setNumber(request.number());
        floor.setStatus(StructureStatus.ACTIVE);
        Floor saved = floorRepository.save(floor);
        return new FloorResponse(
                String.valueOf(saved.getId()),
                saved.getNumber(),
                saved.getStatus().name(),
                List.of()
        );
    }

    @Transactional(readOnly = true)
    public List<FloorResponse> listFloors(User actor, Long buildingId) {
        Building building = requireOwnedBuilding(actor, buildingId);
        SocietyResponse tree = toTree(building.getSociety());
        return tree.buildings().stream()
                .filter(item -> item.id().equals(String.valueOf(building.getId())))
                .findFirst()
                .map(BuildingResponse::floors)
                .orElse(List.of());
    }

    public FloorResponse updateFloor(User actor, Long floorId, FloorRequest request) {
        Floor floor = requireOwnedFloor(actor, floorId);
        if (floorRepository.existsByBuildingIdAndNumberAndIdNot(
                floor.getBuilding().getId(),
                request.number(),
                floorId
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This floor already exists in the building"
            );
        }
        floor.setNumber(request.number());
        if (request.status() != null && !request.status().isBlank()) {
            StructureStatus status = parseStatus(request.status());
            if (status == StructureStatus.INACTIVE
                    && flatRepository.existsByFloorIdAndStatus(floorId, StructureStatus.ACTIVE)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Deactivate all flats on this floor first"
                );
            }
            floor.setStatus(status);
        }
        Floor saved = floorRepository.save(floor);
        List<Flat> flats = flatRepository.findByFloorIdOrderByNumberAsc(saved.getId());
        return new FloorResponse(
                String.valueOf(saved.getId()),
                saved.getNumber(),
                saved.getStatus().name(),
                flats.stream().map(this::toFlatResponse).toList()
        );
    }

    public FlatResponse createFlat(User actor, Long floorId, FlatRequest request) {
        Floor floor = requireOwnedFloor(actor, floorId);
        Building building = floor.getBuilding();
        Society society = building.getSociety();
        String number = normalizeName(request.number());
        if (flatRepository.existsByFloorIdAndNumberIgnoreCase(floor.getId(), number)
                || flatRepository.existsByBuildingIdAndNumberIgnoreCase(building.getId(), number)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A flat with this number already exists in the building"
            );
        }
        Flat flat = new Flat();
        flat.setSociety(society);
        flat.setBuilding(building);
        flat.setFloor(floor);
        flat.setNumber(number);
        flat.setStatus(StructureStatus.ACTIVE);
        return toFlatResponse(flatRepository.save(flat));
    }

    @Transactional(readOnly = true)
    public List<FlatResponse> listFlats(User actor, Long floorId) {
        Floor floor = requireOwnedFloor(actor, floorId);
        return flatRepository.findByFloorIdOrderByNumberAsc(floor.getId()).stream()
                .map(this::toFlatResponse)
                .toList();
    }

    public FlatResponse updateFlat(User actor, Long flatId, FlatRequest request) {
        Flat flat = requireOwnedFlat(actor, flatId);
        String number = normalizeName(request.number());
        if (flatRepository.existsByFloorIdAndNumberIgnoreCaseAndIdNot(flat.getFloor().getId(), number, flatId)
                || flatRepository.existsByBuildingIdAndNumberIgnoreCaseAndIdNot(
                flat.getBuilding().getId(),
                number,
                flatId
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A flat with this number already exists in the building"
            );
        }
        flat.setNumber(number);
        if (request.status() != null && !request.status().isBlank()) {
            flat.setStatus(parseStatus(request.status()));
        }
        return toFlatResponse(flatRepository.save(flat));
    }

    private void applySocietyFields(Society society, SocietyRequest request, String name) {
        society.setName(name);
        society.setAddress(request.address().trim());
        society.setCity(request.city().trim());
        society.setState(request.state().trim());
        society.setPostalCode(request.postalCode().trim());
        society.setContactPhone(blankToNull(request.contactPhone()));
        society.setContactEmail(blankToNull(request.contactEmail()));
    }

    private Society requireOwnedSociety(User actor, Long societyId) {
        requireAdmin(actor);
        return societyRepository.findByIdAndOwner(societyId, actor)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Society not found"
                ));
    }

    private Building requireOwnedBuilding(User actor, Long buildingId) {
        requireAdmin(actor);
        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Building not found"
                ));
        if (!building.getSociety().getOwner().getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found");
        }
        return building;
    }

    private Floor requireOwnedFloor(User actor, Long floorId) {
        requireAdmin(actor);
        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Floor not found"
                ));
        if (!floor.getBuilding().getSociety().getOwner().getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found");
        }
        return floor;
    }

    private Flat requireOwnedFlat(User actor, Long flatId) {
        requireAdmin(actor);
        Flat flat = flatRepository.findById(flatId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Flat not found"
                ));
        if (!flat.getSociety().getOwner().getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Flat not found");
        }
        return flat;
    }

    private static void requireAdmin(User actor) {
        if (actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You are not allowed to perform this action"
            );
        }
    }

    private List<SocietyResponse> toTrees(List<Society> societies) {
        if (societies.isEmpty()) {
            return List.of();
        }
        List<Long> societyIds = societies.stream().map(Society::getId).toList();
        List<Building> buildings = buildingRepository.findBySocietyIdInOrderByNameAsc(societyIds);
        List<Long> buildingIds = buildings.stream().map(Building::getId).toList();
        List<Floor> floors = buildingIds.isEmpty()
                ? List.of()
                : floorRepository.findByBuildingIdInOrderByNumberAsc(buildingIds);
        List<Long> floorIds = floors.stream().map(Floor::getId).toList();
        List<Flat> flats = floorIds.isEmpty()
                ? List.of()
                : flatRepository.findByFloorIdInOrderByNumberAsc(floorIds);

        Map<Long, List<Flat>> flatsByFloor = flats.stream()
                .collect(Collectors.groupingBy(flat -> flat.getFloor().getId()));
        Map<Long, List<Floor>> floorsByBuilding = floors.stream()
                .collect(Collectors.groupingBy(floor -> floor.getBuilding().getId()));
        Map<Long, List<Building>> buildingsBySociety = buildings.stream()
                .collect(Collectors.groupingBy(building -> building.getSociety().getId()));

        List<SocietyResponse> result = new ArrayList<>();
        for (Society society : societies) {
            List<BuildingResponse> buildingResponses = buildingsBySociety
                    .getOrDefault(society.getId(), List.of())
                    .stream()
                    .map(building -> toBuildingResponse(
                            building,
                            floorsByBuilding.getOrDefault(building.getId(), List.of()),
                            flatsByFloor
                    ))
                    .toList();
            result.add(toSocietyResponse(society, buildingResponses));
        }
        return result;
    }

    private SocietyResponse toTree(Society society) {
        return toTrees(List.of(society)).getFirst();
    }

    private SocietyResponse toSocietyResponse(Society society, List<BuildingResponse> buildings) {
        return new SocietyResponse(
                String.valueOf(society.getId()),
                society.getName(),
                society.getAddress(),
                society.getCity(),
                society.getState(),
                society.getPostalCode(),
                society.getContactPhone(),
                society.getContactEmail(),
                society.getStatus().name(),
                society.getCreatedAt() == null ? null : society.getCreatedAt().toString(),
                society.getUpdatedAt() == null ? null : society.getUpdatedAt().toString(),
                buildings
        );
    }

    private BuildingResponse toBuildingResponse(
            Building building,
            List<Floor> floors,
            Map<Long, List<Flat>> flatsByFloor
    ) {
        List<FloorResponse> floorResponses = floors.stream()
                .map(floor -> new FloorResponse(
                        String.valueOf(floor.getId()),
                        floor.getNumber(),
                        floor.getStatus().name(),
                        flatsByFloor.getOrDefault(floor.getId(), List.of()).stream()
                                .map(this::toFlatResponse)
                                .toList()
                ))
                .toList();
        return new BuildingResponse(
                String.valueOf(building.getId()),
                building.getName(),
                building.getStatus().name(),
                floorResponses
        );
    }

    private FlatResponse toFlatResponse(Flat flat) {
        return new FlatResponse(
                String.valueOf(flat.getId()),
                flat.getNumber(),
                String.valueOf(flat.getBuilding().getId()),
                String.valueOf(flat.getFloor().getId()),
                flat.getStatus().name(),
                List.of()
        );
    }

    private static String normalizeName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static StructureStatus parseStatus(String raw) {
        try {
            return StructureStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be ACTIVE or INACTIVE"
            );
        }
    }
}
