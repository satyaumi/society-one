package com.societyone.app.auth.repository;

import com.societyone.app.auth.entity.Role;
import com.societyone.app.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByMobileNumber(String mobileNumber);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByMobileNumber(String mobileNumber);

    /** Used by first-admin bootstrap to gate the provisioning endpoint. */
    long countByRole(Role role);
}
