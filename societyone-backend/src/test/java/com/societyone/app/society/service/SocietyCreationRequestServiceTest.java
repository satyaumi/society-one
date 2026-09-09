package com.societyone.app.society.service;

import com.societyone.app.audit.service.AuditService;
import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.email.EmailService;
import com.societyone.app.platform.dto.SocietyRequestReviewAction;
import com.societyone.app.society.dto.SocietyCreationRequestResponse;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.entity.SocietyCreationRequest;
import com.societyone.app.society.entity.SocietyRequestStatus;
import com.societyone.app.society.repository.BuildingRepository;
import com.societyone.app.society.repository.SocietyCreationRequestRepository;
import com.societyone.app.society.repository.SocietyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SocietyCreationRequestServiceTest {

    private SocietyCreationRequestRepository requestRepository;
    private SocietyRepository societyRepository;
    private BuildingRepository buildingRepository;
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AuditService auditService;
    private EmailService emailService;
    private SocietyCreationRequestService service;

    private User platformAdmin;

    @BeforeEach
    void setUp() {
        requestRepository = mock(SocietyCreationRequestRepository.class);
        societyRepository = mock(SocietyRepository.class);
        buildingRepository = mock(BuildingRepository.class);
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        auditService = mock(AuditService.class);
        emailService = mock(EmailService.class);

        when(passwordEncoder.encode(any())).thenAnswer(inv -> "encoded_" + inv.getArgument(0));

        service = new SocietyCreationRequestService(
                requestRepository,
                societyRepository,
                buildingRepository,
                userRepository,
                passwordEncoder,
                auditService,
                emailService
        );

        platformAdmin = new User();
        ReflectionTestUtils.setField(platformAdmin, "id", 1L);
        platformAdmin.setUsername("superadmin");
        platformAdmin.setRole(Role.PLATFORM_ADMIN);
        platformAdmin.setAccountStatus(AccountStatus.ACTIVE);

        when(userRepository.findById(1L)).thenReturn(Optional.of(platformAdmin));
    }

    @Test
    @DisplayName("Should approve and create society successfully with existing user upgraded to ADMIN")
    void shouldApproveAndCreateSocietyWithExistingUser() {
        SocietyCreationRequest req = new SocietyCreationRequest();
        ReflectionTestUtils.setField(req, "id", 5L);
        req.setReferenceCode("REQ-SOC-P3MLAQ");
        req.setSocietyName("Green Valley");
        req.setPrimaryContactName("Satya Sundar");
        req.setPrimaryContactEmail("societyone26@gmail.com");
        req.setPrimaryContactPhone("8260580199");
        req.setAddress("42 Green Park Avenue, Bhubaneswar");
        req.setCity("Bhubaneswar");
        req.setState("Odisha");
        req.setPostalCode("756105");
        req.setNumberOfWings(4);
        req.setTotalFlats(96);
        req.setStatus(SocietyRequestStatus.SUBMITTED);

        when(requestRepository.findById(5L)).thenReturn(Optional.of(req));
        when(societyRepository.existsByNameIgnoreCase("Green Valley")).thenReturn(false);

        User existingResident = new User();
        ReflectionTestUtils.setField(existingResident, "id", 6L);
        existingResident.setUsername("resident6");
        existingResident.setEmail("societyone26@gmail.com");
        existingResident.setRole(Role.RESIDENT);
        existingResident.setAccountStatus(AccountStatus.ACTIVE);

        when(userRepository.findByEmailIgnoreCase("societyone26@gmail.com")).thenReturn(Optional.of(existingResident));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        when(societyRepository.save(any(Society.class))).thenAnswer(inv -> {
            Society s = inv.getArgument(0);
            ReflectionTestUtils.setField(s, "id", 101L);
            return s;
        });

        when(buildingRepository.save(any(Building.class))).thenAnswer(inv -> inv.getArgument(0));
        when(requestRepository.save(any(SocietyCreationRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        SocietyRequestReviewAction action = new SocietyRequestReviewAction("Verified docs", null, "SocAdmin#2026!");
        SocietyCreationRequestResponse res = service.approveAndCreateSociety(platformAdmin, 5L, action);

        assertNotNull(res);
        assertEquals(5L, res.id());
        assertEquals("SOCIETY_CREATED", res.status());
        assertEquals(101L, res.createdSocietyId());
        assertEquals("Green Valley", res.createdSocietyName());
        assertEquals(Role.ADMIN, existingResident.getRole());

        verify(buildingRepository, times(4)).save(any(Building.class));
        verify(auditService, times(3)).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Applicant can update and resubmit application in CHANGES_REQUESTED status")
    void testResubmitRequestByApplicant() {
        SocietyCreationRequest req = new SocietyCreationRequest();
        ReflectionTestUtils.setField(req, "id", 10L);
        req.setReferenceCode("REQ-SOC-123456");
        req.setSocietyName("Old Name");
        req.setPrimaryContactName("John Doe");
        req.setPrimaryContactEmail("john@example.com");
        req.setPrimaryContactPhone("9876543210");
        req.setStatus(SocietyRequestStatus.CHANGES_REQUESTED);
        req.setReviewNotes("Please update society name and flat count.");

        when(requestRepository.findByReferenceCode("REQ-SOC-123456")).thenReturn(Optional.of(req));
        when(requestRepository.save(any(SocietyCreationRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        com.societyone.app.society.dto.SocietyCreationSubmitRequest updateReq =
                new com.societyone.app.society.dto.SocietyCreationSubmitRequest(
                        "John Doe Updated",
                        "john.updated@example.com",
                        "9876543210",
                        null,
                        null,
                        null,
                        null,
                        "New Society Name",
                        "REG-2026",
                        "HOUSING_SOCIETY",
                        80,
                        3,
                        "123 Main Road",
                        "Bhubaneswar",
                        "Odisha",
                        "751024",
                        "MANAGING_COMMITTEE",
                        null
                );

        SocietyCreationRequestResponse res = service.resubmitRequestByApplicant("REQ-SOC-123456", updateReq, null);

        assertNotNull(res);
        assertEquals("New Society Name", res.societyName());
        assertEquals("SUBMITTED", res.status());
        assertEquals(80, res.totalFlats());
        assertEquals(3, res.numberOfWings());
        assertEquals("john.updated@example.com", res.primaryContactEmail());

        verify(requestRepository).save(req);
        verify(auditService).record(any(), any(), any(), any(), any(), any());
    }
}
