package com.societyone.app.resident.entity;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Flat;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "resident_profiles",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_resident_profiles_user_id",
                        columnNames = "user_id"
                )
        }
)
public class ResidentProfile {

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
            name = "flat_id",
            nullable = false
    )
    private Flat flat;

    @Enumerated(EnumType.STRING)
    @Column(name = "resident_type", nullable = false, length = 30)
    private ResidentType residentType = ResidentType.OWNER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ResidentStatus status = ResidentStatus.ACTIVE;

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

    public Flat getFlat() {
        return flat;
    }

    public void setFlat(Flat flat) {
        this.flat = flat;
    }

    public ResidentType getResidentType() {
        return residentType;
    }

    public void setResidentType(ResidentType residentType) {
        this.residentType = residentType;
    }

    public ResidentStatus getStatus() {
        return status;
    }

    public void setStatus(ResidentStatus status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}