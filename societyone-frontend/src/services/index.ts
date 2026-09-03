import type {
  AuditEvent,
  DashboardSummary,
  Notification,
  RegisteredVisitor,
  Role,
  Society,
  User,
  CreateVisitRequestInput,
  VisitRequest,
} from "@/types/domain";

// -------- Auth module imports --------
import { apiFetch, ApiError } from "@/lib/auth/auth-api-client";
import { authStore } from "@/lib/auth/auth-store";
import { resolveErrorMessage } from "@/lib/auth/error-mapper";

// ---------- Auth request / response DTOs ----------
// Shapes match the API contracts documented in your backend spec.
export type AuthMethod = "email" | "mobile";

export interface LoginInput {
  method: AuthMethod;
  identifier: string;
  password: string;
  // Intentionally NOT a role that backend trusts. Used by backend only for UX hints.
  intendedRole?: Role;
}

export interface SignupInput {
  fullName: string;
  username: string;
  email?: string;
  mobileNumber?: string;
  password: string;
  intendedRole?: Role;
}

export interface VerifyOtpInput {
  /** Identifier the OTP was sent to: email OR mobile number (full E.164) */
  identifier: string;
  otp: string;
  /** Signup verification = SIGNUP; forgot password = PASSWORD_RESET; login fallback = LOGIN */
  purpose?: "SIGNUP" | "PASSWORD_RESET" | "LOGIN";
}

export interface ResendOtpInput {
  identifier: string;
  purpose?: "SIGNUP" | "PASSWORD_RESET" | "LOGIN";
}

export interface ForgotPasswordInput {
  method: AuthMethod;
  identifier: string;
}

export interface ResetPasswordInput {
  identifier: string;
  otp: string;
  newPassword: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface UpdateProfileInput {
  fullName: string;
  username: string;
}

export interface ChangeEmailInput {
  newEmail: string;
  otp?: string;
}

export interface ChangeMobileInput {
  newMobileNumber: string;
  otp?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountInput {
  password: string;
  confirmation: string;
}

export interface AuthSession {
  id: string;
  current?: boolean;
  device?: string;
  lastActiveAt?: string;
  ip?: string;
}

export interface AuthService {
  login(input: LoginInput): Promise<AuthResult>;
  signup(input: SignupInput): Promise<{ needsVerification: true; user: User } | AuthResult>;
  verifyOtp(input: VerifyOtpInput): Promise<AuthResult | { verified: true }>;
  resendOtp(input: ResendOtpInput): Promise<void>;
  forgotPassword(input: ForgotPasswordInput): Promise<{ identifier: string }>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  loginWithGoogle(): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  refreshCurrentUser(): Promise<User>;
  isAuthenticated(): Promise<boolean>;
  updateProfile(input: UpdateProfileInput): Promise<User>;
  changeEmail(input: ChangeEmailInput): Promise<User | { needsVerification: true }>;
  changeMobile(input: ChangeMobileInput): Promise<User | { needsVerification: true }>;
  changePassword(input: ChangePasswordInput): Promise<{ requiresReauth?: boolean }>;
  listSessions(): Promise<{ available: boolean; sessions: AuthSession[] }>;
  revokeOtherSessions(): Promise<void>;
  deleteAccount(input: DeleteAccountInput): Promise<void>;
}

export interface VisitorService {
  listRequests(role: Role): Promise<VisitRequest[]>;
  getRequest(id: string): Promise<VisitRequest | undefined>;
  createRequest(input: CreateVisitRequestInput): Promise<VisitRequest>;
  updateRequestStatus(id: string, status: VisitRequest["requestStatus"]): Promise<VisitRequest | undefined>;
  updateVisitStatus(id: string, status: VisitRequest["visitStatus"]): Promise<VisitRequest | undefined>;
}

export interface SocietyService {
  getSociety(): Promise<Society>;
  getSummary(role: Role): Promise<DashboardSummary[]>;
}

export interface ResidentService {
  listRegisteredVisitors(): Promise<RegisteredVisitor[]>;
}

export interface NotificationService {
  list(role: Role): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
}

export interface AuditService {
  list(): Promise<AuditEvent[]>;
}

const society: Society = {
  id: "society-green-residency",
  name: "Green Residency",
  address: "24 Lakeview Road, Bengaluru 560038",
  buildings: [
    {
      id: "building-a",
      name: "Tower A",
      floors: [
        { id: "floor-2", number: 2, flats: [{ id: "flat-a203", number: "A-203", buildingId: "building-a", floorId: "floor-2", residentIds: ["resident-rajesh"] }] },
        { id: "floor-3", number: 3, flats: [{ id: "flat-a304", number: "A-304", buildingId: "building-a", floorId: "floor-3", residentIds: ["resident-anita"] }] },
      ],
    },
    { id: "building-b", name: "Tower B", floors: [{ id: "floor-b1", number: 1, flats: [{ id: "flat-b105", number: "B-105", buildingId: "building-b", floorId: "floor-b1", residentIds: ["resident-vikram"] }] }] },
  ],
};

const users: Record<Role, User> = {
  VISITOR: { id: "visitor-amit", name: "Amit Sharma", email: "amit@example.com", mobile: "+91 98765 43210", role: "VISITOR" },
  RESIDENT: { id: "resident-rajesh", name: "Rajesh Kumar", email: "rajesh@greenresidency.com", mobile: "+91 99887 77665", role: "RESIDENT" },
  SECURITY: { id: "security-meena", name: "Meena Das", email: "security@greenresidency.com", mobile: "+91 90000 11002", role: "SECURITY" },
  ADMIN: { id: "admin-neha", name: "Neha Menon", email: "admin@greenresidency.com", mobile: "+91 90000 22003", role: "ADMIN" },
};

const resident = { ...users.RESIDENT, role: "RESIDENT" as const, flatId: "flat-a203" };
const visitor = { ...users.VISITOR, role: "VISITOR" as const, visitorType: "GUEST" as const };
const flat = society.buildings[0]?.floors[0]?.flats[0];
if (!flat) throw new Error("Mock society must include a flat");

let requests: VisitRequest[] = [
  {
    id: "visit-amit-today",
    visitor,
    resident,
    society,
    flat,
    source: "VISITOR",
    requestStatus: "APPROVED_BY_RESIDENT",
    visitStatus: "WAITING_AT_GATE",
    visitorType: "GUEST",
    expectedDate: "Today",
    expectedTime: "10:30 AM",
    purpose: "Meeting with Rajesh",
    vehicleNumber: "KA01AB1234",
    createdAt: "12 min ago",
  },
  {
    id: "visit-delivery-041",
    visitor: { ...visitor, id: "visitor-rina", name: "Rina from FreshCart", visitorType: "DELIVERY" },
    resident,
    society,
    flat,
    source: "RESIDENT",
    requestStatus: "PENDING_SECURITY",
    visitStatus: "EXPECTED",
    visitorType: "DELIVERY",
    expectedDate: "Today",
    expectedTime: "12:15 PM",
    purpose: "Grocery delivery",
    createdAt: "1 hr ago",
  },
  {
    id: "visit-technician-039",
    visitor: { ...visitor, id: "visitor-suresh", name: "Suresh Electricals", visitorType: "TECHNICIAN" },
    resident,
    society,
    flat,
    source: "SECURITY",
    requestStatus: "PENDING_RESIDENT",
    visitStatus: "WAITING_AT_GATE",
    visitorType: "TECHNICIAN",
    expectedDate: "Today",
    expectedTime: "2:00 PM",
    purpose: "AC service",
    createdAt: "8 min ago",
  },
  {
    id: "visit-cook-032",
    visitor: { ...visitor, id: "visitor-lakshmi", name: "Lakshmi Reddy", visitorType: "DOMESTIC_WORKER" },
    resident,
    society,
    flat,
    source: "RESIDENT",
    requestStatus: "ACCEPTED_BY_SECURITY",
    visitStatus: "CHECKED_IN",
    visitorType: "DOMESTIC_WORKER",
    expectedDate: "Yesterday",
    expectedTime: "8:00 AM",
    purpose: "Daily cooking",
    createdAt: "Yesterday",
  },
];

const registeredVisitors: RegisteredVisitor[] = [
  { id: "reg-lakshmi", name: "Lakshmi Reddy", mobile: "+91 98989 12121", visitorType: "DOMESTIC_WORKER", flat, active: true, lastVisit: "Today, 8:00 AM" },
  { id: "reg-mohan", name: "Mohan Kumar", mobile: "+91 97777 34343", visitorType: "DRIVER", flat, active: true, lastVisit: "Yesterday, 7:20 AM" },
  { id: "reg-arun", name: "Arun Services", mobile: "+91 96666 45454", visitorType: "TECHNICIAN", flat, active: false, lastVisit: "12 Aug 2026" },
];

function withReadableError<T>(p: Promise<T>): Promise<T> {
  return p.catch((err: unknown) => {
    if (err instanceof ApiError) {
      const pretty = resolveErrorMessage(err.status, err.code, err.message);
      const rewritten = new ApiError(err.status, err.code, pretty);
      rewritten.details = err.details;
      throw rewritten;
    }
    // Network error (no response at all)
    if (err instanceof Error && (err.name === "TypeError" || /Failed to fetch/.test(err.message))) {
      throw new ApiError(0, "NETWORK_ERROR", "Could not connect to the server. Check your connection and try again.");
    }
    throw err;
  });
}
const notificationSeed: Notification[] = [
  { id: "notification-1", title: "Visitor request created", description: "Amit Sharma requested a visit to A-203.", type: "REQUEST", timestamp: "12 min ago", read: false, requestId: "visit-amit-today" },
  { id: "notification-2", title: "Visitor approved", description: "Your visit request was approved by Rajesh Kumar.", type: "APPROVAL", timestamp: "28 min ago", read: false, requestId: "visit-amit-today" },
  { id: "notification-3", title: "Visitor checked in", description: "Lakshmi Reddy entered Tower A.", type: "ENTRY", timestamp: "Yesterday", read: true, requestId: "visit-cook-032" },
  { id: "notification-4", title: "Visitor checked out", description: "Your visitor exited Green Residency.", type: "EXIT", timestamp: "Yesterday", read: true },
];
const auditEvents: AuditEvent[] = [
  { id: "audit-1", action: "Visitor checked in", actor: "Meena Das", target: "Lakshmi Reddy", timestamp: "Today, 8:02 AM", detail: "Regular visitor · A-203" },
  { id: "audit-2", action: "Request approved", actor: "Rajesh Kumar", target: "Amit Sharma", timestamp: "Today, 9:18 AM", detail: "Online request · A-203" },
  { id: "audit-3", action: "At Security request created", actor: "Meena Das", target: "Suresh Electricals", timestamp: "Today, 9:42 AM", detail: "Technician · awaiting resident" },
];

export const authService: AuthService = {
  async login(input) {
    const res = await withReadableError(
      apiFetch<AuthResult>("/auth/login", { method: "POST", json: input }),
    );
    authStore.setAuthenticated(res.user, res.token);
    return res;
  },

  async signup(input) {
    const res = await withReadableError(
      apiFetch<AuthResult | { needsVerification: true; user: User }>("/auth/signup", {
        method: "POST",
        json: input,
      }),
    );
    if ("needsVerification" in res) {
      // Backend says: go verify OTP before issuing a token.
      // Stash the unverified user in-memory only (no localStorage) so verify flow can show their name.
      sessionStorage.setItem("societyone.pendingVerification.v1", JSON.stringify(res.user));
      return { needsVerification: true, user: res.user };
    }
    authStore.setAuthenticated(res.user, res.token);
    return res;
  },

  async verifyOtp(input) {
    const res = await withReadableError(
      apiFetch<AuthResult | { verified: true }>("/auth/verify-otp", {
        method: "POST",
        json: input,
      }),
    );
    if ("token" in res) {
      authStore.setAuthenticated(res.user, res.token);
      sessionStorage.removeItem("societyone.pendingVerification.v1");
      return res;
    }
    return { verified: true as const };
  },

  async resendOtp(input) {
    await withReadableError(
      apiFetch<void>("/auth/resend-otp", { method: "POST", json: input }),
    );
  },

  async forgotPassword(input) {
    return await withReadableError(
      apiFetch<{ identifier: string }>("/auth/forgot-password", {
        method: "POST",
        json: input,
      }),
    );
  },

  async resetPassword(input) {
    await withReadableError(
      apiFetch<void>("/auth/reset-password", {
        method: "POST",
        json: input,
      }),
    );
  },

  async loginWithGoogle() {
    // Integration point. Replace with real popup/redirect OAuth backend flow.
    // n8n-compatible hook: set VITE_GOOGLE_AUTH_WEBHOOK=/api/auth/google (default).
    const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
    const endpoint = env["VITE_GOOGLE_AUTH_ENDPOINT"] ?? "/api/auth/google";

    // Step 1: Open backend endpoint in a popup window.
    const width = 520;
    const height = 640;
    const left = Math.max(0, (window.innerWidth - width) / 2);
    const top = Math.max(0, (window.innerHeight - height) / 2);
    const popup = window.open(
      endpoint,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
    );

    // Step 2: Wait for popup to postMessage us a { token, user }.
    // Backend callback page must run:
    //   window.opener.postMessage({ source:"societyone.google", token, user }, window.openerOrigin);
    return await new Promise<AuthResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new ApiError(0, "GOOGLE_TIMEOUT", "Google sign-in timed out. Please try again."));
      }, 120_000);
      const interval = window.setInterval(() => {
        if (popup?.closed) {
          cleanup();
          reject(new ApiError(0, "GOOGLE_CANCELLED", "Google sign-in was cancelled."));
        }
      }, 500);
      const onMessage = (event: MessageEvent) => {
        // SECURITY: Only trust messages from the popup we opened OR our own origin.
        // Prevents session hijack via a random iframe posting { source: 'societyone.google' }.
        const originOk = event.origin === window.location.origin;
        const sourceOk = event.source === (popup as Window | null);
        if (!originOk && !sourceOk) return;

        const payload = event.data as { source?: string; token?: string; user?: User; error?: string };
        if (payload?.source !== "societyone.google") return;
        cleanup();
        if (payload.error) {
          reject(new ApiError(401, "GOOGLE_FAILED", payload.error));
          return;
        }
        if (payload.token && payload.user) {
          authStore.setAuthenticated(payload.user, payload.token);
          resolve({ token: payload.token, user: payload.user });
        } else {
          reject(new ApiError(500, "GOOGLE_NO_TOKEN", "Google sign-in did not return credentials."));
        }
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        window.clearInterval(interval);
        window.removeEventListener("message", onMessage);
        try { popup?.close(); } catch { /* noop */ }
      };
      window.addEventListener("message", onMessage);
    });
  },

  async logout() {
    // Optimistic: clear local state FIRST so user cannot view any protected page.
    authStore.clear();
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Network/server unavailable — still treat logout as successful.
    }
  },

  async isAuthenticated() {
    const state = authStore.getState();
    if (state.isAuthenticated) return true;
    // Safely invoke getCurrentUser via bind() so 'this' is always the authService,
    // even when destructured or invoked through the AuthService interface.
    const getCurrentUser = authService.getCurrentUser.bind(authService);
    if (typeof window !== "undefined") {
      try {
        const me = await getCurrentUser();
        return !!me;
      } catch {
        return false;
      }
    }
    return false;
  },

  async getCurrentUser() {
    const cached = authStore.getState().user;
    if (cached) return cached;
    return authService.refreshCurrentUser();
  },

  async refreshCurrentUser() {
    const user = await withReadableError(apiFetch<User>("/auth/me"));
    authStore.setUser(user);
    return user;
  },

  async updateProfile(input) {
    const user = await withReadableError(apiFetch<User>("/auth/profile", { method: "PATCH", json: input }));
    authStore.setUser(user);
    return user;
  },

  async changeEmail(input) {
    const res = await withReadableError(
      apiFetch<User | { needsVerification: true }>("/auth/change-email", { method: "POST", json: input }),
    );
    if ("needsVerification" in res) return res;
    authStore.setUser(res);
    return res;
  },

  async changeMobile(input) {
    const res = await withReadableError(
      apiFetch<User | { needsVerification: true }>("/auth/change-mobile", { method: "POST", json: input }),
    );
    if ("needsVerification" in res) return res;
    authStore.setUser(res);
    return res;
  },

  async changePassword(input) {
    const res = await withReadableError(
      apiFetch<{ requiresReauth?: boolean } | void>("/auth/change-password", { method: "POST", json: input }),
    );
    return res ?? {};
  },

  async listSessions() {
    try {
      const sessions = await withReadableError(apiFetch<AuthSession[]>("/auth/sessions"));
      return { available: true, sessions: sessions ?? [] };
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 0;
      if (status === 404) return { available: false, sessions: [] };
      throw err;
    }
  },

  async revokeOtherSessions() {
    await withReadableError(apiFetch<void>("/auth/sessions/revoke-others", { method: "POST" }));
  },

  async deleteAccount(input) {
    await withReadableError(apiFetch<void>("/auth/delete-account", { method: "POST", json: input }));
    authStore.clear();
  },
};

export const visitorService: VisitorService = {
  async listRequests() { return requests; },
  async getRequest(id) { return requests.find((request) => request.id === id); },
  async createRequest(input) {
    const created: VisitRequest = { ...input, id: `visit-${Date.now()}`, requestStatus: "PENDING_RESIDENT", visitStatus: "EXPECTED", createdAt: "Just now" };
    requests = [created, ...requests];
    return created;
  },
  async updateRequestStatus(id, status) { requests = requests.map((request) => request.id === id ? { ...request, requestStatus: status } : request); return requests.find((request) => request.id === id); },
  async updateVisitStatus(id, status) { requests = requests.map((request) => request.id === id ? { ...request, visitStatus: status } : request); return requests.find((request) => request.id === id); },
};

export const societyService: SocietyService = {
  async getSociety() { return society; },
  async getSummary(role) {
    if (role === "SECURITY") return [
      { label: "Expected today", value: "18", helper: "4 arriving next", tone: "blue" },
      { label: "Waiting at gate", value: "03", helper: "Needs verification", tone: "orange" },
      { label: "Visitors inside", value: "07", helper: "Across 3 towers", tone: "green" },
      { label: "Exits today", value: "11", helper: "Last exit 12 min ago", tone: "slate" },
    ];
    if (role === "VISITOR") return [
      { label: "Upcoming visits", value: "02", helper: "Next at 10:30 AM", tone: "blue" },
      { label: "Pending requests", value: "01", helper: "Awaiting approval", tone: "orange" },
      { label: "Approved visits", value: "04", helper: "This month", tone: "green" },
      { label: "Visit history", value: "12", helper: "All time", tone: "slate" },
    ];
    if (role === "ADMIN") return [
      { label: "Total flats", value: "184", helper: "Across 3 towers", tone: "blue" },
      { label: "Active residents", value: "412", helper: "98% verified", tone: "green" },
      { label: "Visitors today", value: "18", helper: "6 online requests", tone: "orange" },
      { label: "Security users", value: "12", helper: "2 on duty now", tone: "slate" },
    ];
    return [
      { label: "Today’s visitors", value: "05", helper: "2 expected soon", tone: "blue" },
      { label: "Pending requests", value: "02", helper: "Needs your review", tone: "orange" },
      { label: "Active visits", value: "01", helper: "Currently inside", tone: "green" },
      { label: "Regular visitors", value: "03", helper: "2 active profiles", tone: "slate" },
    ];
  },
};

export const residentService: ResidentService = { async listRegisteredVisitors() { return registeredVisitors; } };
export const notificationService: NotificationService = {
  async list() { return notificationSeed; },
  async markRead(id) { const item = notificationSeed.find((notification) => notification.id === id); if (item) item.read = true; },
};
export const auditService: AuditService = { async list() { return auditEvents; } };

type EventListener = (event: { type: string; payload: unknown }) => void;
const listeners = new Set<EventListener>();
export const realtimeEvents = {
  subscribe(listener: EventListener) { listeners.add(listener); return () => listeners.delete(listener); },
  publish(type: string, payload: unknown) { listeners.forEach((listener) => listener({ type, payload })); },
};