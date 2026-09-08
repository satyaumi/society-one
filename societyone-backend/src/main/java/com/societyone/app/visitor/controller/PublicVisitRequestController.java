package com.societyone.app.visitor.controller;

import com.societyone.app.audit.entity.AuditAction;
import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.notification.entity.NotificationType;
import com.societyone.app.notification.service.NotificationService;
import com.societyone.app.resident.entity.ResidentProfile;
import com.societyone.app.resident.repository.ResidentProfileRepository;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Floor;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.FlatRepository;
import com.societyone.app.society.repository.FloorRepository;
import com.societyone.app.society.repository.SocietyRepository;
import com.societyone.app.visitor.dto.PublicStructureResponse;
import com.societyone.app.visitor.dto.PublicVisitRequestCreateRequest;
import com.societyone.app.visitor.dto.VisitRequestResponse;
import com.societyone.app.visitor.entity.*;
import com.societyone.app.visitor.repository.VisitRequestRepository;
import com.societyone.app.visitor.repository.VisitorRepository;
import com.societyone.app.visitor.service.VisitorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@Transactional
public class PublicVisitRequestController {

    private final SocietyRepository societyRepository;
    private final BuildingRepository buildingRepository;
    private final FloorRepository floorRepository;
    private final FlatRepository flatRepository;
    private final UserRepository userRepository;
    private final ResidentProfileRepository residentProfileRepository;
    private final VisitorRepository visitorRepository;
    private final VisitRequestRepository visitRequestRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final VisitorService visitorService;
    private final com.societyone.app.common.email.EmailService emailService;

    public PublicVisitRequestController(
            SocietyRepository societyRepository,
            BuildingRepository buildingRepository,
            FloorRepository floorRepository,
            FlatRepository flatRepository,
            UserRepository userRepository,
            ResidentProfileRepository residentProfileRepository,
            VisitorRepository visitorRepository,
            VisitRequestRepository visitRequestRepository,
            NotificationService notificationService,
            AuditService auditService,
            VisitorService visitorService,
            com.societyone.app.common.email.EmailService emailService
    ) {
        this.societyRepository = societyRepository;
        this.buildingRepository = buildingRepository;
        this.floorRepository = floorRepository;
        this.flatRepository = flatRepository;
        this.userRepository = userRepository;
        this.residentProfileRepository = residentProfileRepository;
        this.visitorRepository = visitorRepository;
        this.visitRequestRepository = visitRequestRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.visitorService = visitorService;
        this.emailService = emailService;
    }

    @GetMapping("/societies/structure")
    @Transactional(readOnly = true)
    public ApiResponse<PublicStructureResponse> getPublicStructure() {
        List<Society> societies = societyRepository.findAll();
        List<ResidentProfile> allResidentProfiles = residentProfileRepository.findAll();

        Map<Long, List<PublicStructureResponse.PublicResidentItem>> residentsByFlat = allResidentProfiles.stream()
                .filter(rp -> rp.getFlat() != null && rp.getUser() != null)
                .collect(Collectors.groupingBy(
                        rp -> rp.getFlat().getId(),
                        Collectors.mapping(
                                rp -> new PublicStructureResponse.PublicResidentItem(
                                        rp.getUser().getId(),
                                        rp.getUser().getFullName(),
                                        rp.getUser().getUsername()
                                ),
                                Collectors.toList()
                        )
                ));

        List<PublicStructureResponse.PublicSocietyItem> societyItems = societies.stream().map(soc -> {
            List<Building> buildings = buildingRepository.findBySocietyIdOrderByNameAsc(soc.getId());
            List<PublicStructureResponse.PublicBuildingItem> buildingItems = buildings.stream().map(bld -> {
                List<Floor> floors = floorRepository.findByBuildingIdOrderByNumberAsc(bld.getId());
                List<PublicStructureResponse.PublicFloorItem> floorItems = floors.stream().map(flr -> {
                    List<Flat> flats = flatRepository.findByFloorIdOrderByNumberAsc(flr.getId());
                    List<PublicStructureResponse.PublicFlatItem> flatItems = flats.stream().map(flt -> {
                        List<PublicStructureResponse.PublicResidentItem> residentItems =
                                residentsByFlat.getOrDefault(flt.getId(), Collections.emptyList());
                        return new PublicStructureResponse.PublicFlatItem(flt.getId(), flt.getNumber(), residentItems);
                    }).toList();
                    return new PublicStructureResponse.PublicFloorItem(flr.getId(), flr.getNumber(), flatItems);
                }).toList();
                return new PublicStructureResponse.PublicBuildingItem(bld.getId(), bld.getName(), floorItems);
            }).toList();
            return new PublicStructureResponse.PublicSocietyItem(soc.getId(), soc.getName(), soc.getAddress(), buildingItems);
        }).toList();

        return ApiResponse.success(new PublicStructureResponse(societyItems));
    }

    @PostMapping("/visit-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VisitRequestResponse> createPublicVisitRequest(
            @Valid @RequestBody PublicVisitRequestCreateRequest request
    ) {
        Society society = societyRepository.findById(request.societyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Society not found"));

        Flat flat = flatRepository.findById(request.flatId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Flat not found"));

        if (!flat.getSociety().getId().equals(society.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Flat does not belong to the selected society");
        }

        if (request.buildingId() != null) {
            Building bld = buildingRepository.findById(request.buildingId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Building not found"));
            if (!bld.getSociety().getId().equals(society.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Building does not belong to the selected society");
            }
            if (!flat.getFloor().getBuilding().getId().equals(bld.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Flat does not belong to the selected building");
            }
        }

        if (request.floorId() != null) {
            Floor flr = floorRepository.findById(request.floorId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Floor not found"));
            if (!flat.getFloor().getId().equals(flr.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Flat does not belong to the selected floor");
            }
        }

        User resident = userRepository.findById(request.residentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resident not found"));

        if (resident.getRole() != Role.RESIDENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not a resident");
        }

        ResidentProfile profile = residentProfileRepository.findByUserId(resident.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user has no resident profile"));

        if (!profile.getFlat().getId().equals(flat.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resident is not assigned to the selected flat");
        }

        if (!profile.getFlat().getSociety().getId().equals(society.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resident does not belong to the selected society");
        }

        String mobile = request.mobileNumber().trim();
        Visitor visitor = visitorRepository.findFirstByMobileNumber(mobile)
                .orElseGet(() -> {
                    Visitor v = new Visitor();
                    v.setFullName(request.fullName().trim());
                    v.setMobileNumber(mobile);
                    v.setVisitorType(request.visitorType() != null ? request.visitorType() : VisitorType.GUEST);
                    if (request.vehicleNumber() != null && !request.vehicleNumber().isBlank()) {
                        v.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
                    }
                    if (request.photoUrl() != null && !request.photoUrl().isBlank()) {
                        v.setPhotoUrl(request.photoUrl().trim());
                    }
                    return visitorRepository.saveAndFlush(v);
                });

        if (request.photoUrl() != null && !request.photoUrl().isBlank()
                && (visitor.getPhotoUrl() == null || visitor.getPhotoUrl().isBlank())) {
            visitor.setPhotoUrl(request.photoUrl().trim());
            visitor = visitorRepository.saveAndFlush(visitor);
        }

        VisitRequest vr = new VisitRequest();
        vr.setVisitor(visitor);
        vr.setSociety(society);
        vr.setFlat(flat);
        vr.setResident(resident);
        vr.setVisitorUser(null);
        vr.setSource(VisitSource.VISITOR);
        vr.setRequestStatus(VisitRequestStatus.PENDING_RESIDENT);
        vr.setVisitStatus(VisitStatus.WAITING_AT_GATE);
        vr.setExpectedDate(request.expectedDate() != null ? request.expectedDate() : LocalDate.now());
        vr.setExpectedTime(request.expectedTime() != null ? request.expectedTime() : LocalTime.now());
        vr.setPurpose(request.purpose().trim());
        if (request.vehicleNumber() != null && !request.vehicleNumber().isBlank()) {
            vr.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
        }

        VisitRequest saved = visitRequestRepository.saveAndFlush(vr);

        notificationService.send(
                resident.getId(),
                society.getId(),
                NotificationType.REQUEST,
                "New visitor request",
                visitor.getFullName() + " requested a visit to your flat " + flat.getNumber() + ". Approve or reject to proceed.",
                saved.getId()
        );

        auditService.record(
                resident.getId(),
                society.getId(),
                AuditAction.VISIT_REQUEST_CREATED,
                "VISIT_REQUEST",
                saved.getId(),
                "Public guest visit request created for " + visitor.getFullName() + " → flat " + flat.getNumber()
        );

        return ApiResponse.success(toResponse(saved));
    }

    @GetMapping("/societies")
    @Transactional(readOnly = true)
    public ApiResponse<List<com.societyone.app.visitor.dto.PublicSocietyResponse>> getPublicSocieties() {
        List<Society> societies = societyRepository.findAll();
        List<com.societyone.app.visitor.dto.PublicSocietyResponse> list = societies.stream()
                .map(s -> new com.societyone.app.visitor.dto.PublicSocietyResponse(s.getId(), s.getName(), s.getAddress()))
                .toList();
        return ApiResponse.success(list);
    }

    @GetMapping("/societies/{societyId}/eligible-recipients")
    @Transactional(readOnly = true)
    public ApiResponse<List<com.societyone.app.visitor.dto.EligibleRecipientResponse>> getEligibleRecipients(
            @PathVariable Long societyId
    ) {
        Society society = societyRepository.findById(societyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Society not found"));

        List<com.societyone.app.visitor.dto.EligibleRecipientResponse> results = new ArrayList<>();

        // 1. Society Admin / Management
        if (society.getOwner() != null) {
            User admin = society.getOwner();
            results.add(new com.societyone.app.visitor.dto.EligibleRecipientResponse(
                    admin.getId(),
                    admin.getFullName(),
                    "ADMIN",
                    "Society Management / Administration",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            ));
        }

        // 2. Residents belonging to flats in this society
        List<ResidentProfile> profiles = residentProfileRepository.findAll();
        for (ResidentProfile rp : profiles) {
            if (rp.getUser() != null && rp.getFlat() != null && rp.getFlat().getSociety() != null
                    && rp.getFlat().getSociety().getId().equals(societyId)) {

                Building bld = rp.getFlat().getFloor() != null ? rp.getFlat().getFloor().getBuilding() : null;
                Floor flr = rp.getFlat().getFloor();
                Flat flt = rp.getFlat();

                String designation = rp.getResidentType() != null ? rp.getResidentType().name() : "Resident";

                results.add(new com.societyone.app.visitor.dto.EligibleRecipientResponse(
                        rp.getUser().getId(),
                        rp.getUser().getFullName(),
                        "RESIDENT",
                        designation,
                        bld != null ? bld.getId() : null,
                        bld != null ? bld.getName() : null,
                        flr != null ? flr.getId() : null,
                        flr != null ? flr.getNumber() : null,
                        flt.getId(),
                        flt.getNumber()
                ));
            }
        }

        // Sort: Admins first, then Residents alphabetically by full name
        results.sort((a, b) -> {
            if ("ADMIN".equals(a.role()) && !"ADMIN".equals(b.role())) return -1;
            if (!"ADMIN".equals(a.role()) && "ADMIN".equals(b.role())) return 1;
            return a.fullName().compareToIgnoreCase(b.fullName());
        });

        return ApiResponse.success(results);
    }

    @PostMapping("/online-visits")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VisitRequestResponse> createOnlineVisit(
            @Valid @RequestBody com.societyone.app.visitor.dto.OnlineVisitCreateRequest request
    ) {
        Society society = societyRepository.findById(request.societyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Society not found"));

        User recipient = userRepository.findById(request.recipientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected recipient not found"));

        Flat targetFlat = null;

        if (recipient.getRole() == Role.RESIDENT) {
            ResidentProfile profile = residentProfileRepository.findByUserId(recipient.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected resident has no active flat assignment"));

            if (profile.getFlat() == null || profile.getFlat().getSociety() == null
                    || !profile.getFlat().getSociety().getId().equals(society.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected resident does not belong to this society");
            }
            targetFlat = profile.getFlat();
        } else if (recipient.getRole() == Role.ADMIN) {
            // Validate Admin belongs to society
            boolean isOwner = society.getOwner() != null && society.getOwner().getId().equals(recipient.getId());
            if (!isOwner) {
                // If not direct owner, verify admin role
                if (recipient.getRole() != Role.ADMIN) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not an administrator of this society");
                }
            }
            // Flat is optional/null for society administration
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient must be a resident or society administrator");
        }

        String mobile = request.mobileNumber().trim();
        Visitor visitor = visitorRepository.findFirstByMobileNumber(mobile)
                .orElseGet(() -> {
                    Visitor v = new Visitor();
                    v.setFullName(request.fullName().trim());
                    v.setMobileNumber(mobile);
                    v.setVisitorType(request.visitorType() != null ? request.visitorType() : VisitorType.GUEST);
                    if (request.email() != null && !request.email().isBlank()) {
                        v.setEmail(request.email().trim().toLowerCase());
                    }
                    if (request.vehicleNumber() != null && !request.vehicleNumber().isBlank()) {
                        v.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
                    }
                    if (request.photoUrl() != null && !request.photoUrl().isBlank()) {
                        v.setPhotoUrl(request.photoUrl().trim());
                    }
                    return visitorRepository.saveAndFlush(v);
                });

        boolean visitorUpdated = false;
        if (request.email() != null && !request.email().isBlank()) {
            visitor.setEmail(request.email().trim().toLowerCase());
            visitorUpdated = true;
        }
        if (request.photoUrl() != null && !request.photoUrl().isBlank()
                && (visitor.getPhotoUrl() == null || visitor.getPhotoUrl().isBlank())) {
            visitor.setPhotoUrl(request.photoUrl().trim());
            visitorUpdated = true;
        }
        if (visitorUpdated) {
            visitor = visitorRepository.saveAndFlush(visitor);
        }

        VisitRequest vr = new VisitRequest();
        vr.setVisitor(visitor);
        vr.setSociety(society);
        vr.setFlat(targetFlat);
        vr.setResident(recipient);
        vr.setVisitorUser(null);
        vr.setSource(VisitSource.VISITOR);
        vr.setRequestStatus(VisitRequestStatus.PENDING_RESIDENT);
        vr.setVisitStatus(VisitStatus.EXPECTED);
        vr.setExpectedDate(request.expectedDate() != null ? request.expectedDate() : LocalDate.now());
        vr.setExpectedTime(request.expectedTime() != null ? request.expectedTime() : LocalTime.now());
        vr.setPurpose(request.purpose().trim());
        if (request.vehicleNumber() != null && !request.vehicleNumber().isBlank()) {
            vr.setVehicleNumber(request.vehicleNumber().trim().toUpperCase());
        }

        VisitRequest saved = visitRequestRepository.saveAndFlush(vr);

        String destinationStr = targetFlat != null ? "Flat " + targetFlat.getNumber() : "Society Management / Office";

        notificationService.send(
                recipient.getId(),
                society.getId(),
                NotificationType.REQUEST,
                "New Online Visit Request",
                visitor.getFullName() + " submitted an online visit request for " + destinationStr + " (" + request.purpose().trim() + "). Please review and approve.",
                saved.getId()
        );

        auditService.record(
                recipient.getId(),
                society.getId(),
                AuditAction.VISIT_REQUEST_CREATED,
                "VISIT_REQUEST",
                saved.getId(),
                "Online visit request submitted for " + visitor.getFullName() + " → " + destinationStr
        );

        // 1. Send Welcome & Confirmation Email to the Online Visitor
        if (visitor.getEmail() != null && !visitor.getEmail().isBlank()) {
            emailService.sendOnlineVisitRegistrationWelcomeEmail(
                    visitor.getEmail(),
                    visitor.getFullName(),
                    recipient.getFullName(),
                    society.getName(),
                    destinationStr,
                    saved.getExpectedDate().toString(),
                    saved.getExpectedTime() != null ? saved.getExpectedTime().toString() : "Scheduled Time",
                    saved.getPurpose()
            );
        }

        // 2. Send Action-Required Notification Email to the Host (Resident / Admin)
        if (recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
            emailService.sendOnlineVisitHostNotificationEmail(
                    recipient.getEmail(),
                    recipient.getFullName(),
                    visitor.getFullName(),
                    visitor.getMobileNumber(),
                    visitor.getEmail(),
                    society.getName(),
                    destinationStr,
                    saved.getExpectedDate().toString(),
                    saved.getExpectedTime() != null ? saved.getExpectedTime().toString() : "Scheduled Time",
                    saved.getPurpose(),
                    request.notes(),
                    saved.getId()
            );
        }

        return ApiResponse.success(toResponse(saved));
    }

    @GetMapping("/online-visits/{id}")
    public ApiResponse<VisitRequestResponse> getOnlineVisitStatus(@PathVariable Long id) {
        VisitRequest vr = visitRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Online visit request not found"));
        return ApiResponse.success(toResponse(vr));
    }

    @GetMapping("/visit-requests/{id}")
    public ApiResponse<VisitRequestResponse> getPublicVisitRequestStatus(@PathVariable Long id) {
        VisitRequest vr = visitRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visit request not found"));
        return ApiResponse.success(toResponse(vr));
    }

    @PostMapping("/visitor-photo")
    public ApiResponse<Map<String, String>> uploadVisitorPhoto(
            @RequestParam("file") MultipartFile file
    ) {
        String photoUrl = visitorService.uploadVisitorPhoto(file);
        return ApiResponse.success(Map.of("photoUrl", photoUrl));
    }

    private VisitRequestResponse toResponse(VisitRequest r) {
        String buildingName = (r.getFlat() != null && r.getFlat().getBuilding() != null)
                ? r.getFlat().getBuilding().getName()
                : (r.getFlat() != null && r.getFlat().getFloor() != null && r.getFlat().getFloor().getBuilding() != null
                    ? r.getFlat().getFloor().getBuilding().getName() : null);

        Long flatId = r.getFlat() != null ? r.getFlat().getId() : null;
        String flatNumber = r.getFlat() != null ? r.getFlat().getNumber() : "Office / Admin";

        return new VisitRequestResponse(
                r.getId(),
                r.getVisitor().getId(),
                r.getVisitor().getFullName(),
                r.getVisitor().getMobileNumber(),
                r.getVisitor().getVisitorType(),
                r.getVisitor().getPhotoUrl(),
                r.getSociety().getId(),
                r.getSociety().getName(),
                buildingName,
                flatId,
                flatNumber,
                r.getResident().getId(),
                r.getResident().getFullName(),
                r.getSource(),
                r.getRequestStatus(),
                r.getVisitStatus(),
                r.getExpectedDate(),
                r.getExpectedTime(),
                r.getPurpose(),
                r.getVehicleNumber(),
                r.getCreatedAt(),
                r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt()
        );
    }
}
