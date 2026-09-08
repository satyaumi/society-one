package com.societyone.app.society.entity;

import com.societyone.app.auth.entity.User;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "society_creation_requests")
public class SocietyCreationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_code", nullable = false, length = 40, unique = true)
    private String referenceCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_user_id")
    private User applicantUser;

    @Column(name = "primary_contact_name", nullable = false, length = 120)
    private String primaryContactName;

    @Column(name = "primary_contact_email", nullable = false, length = 255)
    private String primaryContactEmail;

    @Column(name = "primary_contact_phone", nullable = false, length = 30)
    private String primaryContactPhone;

    @Column(name = "society_official_email", length = 255)
    private String societyOfficialEmail;

    @Column(name = "secondary_contact_name", length = 120)
    private String secondaryContactName;

    @Column(name = "secondary_contact_phone", length = 30)
    private String secondaryContactPhone;

    @Column(name = "secondary_contact_email", length = 255)
    private String secondaryContactEmail;

    @Column(name = "society_name", nullable = false, length = 160)
    private String societyName;

    @Column(name = "registration_number", length = 80)
    private String registrationNumber;

    @Column(name = "society_type", nullable = false, length = 60)
    private String societyType = "HOUSING_SOCIETY";

    @Column(name = "total_flats", nullable = false)
    private Integer totalFlats = 1;

    @Column(name = "number_of_wings", nullable = false)
    private Integer numberOfWings = 1;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(name = "postal_code", nullable = false, length = 20)
    private String postalCode;

    @Column(name = "management_method", length = 80)
    private String managementMethod = "MANUAL";

    @Column(name = "document_url", length = 500)
    private String documentUrl;

    @Column(name = "document_filename", length = 255)
    private String documentFilename;

    @Column(name = "document_size_bytes")
    private Long documentSizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SocietyRequestStatus status = SocietyRequestStatus.SUBMITTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_user_id")
    private User reviewerUser;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_society_id")
    private Society createdSociety;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = SocietyRequestStatus.SUBMITTED;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public User getApplicantUser() {
        return applicantUser;
    }

    public void setApplicantUser(User applicantUser) {
        this.applicantUser = applicantUser;
    }

    public String getPrimaryContactName() {
        return primaryContactName;
    }

    public void setPrimaryContactName(String primaryContactName) {
        this.primaryContactName = primaryContactName;
    }

    public String getPrimaryContactEmail() {
        return primaryContactEmail;
    }

    public void setPrimaryContactEmail(String primaryContactEmail) {
        this.primaryContactEmail = primaryContactEmail;
    }

    public String getPrimaryContactPhone() {
        return primaryContactPhone;
    }

    public void setPrimaryContactPhone(String primaryContactPhone) {
        this.primaryContactPhone = primaryContactPhone;
    }

    public String getSocietyOfficialEmail() {
        return societyOfficialEmail;
    }

    public void setSocietyOfficialEmail(String societyOfficialEmail) {
        this.societyOfficialEmail = societyOfficialEmail;
    }

    public String getSecondaryContactName() {
        return secondaryContactName;
    }

    public void setSecondaryContactName(String secondaryContactName) {
        this.secondaryContactName = secondaryContactName;
    }

    public String getSecondaryContactPhone() {
        return secondaryContactPhone;
    }

    public void setSecondaryContactPhone(String secondaryContactPhone) {
        this.secondaryContactPhone = secondaryContactPhone;
    }

    public String getSecondaryContactEmail() {
        return secondaryContactEmail;
    }

    public void setSecondaryContactEmail(String secondaryContactEmail) {
        this.secondaryContactEmail = secondaryContactEmail;
    }

    public String getSocietyName() {
        return societyName;
    }

    public void setSocietyName(String societyName) {
        this.societyName = societyName;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getSocietyType() {
        return societyType;
    }

    public void setSocietyType(String societyType) {
        this.societyType = societyType;
    }

    public Integer getTotalFlats() {
        return totalFlats;
    }

    public void setTotalFlats(Integer totalFlats) {
        this.totalFlats = totalFlats;
    }

    public Integer getNumberOfWings() {
        return numberOfWings;
    }

    public void setNumberOfWings(Integer numberOfWings) {
        this.numberOfWings = numberOfWings;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getManagementMethod() {
        return managementMethod;
    }

    public void setManagementMethod(String managementMethod) {
        this.managementMethod = managementMethod;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public void setDocumentUrl(String documentUrl) {
        this.documentUrl = documentUrl;
    }

    public String getDocumentFilename() {
        return documentFilename;
    }

    public void setDocumentFilename(String documentFilename) {
        this.documentFilename = documentFilename;
    }

    public Long getDocumentSizeBytes() {
        return documentSizeBytes;
    }

    public void setDocumentSizeBytes(Long documentSizeBytes) {
        this.documentSizeBytes = documentSizeBytes;
    }

    public SocietyRequestStatus getStatus() {
        return status;
    }

    public void setStatus(SocietyRequestStatus status) {
        this.status = status;
    }

    public User getReviewerUser() {
        return reviewerUser;
    }

    public void setReviewerUser(User reviewerUser) {
        this.reviewerUser = reviewerUser;
    }

    public String getReviewNotes() {
        return reviewNotes;
    }

    public void setReviewNotes(String reviewNotes) {
        this.reviewNotes = reviewNotes;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public OffsetDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(OffsetDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public Society getCreatedSociety() {
        return createdSociety;
    }

    public void setCreatedSociety(Society createdSociety) {
        this.createdSociety = createdSociety;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
