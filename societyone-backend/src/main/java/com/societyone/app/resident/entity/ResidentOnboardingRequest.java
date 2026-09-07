package com.societyone.app.resident.entity;

import com.societyone.app.auth.entity.User;
import com.societyone.app.society.entity.Building;
import com.societyone.app.society.entity.Flat;
import com.societyone.app.society.entity.Society;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
        name = "resident_onboarding_requests",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_onboarding_user_society",
                        columnNames = {"user_id", "society_id"}
                )
        }
)
public class ResidentOnboardingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "society_id", nullable = false)
    private Society society;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "resident_type", nullable = false, length = 30)
    private ResidentType residentType = ResidentType.OWNER;

    @Column(name = "flat_type_preference", length = 30)
    private String flatTypePreference;

    @Column(name = "family_member_count", nullable = false)
    private Integer familyMemberCount = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preferred_building_id")
    private Building preferredBuilding;

    @Column(name = "preferred_flat_number", length = 30)
    private String preferredFlatNumber;

    @Column(name = "emergency_contact_name", length = 150)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 30)
    private String emergencyContactPhone;

    @Column(name = "vehicle_number", length = 50)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OnboardingStatus status = OnboardingStatus.SUBMITTED;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocated_flat_id")
    private Flat allocatedFlat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocated_by_user_id")
    private User allocatedBy;

    @Column(name = "confirmed_flat_type", length = 30)
    private String confirmedFlatType;

    @Column(name = "maintenance_info", length = 255)
    private String maintenanceInfo;

    @Column(name = "parking_status", length = 100)
    private String parkingStatus;

    @Column(name = "allocated_at")
    private OffsetDateTime allocatedAt;

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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public ResidentType getResidentType() {
        return residentType;
    }

    public void setResidentType(ResidentType residentType) {
        this.residentType = residentType;
    }

    public String getFlatTypePreference() {
        return flatTypePreference;
    }

    public void setFlatTypePreference(String flatTypePreference) {
        this.flatTypePreference = flatTypePreference;
    }

    public Integer getFamilyMemberCount() {
        return familyMemberCount;
    }

    public void setFamilyMemberCount(Integer familyMemberCount) {
        this.familyMemberCount = familyMemberCount;
    }

    public Building getPreferredBuilding() {
        return preferredBuilding;
    }

    public void setPreferredBuilding(Building preferredBuilding) {
        this.preferredBuilding = preferredBuilding;
    }

    public String getPreferredFlatNumber() {
        return preferredFlatNumber;
    }

    public void setPreferredFlatNumber(String preferredFlatNumber) {
        this.preferredFlatNumber = preferredFlatNumber;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public void setEmergencyContactName(String emergencyContactName) {
        this.emergencyContactName = emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public void setEmergencyContactPhone(String emergencyContactPhone) {
        this.emergencyContactPhone = emergencyContactPhone;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public OnboardingStatus getStatus() {
        return status;
    }

    public void setStatus(OnboardingStatus status) {
        this.status = status;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public Flat getAllocatedFlat() {
        return allocatedFlat;
    }

    public void setAllocatedFlat(Flat allocatedFlat) {
        this.allocatedFlat = allocatedFlat;
    }

    public User getAllocatedBy() {
        return allocatedBy;
    }

    public void setAllocatedBy(User allocatedBy) {
        this.allocatedBy = allocatedBy;
    }

    public String getConfirmedFlatType() {
        return confirmedFlatType;
    }

    public void setConfirmedFlatType(String confirmedFlatType) {
        this.confirmedFlatType = confirmedFlatType;
    }

    public String getMaintenanceInfo() {
        return maintenanceInfo;
    }

    public void setMaintenanceInfo(String maintenanceInfo) {
        this.maintenanceInfo = maintenanceInfo;
    }

    public String getParkingStatus() {
        return parkingStatus;
    }

    public void setParkingStatus(String parkingStatus) {
        this.parkingStatus = parkingStatus;
    }

    public OffsetDateTime getAllocatedAt() {
        return allocatedAt;
    }

    public void setAllocatedAt(OffsetDateTime allocatedAt) {
        this.allocatedAt = allocatedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
