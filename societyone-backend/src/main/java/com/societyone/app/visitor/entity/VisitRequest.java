package com.societyone.app.visitor.entity;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Society;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "visit_requests")
public class VisitRequest {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_user_id")
    private User visitorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private VisitSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_status", nullable = false, length = 40)
    private VisitRequestStatus requestStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "visit_status", nullable = false, length = 30)
    private VisitStatus visitStatus;

    @Column(name = "expected_date", nullable = false)
    private LocalDate expectedDate;

    @Column(name = "expected_time")
    private LocalTime expectedTime;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Column(name = "vehicle_number", length = 30)
    private String vehicleNumber;

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

    public VisitSource getSource() {
        return source;
    }

    public void setSource(VisitSource source) {
        this.source = source;
    }

    public VisitRequestStatus getRequestStatus() {
        return requestStatus;
    }

    public void setRequestStatus(VisitRequestStatus requestStatus) {
        this.requestStatus = requestStatus;
    }

    public VisitStatus getVisitStatus() {
        return visitStatus;
    }

    public void setVisitStatus(VisitStatus visitStatus) {
        this.visitStatus = visitStatus;
    }

    public LocalDate getExpectedDate() {
        return expectedDate;
    }

    public void setExpectedDate(LocalDate expectedDate) {
        this.expectedDate = expectedDate;
    }

    public LocalTime getExpectedTime() {
        return expectedTime;
    }

    public void setExpectedTime(LocalTime expectedTime) {
        this.expectedTime = expectedTime;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public User getVisitorUser() {
        return visitorUser;
    }

    public void setVisitorUser(User visitorUser) {
        this.visitorUser = visitorUser;
    }
}