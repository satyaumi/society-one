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
  | "PENDING_SECURITY"
  | "ACCEPTED_BY_SECURITY"
  | "DENIED_BY_SECURITY"
  | "CANCELLED"
  | "EXPIRED";
export type VisitStatus =
  | "EXPECTED"
  | "WAITING_AT_GATE"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "NO_SHOW";

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  mobile?: string;
  role: Role;
  avatar?: string;
  flatId?: string;
  flatNumber?: string;
  lastLoginAt?: string;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  buildings: Building[];
}

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

export interface Floor {
  id: string;
  number: number;
  flats: Flat[];
}

export interface Flat {
  id: string;
  number: string;
  buildingId: string;
  floorId: string;
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