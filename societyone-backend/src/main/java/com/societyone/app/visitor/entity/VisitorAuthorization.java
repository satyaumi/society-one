package com.societyone.app.visitor.entity;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Society;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "visitor_authorizations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_va_visitor_flat", columnNames = {"visitor_id", "flat_id"})
        }
)
public class VisitorAuthorization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visitor_id", nullable = false)
    private Visitor visitor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "society_id", nullable = false)
    private Society society;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flat_id", nullable = false)
    private Flat flat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resident_id", nullable = false)
    private User resident;

    @Enumerated(EnumType.STRING)
    @Column(name = "authorization_type", nullable = false, length = 30)
    private AuthorizationType authorizationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AuthorizationStatus status;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (validFrom == null) {
            validFrom = LocalDate.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public boolean isCurrentlyValid() {
        if (status != AuthorizationStatus.ACTIVE) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (validFrom != null && today.isBefore(validFrom)) {
            return false;
        }
        if (validUntil != null && today.isAfter(validUntil)) {
            return false;
        }
        return true;
    }

    public Long getId() {
        return id;
    }

    public Visitor getVisitor() {
        return visitor;
    }

    public void setVisitor(Visitor visitor) {
        this.visitor = visitor;
    }

    public Society getSociety() {
        return society;
    }

    public void setSociety(Society society) {
        this.society = society;
    }

    public Flat getFlat() {
        return flat;
    }

    public void setFlat(Flat flat) {
        this.flat = flat;
    }

    public User getResident() {
        return resident;
    }

    public void setResident(User resident) {
        this.resident = resident;
    }

    public AuthorizationType getAuthorizationType() {
        return authorizationType;
    }

    public void setAuthorizationType(AuthorizationType authorizationType) {
        this.authorizationType = authorizationType;
    }

    public AuthorizationStatus getStatus() {
        return status;
    }

    public void setStatus(AuthorizationStatus status) {
        this.status = status;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = validFrom;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
