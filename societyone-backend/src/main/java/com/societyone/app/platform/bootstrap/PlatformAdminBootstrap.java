package com.societyone.app.platform.bootstrap;

import com.societyone.app.auth.entity.AccountStatus;
import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import com.societyone.app.auth.repository.UserRepository;
import com.societyone.app.common.util.ContactNormalizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
public class PlatformAdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(PlatformAdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ContactNormalizationService contactNormalizationService;

    @Value("${societyone.platform-admin.username:superadmin}")
    private String adminUsername;

    @Value("${societyone.platform-admin.email:societyone26@gmail.com}")
    private String adminEmail;

    @Value("${societyone.platform-admin.password:SuperAdmin@2026}")
    private String adminPassword;

    @Value("${societyone.platform-admin.full-name:Platform Super Admin}")
    private String adminFullName;

    @Value("${societyone.platform-admin.mobile-number:+919999900000}")
    private String adminMobile;

    public PlatformAdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder, ContactNormalizationService contactNormalizationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.contactNormalizationService = contactNormalizationService;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensurePlatformAdminExists() {
        long platformAdminCount = userRepository.countByRole(Role.PLATFORM_ADMIN);
        if (platformAdminCount > 0) {
            log.info("[PlatformAdminBootstrap] Platform admin accounts already exist (count={}). Skipping bootstrap.", platformAdminCount);
            return;
        }

        // 1. Check if an existing account matches the configured email
        Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(adminEmail);
        if (existingByEmail.isPresent()) {
            User user = existingByEmail.get();
            user.setRole(Role.PLATFORM_ADMIN);
            user.setAccountStatus(AccountStatus.ACTIVE);
            user.setEmailVerified(true);
            userRepository.save(user);
            log.info("[PlatformAdminBootstrap] Promoted existing user '{}' ({}) to PLATFORM_ADMIN.", user.getUsername(), user.getEmail());
            return;
        }

        // 2. Check if an existing account matches the configured username
        Optional<User> existingByUsername = userRepository.findByUsernameIgnoreCase(adminUsername);
        if (existingByUsername.isPresent()) {
            User user = existingByUsername.get();
            user.setRole(Role.PLATFORM_ADMIN);
            user.setAccountStatus(AccountStatus.ACTIVE);
            user.setEmailVerified(true);
            userRepository.save(user);
            log.info("[PlatformAdminBootstrap] Promoted existing user '{}' to PLATFORM_ADMIN.", user.getUsername());
            return;
        }

        // 3. Create new Super Admin User
        User superAdmin = new User();
        superAdmin.setFullName(adminFullName);
        superAdmin.setUsername(adminUsername.toLowerCase().trim());
        superAdmin.setEmail(contactNormalizationService.normalizeEmail(adminEmail));
        superAdmin.setMobileNumber(contactNormalizationService.tryNormalizeMobile(adminMobile));
        superAdmin.setPasswordHash(passwordEncoder.encode(adminPassword));
        superAdmin.setRole(Role.PLATFORM_ADMIN);
        superAdmin.setAccountStatus(AccountStatus.ACTIVE);
        superAdmin.setEmailVerified(true);
        superAdmin.setMobileVerified(true);

        userRepository.save(superAdmin);
        log.info("[PlatformAdminBootstrap] Successfully created initial Super Admin account: username='{}', email='{}' (Role: PLATFORM_ADMIN)",
                superAdmin.getUsername(), superAdmin.getEmail());
    }
}
