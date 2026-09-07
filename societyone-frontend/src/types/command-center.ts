export interface SocietyHeaderInfo {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  totalBuildings: number;
  totalFloors: number;
}

export interface KpiMetrics {
  totalResidents: number;
  ownerCount: number;
  tenantCount: number;
  familyMemberCount: number;
  totalFlats: number;
  occupiedFlats: number;
  availableFlats: number;
  occupancyPercentage: number;
  todayVisitors: number;
  currentlyInside: number;
  waitingAtGate: number;
  checkedOutToday: number;
  pendingOnboardingRequests: number;
  pendingAllocations: number;
  pendingVisitorApprovals: number;
  activeSecurityStaff: number;
  activeAnnouncementsCount: number;
}

export interface ActionRequiredItem {
  id: string;
  type: "ONBOARDING" | "ALLOCATION" | "GATE_WAITING" | "VISITOR_APPROVAL" | string;
  title: string;
  description: string;
  count: number;
  severity: "CRITICAL" | "WARNING" | "INFO" | string;
  actionUrl: string;
  actionLabel: string;
}

export interface FlatItemSummary {
  flatId: number;
  flatNumber: string;
  isOccupied: boolean;
  occupiedBy?: string | null;
  residentType?: string | null;
  flatType?: string | null;
  parkingSlot?: string | null;
  status?: string | null;
}

export interface FloorOccupancySummary {
  floorId: number;
  floorNumber: number;
  totalFlats: number;
  occupiedFlats: number;
  availableFlats: number;
  flats: FlatItemSummary[];
}

export interface BuildingOccupancySummary {
  buildingId: number;
  buildingName: string;
  totalFlats: number;
  occupiedFlats: number;
  availableFlats: number;
  occupancyPercentage: number;
  floors: FloorOccupancySummary[];
}

export interface VisitorCategoryCount {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DailyVisitorTrend {
  date: string;
  dayLabel: string;
  totalVisits: number;
  checkedIn: number;
  checkedOut: number;
}

export interface BuildingVisitorCount {
  buildingId: number;
  buildingName: string;
  visitCount: number;
}

export interface RecentVisitItem {
  id: number;
  visitorName: string;
  visitorType: string;
  flatNumber: string;
  buildingName: string;
  visitStatus: string;
  expectedDate?: string;
  expectedTime?: string;
  purpose?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface VisitorAnalyticsSummary {
  totalVisitsInPeriod: number;
  categoryBreakdown: VisitorCategoryCount[];
  trend7Days: DailyVisitorTrend[];
  buildingBreakdown: BuildingVisitorCount[];
  recentVisits: RecentVisitItem[];
}

export interface BuildingResidentCount {
  buildingId: number;
  buildingName: string;
  residentCount: number;
  ownerCount: number;
  tenantCount: number;
}

export interface RecentResidentItem {
  residentId: number;
  residentName: string;
  residentType: string;
  flatNumber: string;
  buildingName: string;
  flatType?: string;
  parkingSlot?: string;
  allocatedAt: string;
}

export interface ResidentAnalyticsSummary {
  totalResidents: number;
  ownerCount: number;
  tenantCount: number;
  familyMemberCount: number;
  buildingBreakdown: BuildingResidentCount[];
  recentResidents: RecentResidentItem[];
}

export interface SecurityStaffItem {
  id: number;
  fullName: string;
  username: string;
  mobileNumber?: string;
  status: string;
}

export interface RecentGateActivityItem {
  requestId: number;
  visitorName: string;
  flatNumber: string;
  buildingName: string;
  eventType: "WAITING" | "CHECKED_IN" | "CHECKED_OUT" | string;
  timestamp: string;
}

export interface SecurityGateSummary {
  waitingAtGate: number;
  approvedWaiting: number;
  currentlyInside: number;
  checkedOutToday: number;
  regularVisitorsToday: number;
  activeGuards: SecurityStaffItem[];
  recentGateActivity: RecentGateActivityItem[];
}

export interface AnnouncementSummary {
  id: number;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  actionLabel: string;
  entityType: string;
  entityId?: number;
  details?: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface SocietyCommandCenterResponse {
  society: SocietyHeaderInfo;
  kpis: KpiMetrics;
  actionRequired: ActionRequiredItem[];
  occupancy: BuildingOccupancySummary[];
  visitorAnalytics: VisitorAnalyticsSummary;
  residentAnalytics: ResidentAnalyticsSummary;
  securityGate: SecurityGateSummary;
  upcomingAnnouncements: AnnouncementSummary[];
  recentActivity: RecentActivityItem[];
}
