package com.societyone.app.security.entity;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Society;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "security_staff_profiles",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_security_staff_user_id",
                        columnNames = "user_id"
                )
        }
)
public class SecurityStaffProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            unique = true
    )
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "society_id",
            nullable = false
    )
    private Society society;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SecurityStaffStatus status = SecurityStaffStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Society getSociety() {
        return society;
    }

    public void setSociety(Society society) {
        this.society = society;
    }

    public SecurityStaffStatus getStatus() {
        return status;
    }

    public void setStatus(SecurityStaffStatus status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
