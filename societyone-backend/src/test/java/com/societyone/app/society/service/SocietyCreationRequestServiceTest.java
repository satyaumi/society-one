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
                emailService,
                new com.societyone.app.common.util.ContactNormalizationService()
        );

        when(userRepository.findByMobileNumber(any())).thenReturn(Optional.empty());
        when(societyRepository.existsByOwner(any())).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(any())).thenReturn(false);

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

    @Test
    @DisplayName("DB +919876543210 + application 9876543210 reuses the existing user")
    void shouldReuseUserWhenApplicationPhoneOmitsCountryCode() {
        approveReusesExistingMobile("9876543210");
    }

    @Test
    @DisplayName("DB +919876543210 + application +91 9876543210 reuses the existing user")
    void shouldReuseUserWhenApplicationPhoneHasSpaces() {
        approveReusesExistingMobile("+91 9876543210");
    }

    @Test
    @DisplayName("Email case and whitespace are normalized before reuse")
    void shouldReuseUserWhenEmailHasCaseAndWhitespace() {
        User existing = storedAdminUser();
        existing.setEmail("admin@example.com");
        existing.setMobileNumber("+919876543210");

        SocietyCreationRequest req = pendingRequest("  Admin@Example.COM  ", "9876543211");
        stubApproveLookups(req);
        when(userRepository.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.approveAndCreateSociety(platformAdmin, 5L, new SocietyRequestReviewAction("ok", null, "SocAdmin#2026!"));

        verify(userRepository, times(1)).save(existing);
        verify(userRepository, never()).save(argThat(user -> user != existing && user.getId() == null));
        assertEquals(Role.ADMIN, existing.getRole());
    }

    @Test
    @DisplayName("No matching user creates exactly one new admin")
    void shouldCreateExactlyOneUserWhenNoneMatch() {
        SocietyCreationRequest req = pendingRequest("new.admin@example.com", "9876543210");
        stubApproveLookups(req);
        when(userRepository.findByEmailIgnoreCase("new.admin@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase("new.admin@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            if (user.getId() == null) {
                ReflectionTestUtils.setField(user, "id", 77L);
            }
            return user;
        });

        service.approveAndCreateSociety(platformAdmin, 5L, new SocietyRequestReviewAction("ok", null, "SocAdmin#2026!"));

        verify(userRepository, times(1)).save(argThat(user ->
                "+919876543210".equals(user.getMobileNumber())
                        && "new.admin@example.com".equals(user.getEmail())
                        && user.getRole() == Role.ADMIN
        ));
    }

    @Test
    @DisplayName("Invalid phone returns a clear validation error")
    void shouldRejectInvalidPhoneOnApprove() {
        SocietyCreationRequest req = pendingRequest("admin@example.com", "not-a-phone");
        when(requestRepository.findById(5L)).thenReturn(Optional.of(req));
        when(societyRepository.existsByNameIgnoreCase(any())).thenReturn(false);

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.approveAndCreateSociety(
                        platformAdmin,
                        5L,
                        new SocietyRequestReviewAction("ok", null, "SocAdmin#2026!")
                )
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason() != null && ex.getReason().toLowerCase().contains("invalid mobile"));
        verify(societyRepository, never()).save(any());
    }

    @Test
    @DisplayName("Successful Society Admin approval does not raise a data-conflict rollback")
    void shouldApproveWithoutDataConflict() {
        shouldApproveAndCreateSocietyWithExistingUser();
    }

    private void approveReusesExistingMobile(String applicationPhone) {
        User existing = storedAdminUser();
        existing.setEmail("other@example.com");
        existing.setMobileNumber("+919876543210");

        SocietyCreationRequest req = pendingRequest("fresh-" + applicationPhone.hashCode() + "@example.com", applicationPhone);
        stubApproveLookups(req);
        when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(userRepository.findByMobileNumber("+919876543210")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        SocietyCreationRequestResponse res = service.approveAndCreateSociety(
                platformAdmin,
                5L,
                new SocietyRequestReviewAction("ok", null, "SocAdmin#2026!")
        );

        assertEquals("SOCIETY_CREATED", res.status());
        assertEquals(Role.ADMIN, existing.getRole());
        verify(userRepository, times(1)).save(existing);
        verify(societyRepository, times(1)).save(any(Society.class));
    }

    private User storedAdminUser() {
        User existing = new User();
        ReflectionTestUtils.setField(existing, "id", 9L);
        existing.setUsername("existing9");
        existing.setRole(Role.RESIDENT);
        existing.setAccountStatus(AccountStatus.ACTIVE);
        return existing;
    }

    private SocietyCreationRequest pendingRequest(String email, String phone) {
        SocietyCreationRequest req = new SocietyCreationRequest();
        ReflectionTestUtils.setField(req, "id", 5L);
        req.setReferenceCode("REQ-SOC-PHONE");
        req.setSocietyName("Dream City");
        req.setPrimaryContactName("Alice Admin");
        req.setPrimaryContactEmail(email);
        req.setPrimaryContactPhone(phone);
        req.setAddress("1 Lake Road");
        req.setCity("Bhubaneswar");
        req.setState("Odisha");
        req.setPostalCode("751001");
        req.setNumberOfWings(1);
        req.setTotalFlats(10);
        req.setStatus(SocietyRequestStatus.SUBMITTED);
        return req;
    }

    private void stubApproveLookups(SocietyCreationRequest req) {
        when(requestRepository.findById(5L)).thenReturn(Optional.of(req));
        when(societyRepository.existsByNameIgnoreCase(req.getSocietyName())).thenReturn(false);
        when(societyRepository.save(any(Society.class))).thenAnswer(inv -> {
            Society society = inv.getArgument(0);
            ReflectionTestUtils.setField(society, "id", 101L);
            return society;
        });
        when(buildingRepository.save(any(Building.class))).thenAnswer(inv -> inv.getArgument(0));
        when(requestRepository.save(any(SocietyCreationRequest.class))).thenAnswer(inv -> inv.getArgument(0));
    }
}
