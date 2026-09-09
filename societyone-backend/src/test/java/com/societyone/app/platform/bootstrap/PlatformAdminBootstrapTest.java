package com.societyone.app.platform.bootstrap;

import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PlatformAdminBootstrapTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PlatformAdminBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(any())).thenAnswer(inv -> "encoded_" + inv.getArgument(0));

        bootstrap = new PlatformAdminBootstrap(
                userRepository,
                passwordEncoder,
                new com.societyone.app.common.util.ContactNormalizationService()
        );
        ReflectionTestUtils.setField(bootstrap, "adminUsername", "superadmin");
        ReflectionTestUtils.setField(bootstrap, "adminEmail", "thesundar3@gmail.com");
        ReflectionTestUtils.setField(bootstrap, "adminPassword", "SuperAdmin@2026");
        ReflectionTestUtils.setField(bootstrap, "adminFullName", "Platform Super Admin");
        ReflectionTestUtils.setField(bootstrap, "adminMobile", "+919999900000");
    }

    @Test
    @DisplayName("Should create new Super Admin user when no admin exists and email is not registered")
    void shouldCreateNewSuperAdminWhenNoneExists() {
        when(userRepository.countByRole(Role.PLATFORM_ADMIN)).thenReturn(0L);
        when(userRepository.findByEmailIgnoreCase("thesundar3@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("superadmin")).thenReturn(Optional.empty());

        bootstrap.ensurePlatformAdminExists();

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(1)).save(userCaptor.capture());

        User saved = userCaptor.getValue();
        assertEquals("superadmin", saved.getUsername());
        assertEquals("thesundar3@gmail.com", saved.getEmail());
        assertEquals(Role.PLATFORM_ADMIN, saved.getRole());
        assertEquals(AccountStatus.ACTIVE, saved.getAccountStatus());
        assertTrue(saved.isEmailVerified());
        assertEquals("encoded_SuperAdmin@2026", saved.getPasswordHash());
    }

    @Test
    @DisplayName("Should promote existing user to PLATFORM_ADMIN if email is found")
    void shouldPromoteExistingUserWhenEmailMatches() {
        User existingUser = new User();
        existingUser.setUsername("Admin");
        existingUser.setEmail("thesundar3@gmail.com");
        existingUser.setRole(Role.ADMIN);

        when(userRepository.countByRole(Role.PLATFORM_ADMIN)).thenReturn(0L);
        when(userRepository.findByEmailIgnoreCase("thesundar3@gmail.com")).thenReturn(Optional.of(existingUser));

        bootstrap.ensurePlatformAdminExists();

        verify(userRepository, times(1)).save(existingUser);
        assertEquals(Role.PLATFORM_ADMIN, existingUser.getRole());
        assertEquals(AccountStatus.ACTIVE, existingUser.getAccountStatus());
        assertTrue(existingUser.isEmailVerified());
    }

    @Test
    @DisplayName("Should do nothing if a PLATFORM_ADMIN already exists")
    void shouldSkipIfAdminAlreadyExists() {
        when(userRepository.countByRole(Role.PLATFORM_ADMIN)).thenReturn(1L);

        bootstrap.ensurePlatformAdminExists();

        verify(userRepository, never()).save(any());
    }
}
