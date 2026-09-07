package com.societyone.app.notification.service;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.notification.dto.AnnouncementResponse;
import com.societyone.app.notification.dto.CreateAnnouncementRequest;
import com.societyone.app.notification.dto.UpdateAnnouncementRequest;
import com.societyone.app.notification.entity.*;
import com.societyone.app.notification.repository.AnnouncementRepository;
import com.societyone.app.notification.repository.NotificationRepository;
import com.societyone.app.notification.repository.UserAnnouncementStateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceAnnouncementTest {

    private NotificationRepository notificationRepository;
    private AnnouncementRepository announcementRepository;
    private UserAnnouncementStateRepository userAnnouncementStateRepository;
    private NotificationService notificationService;

    private User adminUser;
    private User residentUser;
    private User securityUser;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        announcementRepository = mock(AnnouncementRepository.class);
        userAnnouncementStateRepository = mock(UserAnnouncementStateRepository.class);

        notificationService = new NotificationService(
                notificationRepository,
                announcementRepository,
                userAnnouncementStateRepository
        );

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@societyone.com");
        adminUser.setRole(Role.ADMIN);

        residentUser = new User();
        residentUser.setId(2L);
        residentUser.setEmail("resident@societyone.com");
        residentUser.setRole(Role.RESIDENT);

        securityUser = new User();
        securityUser.setId(3L);
        securityUser.setEmail("security@societyone.com");
        securityUser.setRole(Role.SECURITY);
    }

    @Test
    @DisplayName("Admin can successfully create an announcement")
    void testAdminCreateAnnouncement() {
        CreateAnnouncementRequest request = new CreateAnnouncementRequest(
                "Ganesh Chaturthi Celebration",
                "Grand celebration in clubhouse",
                AnnouncementType.FESTIVAL,
                AnnouncementAudience.ALL_MEMBERS,
                LocalDate.of(2026, 9, 7),
                "19:00",
                "Society festival celebration",
                null,
                true,
                true
        );

        Announcement saved = new Announcement();
        saved.setId(10L);
        saved.setTitle(request.title());
        saved.setMessage(request.message());
        saved.setType(request.type());
        saved.setAudience(request.audience());
        saved.setCreatedByUserId(adminUser.getId());
        saved.setCreatedAt(OffsetDateTime.now());
        saved.setUpdatedAt(OffsetDateTime.now());
        saved.setActive(true);
        saved.setPinned(true);

        when(announcementRepository.save(any(Announcement.class))).thenReturn(saved);

        AnnouncementResponse response = notificationService.createAnnouncement(adminUser, request);

        assertNotNull(response);
        assertEquals("Ganesh Chaturthi Celebration", response.title());
        assertEquals(AnnouncementType.FESTIVAL, response.type());
        assertEquals(AnnouncementAudience.ALL_MEMBERS, response.audience());
        assertTrue(response.pinned());

        ArgumentCaptor<Announcement> captor = ArgumentCaptor.forClass(Announcement.class);
        verify(announcementRepository).save(captor.capture());
        assertEquals("Ganesh Chaturthi Celebration", captor.getValue().getTitle());
        assertEquals(adminUser.getId(), captor.getValue().getCreatedByUserId());
    }

    @Test
    @DisplayName("Non-admin user cannot create an announcement (throws 403 FORBIDDEN)")
    void testNonAdminCannotCreateAnnouncement() {
        CreateAnnouncementRequest request = new CreateAnnouncementRequest(
                "Test Notice",
                "Message",
                AnnouncementType.GENERAL_NOTICE,
                AnnouncementAudience.ALL_MEMBERS,
                null, null, null, null, true, false
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                notificationService.createAnnouncement(residentUser, request)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(announcementRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin can update an existing announcement")
    void testAdminUpdateAnnouncement() {
        Announcement existing = new Announcement();
        existing.setId(20L);
        existing.setTitle("Old Title");
        existing.setMessage("Old Message");
        existing.setType(AnnouncementType.MAINTENANCE);
        existing.setAudience(AnnouncementAudience.RESIDENTS);
        existing.setActive(true);
        existing.setCreatedByUserId(adminUser.getId());
        existing.setCreatedAt(OffsetDateTime.now());

        when(announcementRepository.findById(20L)).thenReturn(Optional.of(existing));
        when(announcementRepository.save(any(Announcement.class))).thenAnswer(i -> i.getArgument(0));

        UpdateAnnouncementRequest updateRequest = new UpdateAnnouncementRequest(
                "Updated Water Maintenance",
                "Water supply shutdown from 10am to 1pm",
                AnnouncementType.MAINTENANCE,
                AnnouncementAudience.RESIDENTS,
                LocalDate.of(2026, 9, 10),
                "10:00",
                "Tank cleaning",
                null,
                true,
                false
        );

        AnnouncementResponse response = notificationService.updateAnnouncement(adminUser, 20L, updateRequest);

        assertEquals("Updated Water Maintenance", response.title());
        assertEquals("Water supply shutdown from 10am to 1pm", response.message());
        assertEquals(LocalDate.of(2026, 9, 10), response.eventDate());
    }

    @Test
    @DisplayName("Admin can toggle active status of an announcement")
    void testToggleActive() {
        Announcement existing = new Announcement();
        existing.setId(25L);
        existing.setActive(true);
        existing.setTitle("Notice");
        existing.setMessage("Details");
        existing.setType(AnnouncementType.GENERAL_NOTICE);
        existing.setAudience(AnnouncementAudience.ALL_MEMBERS);
        existing.setCreatedByUserId(adminUser.getId());
        existing.setCreatedAt(OffsetDateTime.now());

        when(announcementRepository.findById(25L)).thenReturn(Optional.of(existing));
        when(announcementRepository.save(any(Announcement.class))).thenAnswer(i -> i.getArgument(0));

        AnnouncementResponse response = notificationService.toggleActive(adminUser, 25L);

        assertFalse(response.active());
        assertFalse(existing.isActive());
    }

    @Test
    @DisplayName("Public announcements endpoint returns only active non-expired PUBLIC announcements")
    void testListPublicAnnouncements() {
        Announcement publicAnn = new Announcement();
        publicAnn.setId(30L);
        publicAnn.setTitle("Public Festival Open To Visitors");
        publicAnn.setMessage("Welcome to our society festival");
        publicAnn.setType(AnnouncementType.FESTIVAL);
        publicAnn.setAudience(AnnouncementAudience.PUBLIC);
        publicAnn.setActive(true);
        publicAnn.setCreatedByUserId(adminUser.getId());
        publicAnn.setCreatedAt(OffsetDateTime.now());

        when(announcementRepository.findActiveByAudience(eq(AnnouncementAudience.PUBLIC), any(OffsetDateTime.class)))
                .thenReturn(List.of(publicAnn));

        List<AnnouncementResponse> responses = notificationService.listPublicAnnouncements();

        assertEquals(1, responses.size());
        assertEquals("Public Festival Open To Visitors", responses.get(0).title());
        assertEquals(AnnouncementAudience.PUBLIC, responses.get(0).audience());
    }

    @Test
    @DisplayName("Resident receives ALL_MEMBERS and RESIDENTS announcements in dashboard, excluding dismissed ones")
    void testListActiveAnnouncementsForResident() {
        Announcement allMembersAnn = new Announcement();
        allMembersAnn.setId(40L);
        allMembersAnn.setTitle("Fire Drill Notice");
        allMembersAnn.setMessage("Tomorrow at 4 PM");
        allMembersAnn.setType(AnnouncementType.SECURITY_ALERT);
        allMembersAnn.setAudience(AnnouncementAudience.ALL_MEMBERS);
        allMembersAnn.setActive(true);
        allMembersAnn.setCreatedByUserId(adminUser.getId());
        allMembersAnn.setCreatedAt(OffsetDateTime.now());

        Announcement residentAnn = new Announcement();
        residentAnn.setId(41L);
        residentAnn.setTitle("Lift Maintenance");
        residentAnn.setMessage("Block A lift under maintenance");
        residentAnn.setType(AnnouncementType.MAINTENANCE);
        residentAnn.setAudience(AnnouncementAudience.RESIDENTS);
        residentAnn.setActive(true);
        residentAnn.setCreatedByUserId(adminUser.getId());
        residentAnn.setCreatedAt(OffsetDateTime.now());

        // Dismissed announcement
        UserAnnouncementState dismissedState = new UserAnnouncementState();
        dismissedState.setAnnouncementId(41L);
        dismissedState.setUserId(residentUser.getId());
        dismissedState.setDismissedAt(OffsetDateTime.now());

        when(announcementRepository.findActiveByAudiences(
                anyCollection(),
                any(OffsetDateTime.class)
        )).thenReturn(List.of(allMembersAnn, residentAnn));

        when(userAnnouncementStateRepository.findByUserIdAndAnnouncementIdIn(eq(2L), anyCollection()))
                .thenReturn(List.of(dismissedState));

        List<AnnouncementResponse> result = notificationService.listActiveAnnouncementsForDashboard(residentUser);

        // residentAnn (id=41) should be filtered out because it is dismissed
        assertEquals(1, result.size());
        assertEquals(40L, result.get(0).id());
        assertEquals("Fire Drill Notice", result.get(0).title());
    }

    @Test
    @DisplayName("Security staff receives ALL_MEMBERS and SECURITY announcements")
    void testListActiveAnnouncementsForSecurity() {
        when(announcementRepository.findActiveByAudiences(
                anyCollection(),
                any(OffsetDateTime.class)
        )).thenReturn(Collections.emptyList());

        when(userAnnouncementStateRepository.findByUserIdAndAnnouncementIdIn(eq(3L), anyCollection()))
                .thenReturn(Collections.emptyList());

        List<AnnouncementResponse> result = notificationService.listActiveAnnouncementsForDashboard(securityUser);

        assertNotNull(result);
        verify(announcementRepository).findActiveByAudiences(
                argThat(audiences -> audiences.contains(AnnouncementAudience.ALL_MEMBERS) && audiences.contains(AnnouncementAudience.SECURITY)),
                any(OffsetDateTime.class)
        );
    }

    @Test
    @DisplayName("Dismissing announcement marks dismissedAt timestamp for user")
    void testDismissAnnouncement() {
        Announcement ann = new Announcement();
        ann.setId(50L);
        ann.setAudience(AnnouncementAudience.RESIDENTS);

        when(announcementRepository.findById(50L)).thenReturn(Optional.of(ann));
        when(userAnnouncementStateRepository.findByUserIdAndAnnouncementId(2L, 50L))
                .thenReturn(Optional.empty());

        notificationService.dismissAnnouncement(residentUser, 50L);

        ArgumentCaptor<UserAnnouncementState> captor = ArgumentCaptor.forClass(UserAnnouncementState.class);
        verify(userAnnouncementStateRepository).save(captor.capture());
        UserAnnouncementState saved = captor.getValue();
        assertEquals(2L, saved.getUserId());
        assertEquals(50L, saved.getAnnouncementId());
        assertNotNull(saved.getDismissedAt());
    }

    @Test
    @DisplayName("Mark read works with both ann_ prefix and notif_ prefix")
    void testMarkReadUnified() {
        Announcement ann = new Announcement();
        ann.setId(60L);
        ann.setAudience(AnnouncementAudience.RESIDENTS);

        when(announcementRepository.findById(60L)).thenReturn(Optional.of(ann));
        when(userAnnouncementStateRepository.findByUserIdAndAnnouncementId(2L, 60L))
                .thenReturn(Optional.empty());

        // Mark announcement read
        notificationService.markRead(residentUser, "ann_60");

        ArgumentCaptor<UserAnnouncementState> captor = ArgumentCaptor.forClass(UserAnnouncementState.class);
        verify(userAnnouncementStateRepository).save(captor.capture());
        assertNotNull(captor.getValue().getReadAt());

        // Mark personal notification read
        com.societyone.app.notification.entity.Notification personalNotif =
                new com.societyone.app.notification.entity.Notification();
        personalNotif.setId(70L);
        personalNotif.setRecipientUserId(2L);
        personalNotif.setReadFlag(false);

        when(notificationRepository.findByIdAndRecipientUserId(70L, 2L)).thenReturn(Optional.of(personalNotif));

        notificationService.markRead(residentUser, "notif_70");
        assertTrue(personalNotif.isReadFlag());
        verify(notificationRepository).save(personalNotif);
    }
}
