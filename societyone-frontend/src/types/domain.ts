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
}

export interface Visitor extends User {
  role: "VISITOR";
  visitorType: VisitorType;
}

export interface VisitRequest {
  id: string;
  visitor: Visitor;
  resident: Resident;
  society: Society;
  flat: Flat;
  source: RequestSource;
  requestStatus: RequestStatus;
  visitStatus: VisitStatus;
  visitorType: VisitorType;
  expectedDate: string;
  expectedTime: string;
  purpose?: string;
  vehicleNumber?: string;
  createdAt: string;
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

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: "REQUEST" | "APPROVAL" | "ENTRY" | "EXIT" | "SYSTEM";
  timestamp: string;
  read: boolean;
  requestId?: string;
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
  societyId: string;
  societyName: string;
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
  societyId: number;
  buildingId?: number;
  floorId?: number;
  flatId: number;
  residentId: number;
  expectedDate?: string;
  expectedTime?: string;
}