export type Role = "VISITOR" | "RESIDENT" | "SECURITY" | "ADMIN";

export type VisitorType =
  | "GUEST"
  | "DELIVERY"
  | "COURIER"
  | "CAB_AUTO"
  | "DRIVER"
  | "TECHNICIAN"
  | "VENDOR_CONTRACTOR"
  | "DOMESTIC_WORKER"
  | "OTHER";

export type RequestSource = "VISITOR" | "RESIDENT" | "SECURITY";
export type RequestStatus =
  | "PENDING_RESIDENT"
  | "APPROVED_BY_RESIDENT"
  | "DENIED_BY_RESIDENT"
  | "REJECTED_BY_RESIDENT"
  | "PENDING_SECURITY"
  | "ACCEPTED_BY_SECURITY"
  | "DENIED_BY_SECURITY"
  | "REJECTED_BY_SECURITY"
  | "CANCELLED"
  | "EXPIRED";
export type VisitStatus =
  | "EXPECTED"
  | "WAITING_AT_GATE"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  mobile?: string;
  role: Role;
  avatar?: string;
  profilePhotoUrl?: string;
  flatId?: string;
  flatNumber?: string;
  lastLoginAt?: string;
}

export type StructureStatus = "ACTIVE" | "INACTIVE";

export interface Society {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: StructureStatus;
  createdAt?: string;
  updatedAt?: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  status?: StructureStatus;
  floors: Floor[];
}

export interface Floor {
  id: string;
  number: number;
  status?: StructureStatus;
  flats: Flat[];
}

export interface Flat {
  id: string;
  number: string;
  buildingId: string;
  floorId: string;
  status?: StructureStatus;
  residentIds: string[];
}

export interface Resident extends User {
  role: "RESIDENT";
  flatId: string;
  flatType?: string;
  maintenanceInfo?: string;
  parkingSlot?: string;
  familyMemberCount?: number;
  allocatedAt?: string;
}

export interface Visitor extends User {
  role: "VISITOR";
  visitorType: VisitorType;
  photoUrl?: string;
}

export interface VisitRequest {
  id: string;
  visitor: Visitor;
  resident: Resident;
  society: Society;
  flat?: Flat;
  buildingName?: string;
  source: RequestSource;
  requestStatus: RequestStatus;
  visitStatus: VisitStatus;
  visitorType: VisitorType;
  expectedDate: string;
  expectedTime: string;
  purpose?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVisitRequestInput {
  visitor: Visitor;
  resident: Resident;
  society: Society;
  flat: Flat;
  source: RequestSource;
  visitorType: VisitorType;
  expectedDate: string;
  expectedTime: string;
  purpose?: string;
  vehicleNumber?: string;
  photoUrl?: string;
}

export interface RegisteredVisitor {
  id: string;
  name: string;
  mobile: string;
  visitorType: VisitorType;
  flat: Flat;
  photo?: string;
  active: boolean;
  lastVisit?: string;
}

export type AnnouncementType =
  | "GENERAL_NOTICE"
  | "EVENT"
  | "FESTIVAL"
  | "IMPORTANT_NOTICE"
  | "MAINTENANCE"
  | "SECURITY_ALERT"
  | "DELIVERY"
  | "OTHER";

export type AnnouncementAudience =
  | "ALL_MEMBERS"
  | "RESIDENTS"
  | "SECURITY"
  | "PUBLIC";

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  societyId?: number;
  createdByUserId?: number;
  createdByName?: string;
  eventDate?: string;
  eventTime?: string;
  purpose?: string;
  imageUrl?: string;
  expiresAt?: string;
  active: boolean;
  pinned: boolean;
  read?: boolean;
  readAt?: string;
  dismissedAt?: string;
  readCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  eventDate?: string;
  eventTime?: string;
  purpose?: string;
  imageUrl?: string;
  expiresAt?: string;
  active?: boolean;
  pinned?: boolean;
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  type?: AnnouncementType;
  audience?: AnnouncementAudience;
  eventDate?: string;
  eventTime?: string;
  purpose?: string;
  imageUrl?: string;
  expiresAt?: string;
  active?: boolean;
  pinned?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: "REQUEST" | "APPROVAL" | "ENTRY" | "EXIT" | "SYSTEM" | string;
  timestamp: string;
  read: boolean;
  requestId?: string;
  category?: "ANNOUNCEMENT" | "WORKFLOW";
  audience?: AnnouncementAudience;
  eventDate?: string;
  eventTime?: string;
  purpose?: string;
  imageUrl?: string;
  pinned?: boolean;
}

export interface UnifiedNotification {
  id: string;
  title: string;
  message: string;
  category: "ANNOUNCEMENT" | "WORKFLOW";
  type: string;
  audience?: AnnouncementAudience;
  eventDate?: string;
  eventTime?: string;
  purpose?: string;
  imageUrl?: string;
  read: boolean;
  readAt?: string;
  pinned: boolean;
  createdAt: string;
  visitRequestId?: number;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  detail: string;
}

export interface DashboardSummary {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "orange" | "green" | "slate";
}

export type AuthorizationType = "PERMANENT" | "TEMPORARY_TODAY" | "CUSTOM_EXPIRY";
export type AuthorizationStatus = "ACTIVE" | "DISABLED" | "EXPIRED" | "REVOKED";

export interface VisitorAuthorization {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorMobile: string;
  visitorType: VisitorType;
  vehicleNumber?: string;
  photoUrl?: string;
  societyId: string;
  societyName: string;
  buildingName?: string;
  flatId: string;
  flatNumber: string;
  residentId: string;
  residentName: string;
  authorizationType: AuthorizationType;
  status: AuthorizationStatus;
  validFrom: string;
  validUntil?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface PublicResidentItem {
  id: number;
  fullName: string;
  username: string;
}

export interface PublicFlatItem {
  id: number;
  number: string;
  residents: PublicResidentItem[];
}

export interface PublicFloorItem {
  id: number;
  floorNumber: number;
  flats: PublicFlatItem[];
}

export interface PublicBuildingItem {
  id: number;
  name: string;
  floors: PublicFloorItem[];
}

export interface PublicSocietyItem {
  id: number;
  name: string;
  address?: string;
  buildings: PublicBuildingItem[];
}

export interface PublicStructureResponse {
  societies: PublicSocietyItem[];
}

export interface PublicVisitRequestInput {
  fullName: string;
  mobileNumber: string;
  purpose: string;
  visitorType?: VisitorType;
  vehicleNumber?: string;
  photoUrl?: string;
  societyId: number;
  buildingId?: number;
  floorId?: number;
  flatId: number;
  residentId: number;
  expectedDate?: string;
  expectedTime?: string;
}

export interface PublicSociety {
  id: number;
  name: string;
  address?: string;
}

export interface EligibleRecipient {
  id: number;
  fullName: string;
  role: "ADMIN" | "RESIDENT";
  designation?: string;
  buildingId?: number;
  buildingName?: string;
  floorId?: number;
  floorNumber?: number;
  flatId?: number;
  flatNumber?: string;
}

export interface OnlineVisitInput {
  societyId: number;
  recipientId: number;
  fullName: string;
  mobileNumber: string;
  email?: string;
  visitorType?: VisitorType;
  purpose: string;
  expectedDate?: string;
  expectedTime?: string;
  numberOfVisitors?: number;
  vehicleNumber?: string;
  photoUrl?: string;
  notes?: string;
}

export type OnboardingStatus =
  | "ONBOARDING_REQUIRED"
  | "SUBMITTED"
  | "UNDER_ADMIN_REVIEW"
  | "CHANGES_REQUESTED"
  | "ALLOCATED"
  | "REJECTED"
  | "CANCELLED";

export interface ResidentOnboardingRequest {
  id?: number;
  userId: number;
  username: string;
  userFullName: string;
  userEmail?: string;
  userMobile?: string;
  societyId?: number;
  societyName?: string;
  fullName: string;
  residentType: "OWNER" | "TENANT" | "FAMILY_MEMBER";
  flatTypePreference?: string;
  familyMemberCount: number;
  preferredBuildingId?: number;
  preferredBuildingName?: string;
  preferredFlatNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicleNumber?: string;
  status: OnboardingStatus;
  adminNotes?: string;
  allocatedFlatId?: number;
  allocatedFlatNumber?: string;
  allocatedFloorId?: number;
  allocatedFloorNumber?: number;
  allocatedBuildingId?: number;
  allocatedBuildingName?: string;
  confirmedFlatType?: string;
  maintenanceInfo?: string;
  parkingStatus?: string;
  allocatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResidentOnboardingSubmitInput {
  societyId?: number;
  fullName: string;
  residentType: "OWNER" | "TENANT" | "FAMILY_MEMBER";
  flatTypePreference?: string;
  familyMemberCount?: number;
  preferredBuildingId?: number;
  preferredFlatNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicleNumber?: string;
}

export interface FlatAllocationInput {
  flatId: number;
  confirmedFlatType?: string;
  maintenanceInfo?: string;
  parkingStatus?: string;
  notes?: string;
}

export interface FlatAvailability {
  flatId: number;
  flatNumber: string;
  floorId: number;
  floorNumber: number;
  buildingId: number;
  buildingName: string;
  isOccupied: boolean;
  occupiedByResidentName?: string;
  status: string;
}