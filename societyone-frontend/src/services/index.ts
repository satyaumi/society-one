
import type {
  AuditEvent,
  DashboardSummary,
  Notification,
  Announcement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  RegisteredVisitor,
  Role,
  Society,
  Building,
  Floor,
  Flat,
  User,
  Visitor,
  CreateVisitRequestInput,
  VisitRequest,
  PublicStructureResponse,
  PublicVisitRequestInput,
  VisitorAuthorization,
  AuthorizationStatus,
  VisitorType,
  ResidentOnboardingRequest,
  ResidentOnboardingSubmitInput,
  FlatAllocationInput,
  FlatAvailability,
  EligibleRecipient,
  OnlineVisitInput,
  PublicSociety,
  SocietyCreationRequest,
  SocietyCreationSubmitInput,
  PlatformKPIs,
  PlatformSocietyDirectoryItem,
  AdminHandoverInput,
  ReviewActionInput,
} from "@/types/domain";
import type { SocietyCommandCenterResponse } from "@/types/command-center";

// -------- Auth module imports --------
import { apiFetch, ApiError } from "@/lib/auth/auth-api-client";
import { authStore } from "@/lib/auth/auth-store";
import { resolveErrorMessage } from "@/lib/auth/error-mapper";

// ---------- Auth request / response DTOs ----------
export type AuthMethod = "username_or_email" | "email" | "mobile" | "username";

export interface LoginInput {
  method: AuthMethod | string;
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
  verificationToken?: string;
}

export interface VerifyOtpInput {
  identifier: string;
  otp: string;
  rememberMe?: boolean;
  purpose?: string;
}

export interface ResendOtpInput {
  identifier: string;
  purpose?: string;
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
  confirmation?: string;
}

export interface AuthSession {
  id: string;
  current?: boolean;
  device?: string;
  lastActiveAt?: string;
  ip?: string;
}

export interface SetupStatus {
  available: boolean;
}

export interface SendOtpResult {
  devOtp?: string;
}

export interface AuthService {
  login(input: LoginInput): Promise<AuthResult>;
  signup(
    input: SignupInput,
  ): Promise<{ needsVerification: true; user: User } | AuthResult>;
  verifyOtp(
    input: VerifyOtpInput,
  ): Promise<AuthResult | { verified: true; verificationToken?: string; identifier?: string }>;
  sendOtp(input: ResendOtpInput): Promise<SendOtpResult>;
  resendOtp(input: ResendOtpInput): Promise<SendOtpResult>;
  forgotPassword(
    input: ForgotPasswordInput,
  ): Promise<{ identifier: string }>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  loginWithGoogle(): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  refreshCurrentUser(): Promise<User>;
  isAuthenticated(): Promise<boolean>;
  updateProfile(input: UpdateProfileInput): Promise<User>;
  changeEmail(
    input: ChangeEmailInput,
  ): Promise<User | { needsVerification: true }>;
  changeMobile(
    input: ChangeMobileInput,
  ): Promise<User | { needsVerification: true }>;
  changePassword(
    input: ChangePasswordInput,
  ): Promise<{ requiresReauth?: boolean }>;
  listSessions(): Promise<{
    available: boolean;
    sessions: AuthSession[];
  }>;
  revokeOtherSessions(): Promise<void>;
  deleteAccount(input: DeleteAccountInput): Promise<void>;
  uploadProfilePhoto(file: File): Promise<User>;
  deleteProfilePhoto(): Promise<User>;

  /**
   * First-admin bootstrap.
   *   - getSetupStatus() returns available:true only when ZERO admins exist in DB.
   *   - provisionFirstAdmin() creates the first ADMIN, issues a JWT, and auto logs in.
   *   After success, subsequent calls are rejected server-side with 403.
   */
  getSetupStatus(): Promise<SetupStatus>;
  provisionFirstAdmin(input: SignupInput): Promise<AuthResult>;
}

export interface VisitorService {
  listRequests(role?: Role): Promise<VisitRequest[]>;
  getRequest(id: string): Promise<VisitRequest | undefined>;
  createRequest(input: CreateVisitRequestInput): Promise<VisitRequest>;
  approveRequest(id: string): Promise<VisitRequest>;
  rejectRequest(id: string): Promise<VisitRequest>;
  acceptBySecurity(id: string): Promise<VisitRequest>;
  rejectBySecurity(id: string): Promise<VisitRequest>;
  checkIn(id: string): Promise<VisitRequest>;
  checkOut(id: string): Promise<VisitRequest>;
  cancelRequest(id: string): Promise<VisitRequest>;
  createPublicVisitRequest(input: PublicVisitRequestInput): Promise<VisitRequest>;
  getPublicVisitRequestStatus(id: string | number): Promise<VisitRequest>;
  getPublicStructure(): Promise<PublicStructureResponse>;
  listPublicSocieties(): Promise<PublicSociety[]>;
  listEligibleRecipients(societyId: number | string): Promise<EligibleRecipient[]>;
  createOnlineVisit(input: OnlineVisitInput): Promise<VisitRequest>;
  getOnlineVisitStatus(id: string | number): Promise<VisitRequest>;
  trackOnlineVisits(query: { requestId?: string | number; mobileNumber?: string; email?: string }): Promise<VisitRequest[]>;
  uploadVisitorPhoto(file: File): Promise<string>;
  uploadPublicVisitorPhoto(file: File): Promise<string>;
  lookupByMobile(mobile: string): Promise<Visitor | null>;
  updateVisitorPhoto(visitorId: string | number, photoUrl: string): Promise<void>;
}

export interface VisitorAuthorizationService {
  list(query?: string): Promise<VisitorAuthorization[]>;
  create(input: {
    visitorId?: string | number;
    fullName?: string;
    mobileNumber: string;
    visitorType?: VisitorType;
    vehicleNumber?: string;
    photoUrl?: string;
    flatId: string | number;
    residentId?: string | number;
    authorizationType?: string;
    validFrom?: string;
    validUntil?: string;
    notes?: string;
  }): Promise<VisitorAuthorization>;
  updateStatus(id: string | number, status: AuthorizationStatus): Promise<VisitorAuthorization>;
  delete(id: string | number): Promise<void>;
  checkIn(id: string | number): Promise<VisitRequest>;
}

export interface SocietyInput {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface BuildingInput {
  name: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface FloorInput {
  number: number;
  status?: "ACTIVE" | "INACTIVE";
}

export interface FlatInput {
  number: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface SocietyService {
  getSociety(): Promise<Society | null>;
  listSocieties(): Promise<Society[]>;
  createSociety(input: SocietyInput): Promise<Society>;
  updateSociety(id: string, input: SocietyInput): Promise<Society>;
  createBuilding(
    societyId: string,
    input: BuildingInput,
  ): Promise<Building>;
  updateBuilding(
    id: string,
    input: BuildingInput,
  ): Promise<Building>;
  createFloor(
    buildingId: string,
    input: FloorInput,
  ): Promise<Floor>;
  updateFloor(
    id: string,
    input: FloorInput,
  ): Promise<Floor>;
  createFlat(
    floorId: string,
    input: FlatInput,
  ): Promise<Flat>;
  updateFlat(
    id: string,
    input: FlatInput,
  ): Promise<Flat>;
  getSummary(role: Role): Promise<DashboardSummary[]>;
}

// ============================================================
// Resident Management
// ============================================================

export type ResidentType =
  | "OWNER"
  | "TENANT"
  | "FAMILY_MEMBER";

export type ResidentStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface ResidentCreateInput {
  userId: string;
  flatId: string;
  residentType: ResidentType;
}

export interface Resident {
  id: string;
  userId: string;
  username?: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;

  flatId: string;
  flatNumber: string;

  floorId: string;
  floorNumber: number;

  buildingId: string;
  buildingName: string;

  societyId: string;
  societyName: string;

  residentType: ResidentType;
  status: ResidentStatus;

  createdAt: string;
}

export interface ResidentProvisionInput {
  username: string;
  fullName: string;
  email?: string;
  mobileNumber: string;
  password: string;
  flatId: string;
  residentType: ResidentType;
}

export interface UnassignedResident {
  userId: number | string;
  username: string;
  fullName: string;
  email?: string;
  mobileNumber?: string;
  createdAt: string;
}

export interface ResidentService {
  createResident(
    input: ResidentCreateInput,
  ): Promise<Resident>;

  provisionResident(
    input: ResidentProvisionInput,
  ): Promise<Resident>;

  getResident(
    id: string,
  ): Promise<Resident>;

  listByFlat(
    flatId: string,
  ): Promise<Resident[]>;

  updateStatus(
    id: string,
    status: ResidentStatus,
  ): Promise<Resident>;

  getMe(): Promise<Resident>;

  list(): Promise<Resident[]>;

  listUnassigned(): Promise<UnassignedResident[]>;

  selfLinkFlat(
    flatId: string,
    residentType: ResidentType,
  ): Promise<Resident>;

  submitOnboarding(input: ResidentOnboardingSubmitInput): Promise<ResidentOnboardingRequest>;
  getMyOnboardingStatus(): Promise<ResidentOnboardingRequest>;
  listOnboardingRequests(): Promise<ResidentOnboardingRequest[]>;
  getOnboardingRequest(id: string | number): Promise<ResidentOnboardingRequest>;
  allocateFlat(id: string | number, input: FlatAllocationInput): Promise<ResidentOnboardingRequest>;
  requestChanges(id: string | number, notes: string): Promise<ResidentOnboardingRequest>;
  rejectOnboarding(id: string | number, reason: string): Promise<ResidentOnboardingRequest>;
  getFlatsAvailability(buildingId?: string | number): Promise<FlatAvailability[]>;

  listRegisteredVisitors(): Promise<RegisteredVisitor[]>;
}
// ============================================================
// Security Staff Management
// ============================================================

export type SecurityStaffStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface SecurityStaffCreateInput {
  username: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
}

export interface SecurityStaff {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  societyId: string;
  societyName: string;
  status: SecurityStaffStatus;
  createdAt: string;
}

export interface SecurityStaffService {
  list(): Promise<SecurityStaff[]>;

  get(id: string): Promise<SecurityStaff>;

  create(
    input: SecurityStaffCreateInput,
  ): Promise<SecurityStaff>;

  updateStatus(
    id: string,
    status: SecurityStaffStatus,
  ): Promise<SecurityStaff>;
}



export interface NotificationService {
  list(role?: Role): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;

  listDashboardAnnouncements(): Promise<Announcement[]>;
  listPublicAnnouncements(): Promise<Announcement[]>;
  listAdminAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement>;
  updateAnnouncement(id: number, input: UpdateAnnouncementInput): Promise<Announcement>;
  toggleActiveAnnouncement(id: number): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;
  dismissAnnouncement(id: number): Promise<void>;
}

export interface AuditService {
  list(): Promise<AuditEvent[]>;
}

function withReadableError<T>(p: Promise<T>): Promise<T> {
  return p.catch((err: unknown) => {
    if (err instanceof ApiError) {
      const pretty = resolveErrorMessage(
        err.status,
        err.code,
        err.message,
      );

      const rewritten = new ApiError(
        err.status,
        err.code,
        pretty,
      );

      rewritten.details = err.details;

      throw rewritten;
    }

    // Network error (no response at all)
    if (
      err instanceof Error &&
      (err.name === "TypeError" ||
        /Failed to fetch/.test(err.message))
    ) {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Could not connect to the server. Check your connection and try again.",
      );
    }

    throw err;
  });
}

export const authService: AuthService = {
  async login(input) {
    const res = await withReadableError(
      apiFetch<AuthResult>("/auth/login", {
        method: "POST",
        json: input,
      }),
    );

    authStore.setAuthenticated(res.user, res.token);

    return res;
  },

  async signup(input) {
    const res = await withReadableError(
      apiFetch<
        AuthResult | {
          needsVerification: true;
          user: User;
        }
      >("/auth/signup", {
        method: "POST",
        json: input,
      }),
    );

    if ("needsVerification" in res) {
      sessionStorage.setItem(
        "societyone.pendingVerification.v1",
        JSON.stringify(res.user),
      );

      return {
        needsVerification: true,
        user: res.user,
      };
    }

    authStore.setAuthenticated(res.user, res.token);

    return res;
  },

  async verifyOtp(input) {
    const res = await withReadableError(
      apiFetch<
        AuthResult | {
          verified: true;
          verificationToken?: string;
          identifier?: string;
        }
      >("/auth/verify-otp", {
        method: "POST",
        json: input,
      }),
    );

    if ("token" in res) {
      authStore.setAuthenticated(res.user, res.token);

      sessionStorage.removeItem(
        "societyone.pendingVerification.v1",
      );

      return res;
    }

    return res;
  },

  async sendOtp(input) {
    return await withReadableError(
      apiFetch<SendOtpResult>("/auth/send-otp", {
        method: "POST",
        json: input,
      }),
    );
  },

  async resendOtp(input) {
    return await withReadableError(
      apiFetch<SendOtpResult>("/auth/resend-otp", {
        method: "POST",
        json: input,
      }),
    );
  },

  async forgotPassword(input) {
    return await withReadableError(
      apiFetch<{ identifier: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          json: input,
        },
      ),
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
    const env =
      (import.meta as unknown as {
        env?: Record<string, string>;
      }).env ?? {};

    const endpoint =
      env["VITE_GOOGLE_AUTH_ENDPOINT"] ??
      "/api/auth/google";

    const width = 520;
    const height = 640;

    const left = Math.max(
      0,
      (window.innerWidth - width) / 2,
    );

    const top = Math.max(
      0,
      (window.innerHeight - height) / 2,
    );

    const popup = window.open(
      endpoint,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
    );

    return await new Promise<AuthResult>(
      (resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();

          reject(
            new ApiError(
              0,
              "GOOGLE_TIMEOUT",
              "Google sign-in timed out. Please try again.",
            ),
          );
        }, 120_000);

        const interval = window.setInterval(() => {
          if (popup?.closed) {
            cleanup();

            reject(
              new ApiError(
                0,
                "GOOGLE_CANCELLED",
                "Google sign-in was cancelled.",
              ),
            );
          }
        }, 500);

        const onMessage = (
          event: MessageEvent,
        ) => {
          const originOk =
            event.origin === window.location.origin;

          const sourceOk =
            event.source ===
            (popup as Window | null);

          if (!originOk && !sourceOk) return;

          const payload = event.data as {
            source?: string;
            token?: string;
            user?: User;
            error?: string;
          };

          if (
            payload?.source !==
            "societyone.google"
          ) {
            return;
          }

          cleanup();

          if (payload.error) {
            reject(
              new ApiError(
                401,
                "GOOGLE_FAILED",
                payload.error,
              ),
            );

            return;
          }

          if (payload.token && payload.user) {
            authStore.setAuthenticated(
              payload.user,
              payload.token,
            );

            resolve({
              token: payload.token,
              user: payload.user,
            });
          } else {
            reject(
              new ApiError(
                500,
                "GOOGLE_NO_TOKEN",
                "Google sign-in did not return credentials.",
              ),
            );
          }
        };

        const cleanup = () => {
          window.clearTimeout(timeout);
          window.clearInterval(interval);
          window.removeEventListener(
            "message",
            onMessage,
          );

          try {
            popup?.close();
          } catch {
            // noop
          }
        };

        window.addEventListener(
          "message",
          onMessage,
        );
      },
    );
  },

  async logout() {
    authStore.clear();

    try {
      await apiFetch<void>("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Network/server unavailable â€” still treat logout as successful.
    }
  },

  async isAuthenticated() {
    const state = authStore.getState();

    if (state.isAuthenticated) {
      return true;
    }

    const getCurrentUser =
      authService.getCurrentUser.bind(
        authService,
      );

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
    const cached =
      authStore.getState().user;

    if (cached) {
      return cached;
    }

    return authService.refreshCurrentUser();
  },

  async refreshCurrentUser() {
    const user = await withReadableError(
      apiFetch<User>("/auth/me"),
    );

    authStore.setUser(user);

    return user;
  },

  async updateProfile(input) {
    const user = await withReadableError(
      apiFetch<User>("/auth/profile", {
        method: "PATCH",
        json: input,
      }),
    );

    authStore.setUser(user);

    return user;
  },

  async changeEmail(input) {
    const res = await withReadableError(
      apiFetch<
        User | {
          needsVerification: true;
        }
      >("/auth/change-email", {
        method: "POST",
        json: input,
      }),
    );

    if ("needsVerification" in res) {
      return res;
    }

    authStore.setUser(res);

    return res;
  },

  async changeMobile(input) {
    const res = await withReadableError(
      apiFetch<
        User | {
          needsVerification: true;
        }
      >("/auth/change-mobile", {
        method: "POST",
        json: input,
      }),
    );

    if ("needsVerification" in res) {
      return res;
    }

    authStore.setUser(res);

    return res;
  },

  async changePassword(input) {
    const res = await withReadableError(
      apiFetch<
        { requiresReauth?: boolean } | void
      >("/auth/change-password", {
        method: "POST",
        json: input,
      }),
    );

    return res ?? {};
  },

  async listSessions() {
    try {
      const sessions =
        await withReadableError(
          apiFetch<AuthSession[]>(
            "/auth/sessions",
          ),
        );

      return {
        available: true,
        sessions: sessions ?? [],
      };
    } catch (err) {
      const status =
        (err as { status?: number })
          ?.status ?? 0;

      if (status === 404) {
        return {
          available: false,
          sessions: [],
        };
      }

      throw err;
    }
  },

  async revokeOtherSessions() {
    await withReadableError(
      apiFetch<void>(
        "/auth/sessions/revoke-others",
        {
          method: "POST",
        },
      ),
    );
  },

  async deleteAccount(input) {
    await withReadableError(
      apiFetch<void>(
        "/auth/delete-account",
        {
          method: "POST",
          json: input,
        },
      ),
    );

    authStore.clear();
  },

  async uploadProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const user = await withReadableError(
      apiFetch<User>("/auth/profile-photo", {
        method: "POST",
        body: formData,
      }),
    );
    authStore.setUser(user);
    return user;
  },

  async deleteProfilePhoto() {
    const user = await withReadableError(
      apiFetch<User>("/auth/profile-photo", {
        method: "DELETE",
      }),
    );
    authStore.setUser(user);
    return user;
  },

  // ---------------- First-admin bootstrap ----------------

  async getSetupStatus() {
    return await withReadableError(
      apiFetch<SetupStatus>(
        "/auth/setup/status",
        {
          method: "GET",
        },
      ),
    );
  },

  async provisionFirstAdmin(input) {
    const res = await withReadableError(
      apiFetch<AuthResult>(
        "/auth/setup/first-admin",
        {
          method: "POST",
          json: input,
        },
      ),
    );

    authStore.setAuthenticated(
      res.user,
      res.token,
    );

    return res;
  },
};

export const visitorService: VisitorService = {
  async listRequests() {
    const rows = await withReadableError(
      apiFetch<BackendVisitRequest[]>("/visitors/requests"),
    );
    return rows.map(mapVisitRequest);
  },

  async getRequest(id) {
    try {
      const row = await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}`),
      );
      return mapVisitRequest(row);
    } catch {
      return undefined;
    }
  },

  async createRequest(input) {
    const createdVisitor = await withReadableError(
      apiFetch<BackendVisitor>("/visitors", {
        method: "POST",
        json: {
          fullName: input.visitor.name,
          mobileNumber: input.visitor.mobile,
          visitorType: input.visitorType,
          vehicleNumber: input.vehicleNumber,
          photoUrl: input.photoUrl ?? input.visitor.photoUrl,
        },
      }),
    );
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>("/visitors/requests", {
        method: "POST",
        json: {
          visitorId: Number(createdVisitor.id),
          societyId: Number(input.society.id),
          flatId: Number(input.flat.id),
          residentId: Number(input.resident.id),
          source: input.source,
          expectedDate: toIsoDate(input.expectedDate),
          expectedTime: toIsoTime(input.expectedTime),
          purpose: input.purpose,
          vehicleNumber: input.vehicleNumber,
          photoUrl: input.photoUrl ?? input.visitor.photoUrl,
        },
      }),
    );
    return mapVisitRequest(row);
  },

  async approveRequest(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/approve`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async rejectRequest(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/reject`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async acceptBySecurity(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/security/accept`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async rejectBySecurity(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/security/reject`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async checkIn(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/check-in`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async checkOut(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/check-out`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async cancelRequest(id) {
    return mapVisitRequest(
      await withReadableError(
        apiFetch<BackendVisitRequest>(`/visitors/requests/${id}/cancel`, {
          method: "PATCH",
        }),
      ),
    );
  },

  async createPublicVisitRequest(input) {
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>("/public/visit-requests", {
        method: "POST",
        json: input,
      }),
    );
    return mapVisitRequest(row);
  },

  async getPublicVisitRequestStatus(id) {
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>(`/public/visit-requests/${id}`),
    );
    return mapVisitRequest(row);
  },

  async getPublicStructure() {
    return await withReadableError(
      apiFetch<PublicStructureResponse>("/public/societies/structure"),
    );
  },

  async listPublicSocieties() {
    return await withReadableError(
      apiFetch<PublicSociety[]>("/public/societies"),
    );
  },

  async listEligibleRecipients(societyId) {
    return await withReadableError(
      apiFetch<EligibleRecipient[]>(`/public/societies/${societyId}/eligible-recipients`),
    );
  },

  async createOnlineVisit(input) {
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>("/public/online-visits", {
        method: "POST",
        json: input,
      }),
    );
    return mapVisitRequest(row);
  },

  async getOnlineVisitStatus(id) {
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>(`/public/online-visits/${id}`),
    );
    return mapVisitRequest(row);
  },

  async trackOnlineVisits(query) {
    const params = new URLSearchParams();
    if (query.requestId) params.set("requestId", String(query.requestId));
    if (query.mobileNumber) params.set("mobileNumber", query.mobileNumber);
    if (query.email) params.set("email", query.email);

    const rows = await withReadableError(
      apiFetch<BackendVisitRequest[]>(`/public/online-visits/track?${params.toString()}`),
    );
    return Array.isArray(rows) ? rows.map(mapVisitRequest) : [];
  },

  async uploadVisitorPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await withReadableError(
      apiFetch<{ photoUrl: string }>("/visitors/photo", {
        method: "POST",
        body: formData,
      }),
    );
    return resp.photoUrl;
  },

  async uploadPublicVisitorPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await withReadableError(
      apiFetch<{ photoUrl: string }>("/public/visitor-photo", {
        method: "POST",
        body: formData,
      }),
    );
    return resp.photoUrl;
  },

  async lookupByMobile(mobile: string): Promise<Visitor | null> {
    const resp = await withReadableError(
      apiFetch<any>(`/visitors/lookup?mobile=${encodeURIComponent(mobile)}`, {
        method: "GET",
      }),
    );
    if (!resp) return null;
    return {
      id: String(resp.id),
      name: resp.fullName,
      mobile: resp.mobileNumber,
      role: "VISITOR",
      visitorType: resp.visitorType,
      photoUrl: resp.photoUrl,
    };
  },

  async updateVisitorPhoto(visitorId: string | number, photoUrl: string): Promise<void> {
    await withReadableError(
      apiFetch(`/visitors/${visitorId}/photo`, {
        method: "PATCH",
        json: { photoUrl },
      }),
    );
  },
};

export const visitorAuthorizationService: VisitorAuthorizationService = {
  async list(query?: string) {
    const url = query ? `/visitor-authorizations?query=${encodeURIComponent(query)}` : "/visitor-authorizations";
    return await withReadableError(apiFetch<VisitorAuthorization[]>(url));
  },

  async create(input) {
    return await withReadableError(
      apiFetch<VisitorAuthorization>("/visitor-authorizations", {
        method: "POST",
        json: input,
      }),
    );
  },

  async updateStatus(id, status) {
    return await withReadableError(
      apiFetch<VisitorAuthorization>(`/visitor-authorizations/${id}/status?status=${encodeURIComponent(status)}`, {
        method: "PATCH",
      }),
    );
  },

  async delete(id) {
    await withReadableError(
      apiFetch<void>(`/visitor-authorizations/${id}`, {
        method: "DELETE",
      }),
    );
  },

  async checkIn(id) {
    const row = await withReadableError(
      apiFetch<BackendVisitRequest>(`/visitor-authorizations/${id}/check-in`, {
        method: "POST",
      }),
    );
    return mapVisitRequest(row);
  },
};

interface BackendVisitor {
  id: number | string;
  fullName: string;
  mobileNumber: string;
  visitorType: VisitRequest["visitorType"];
  photoUrl?: string;
}

interface BackendVisitRequest {
  id: number | string;
  visitorId: number | string;
  visitorName: string;
  visitorMobile: string;
  visitorType: VisitRequest["visitorType"];
  visitorPhotoUrl?: string;
  societyId: number | string;
  societyName: string;
  buildingName?: string;
  flatId: number | string;
  flatNumber: string;
  residentId: number | string;
  residentName: string;
  source: VisitRequest["source"];
  requestStatus: string;
  visitStatus: string;
  expectedDate?: string;
  expectedTime?: string;
  purpose?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

function mapRequestStatus(status: string): VisitRequest["requestStatus"] {
  if (status === "REJECTED_BY_RESIDENT") return "DENIED_BY_RESIDENT";
  if (status === "REJECTED_BY_SECURITY") return "DENIED_BY_SECURITY";
  return status as VisitRequest["requestStatus"];
}

function mapVisitStatus(status: string): VisitRequest["visitStatus"] {
  return status as VisitRequest["visitStatus"];
}

function mapVisitRequest(row: BackendVisitRequest): VisitRequest {
  const photo = row.visitorPhotoUrl || row.photoUrl;
  return {
    id: String(row.id),
    visitor: {
      id: String(row.visitorId),
      name: row.visitorName,
      mobile: row.visitorMobile,
      role: "VISITOR",
      visitorType: row.visitorType,
      photoUrl: photo,
    },
    resident: {
      id: String(row.residentId),
      name: row.residentName,
      role: "RESIDENT",
      flatId: row.flatId ? String(row.flatId) : "",
    },
    society: {
      id: String(row.societyId),
      name: row.societyName,
      address: "",
      buildings: [],
    },
    flat: row.flatId
      ? {
          id: String(row.flatId),
          number: row.flatNumber || "Office",
          buildingId: "",
          floorId: "",
          residentIds: [String(row.residentId)],
        }
      : undefined,
    buildingName: row.buildingName,
    source: row.source,
    requestStatus: mapRequestStatus(row.requestStatus),
    visitStatus: mapVisitStatus(row.visitStatus),
    visitorType: row.visitorType,
    expectedDate: row.expectedDate ?? "",
    expectedTime: row.expectedTime ?? "",
    purpose: row.purpose,
    vehicleNumber: row.vehicleNumber,
    photoUrl: photo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toIsoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toIsoTime(value: string) {
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 8);
  return null;
}

function countStructure(
  society: Society | null,
) {
  const buildings =
    society?.buildings.length ?? 0;

  const floors =
    society?.buildings.reduce(
      (acc, building) =>
        acc + building.floors.length,
      0,
    ) ?? 0;

  const flats =
    society?.buildings.reduce(
      (acc, building) =>
        acc +
        building.floors.reduce(
          (sum, floor) =>
            sum + floor.flats.length,
          0,
        ),
      0,
    ) ?? 0;

  const residents =
    society?.buildings.reduce(
      (acc, building) =>
        acc +
        building.floors.reduce(
          (sum, floor) =>
            sum +
            floor.flats.reduce(
              (n, item) =>
                n +
                item.residentIds.length,
              0,
            ),
          0,
        ),
      0,
    ) ?? 0;

  return {
    buildings,
    floors,
    flats,
    residents,
  };
}

export const societyService: SocietyService = {
  async listSocieties() {
    return await withReadableError(
      apiFetch<Society[]>(
        "/societies",
      ),
    );
  },

  async getSociety() {
    const societies =
      await societyService.listSocieties();

    return societies[0] ?? null;
  },

  async createSociety(input) {
    return await withReadableError(
      apiFetch<Society>(
        "/societies",
        {
          method: "POST",
          json: input,
        },
      ),
    );
  },

  async updateSociety(
    id,
    input,
  ) {
    return await withReadableError(
      apiFetch<Society>(
        `/societies/${id}`,
        {
          method: "PUT",
          json: input,
        },
      ),
    );
  },

  async createBuilding(
    societyId,
    input,
  ) {
    return await withReadableError(
      apiFetch<Building>(
        `/societies/${societyId}/buildings`,
        {
          method: "POST",
          json: input,
        },
      ),
    );
  },

  async updateBuilding(
    id,
    input,
  ) {
    return await withReadableError(
      apiFetch<Building>(
        `/buildings/${id}`,
        {
          method: "PUT",
          json: input,
        },
      ),
    );
  },

  async createFloor(
    buildingId,
    input,
  ) {
    return await withReadableError(
      apiFetch<Floor>(
        `/buildings/${buildingId}/floors`,
        {
          method: "POST",
          json: input,
        },
      ),
    );
  },

  async updateFloor(
    id,
    input,
  ) {
    return await withReadableError(
      apiFetch<Floor>(
        `/floors/${id}`,
        {
          method: "PUT",
          json: input,
        },
      ),
    );
  },

  async createFlat(
    floorId,
    input,
  ) {
    return await withReadableError(
      apiFetch<Flat>(
        `/floors/${floorId}/flats`,
        {
          method: "POST",
          json: input,
        },
      ),
    );
  },

  async updateFlat(
    id,
    input,
  ) {
    return await withReadableError(
      apiFetch<Flat>(
        `/flats/${id}`,
        {
          method: "PUT",
          json: input,
        },
      ),
    );
  },

  async getSummary(role) {
    try {
      const data = await withReadableError(
        apiFetch<{
          totalFlats?: number;
          activeResidents?: number;
          totalBuildings?: number;
          pendingResidentApprovals?: number;
          pendingSecurityApprovals?: number;
          currentlyCheckedIn?: number;
          waitingAtGate?: number;
          checkedOutToday?: number;
          pendingResidentRequests?: number;
          totalResidentRequests?: number;
          ownApprovedVisits?: number;
          ownCheckIns?: number;
        }>("/dashboard/summary"),
      );
      if (role === "SECURITY") {
        return [
          { label: "Waiting at gate", value: String(data.waitingAtGate ?? 0), helper: "Needs verification", tone: "blue" },
          { label: "Pending security", value: String(data.pendingSecurityApprovals ?? 0), helper: "Ready to accept", tone: "orange" },
          { label: "Visitors inside", value: String(data.currentlyCheckedIn ?? 0), helper: "Checked in now", tone: "green" },
          { label: "Exits today", value: String(data.checkedOutToday ?? 0), helper: "Checked out", tone: "slate" },
        ];
      }
      if (role === "ADMIN") {
        return [
          { label: "Total flats", value: String(data.totalFlats ?? 0), helper: "Society structure", tone: "blue" },
          { label: "Active residents", value: String(data.activeResidents ?? 0), helper: "Linked to flats", tone: "green" },
          { label: "Pending resident", value: String(data.pendingResidentApprovals ?? 0), helper: "Awaiting approval", tone: "orange" },
          { label: "At gate / inside", value: String((data.waitingAtGate ?? 0) + (data.currentlyCheckedIn ?? 0)), helper: `${data.totalBuildings ?? 0} buildings`, tone: "slate" },
        ];
      }
      return [
        { label: "Pending your review", value: String(data.pendingResidentRequests ?? data.pendingResidentApprovals ?? 0), helper: "Needs approval", tone: "orange" },
        { label: "Your visits", value: String(data.totalResidentRequests ?? 0), helper: "All requests", tone: "blue" },
        { label: "Approved", value: String(data.ownApprovedVisits ?? 0), helper: "Accepted visits", tone: "green" },
        { label: "Inside now", value: String(data.ownCheckIns ?? data.currentlyCheckedIn ?? 0), helper: "Checked in", tone: "slate" },
      ];
    } catch {
      return [
        { label: "Dashboard", value: "—", helper: "Could not load live stats", tone: "slate" },
        { label: "Pending", value: "0", helper: "Unavailable", tone: "orange" },
        { label: "Active", value: "0", helper: "Unavailable", tone: "green" },
        { label: "History", value: "0", helper: "Unavailable", tone: "blue" },
      ];
    }
  },
};

// ============================================================
// REAL Resident API
// ============================================================

export const residentService: ResidentService = {
  async createResident(input) {
    return await withReadableError(
      apiFetch<Resident>(
        `/residents?userId=${encodeURIComponent(
          input.userId,
        )}`,
        {
          method: "POST",
          json: {
            flatId: input.flatId,
            residentType:
              input.residentType,
          },
        },
      ),
    );
  },

  async getResident(id) {
    return await withReadableError(
      apiFetch<Resident>(
        `/residents/${id}`,
      ),
    );
  },

  async listByFlat(flatId) {
    return await withReadableError(
      apiFetch<Resident[]>(
        `/residents/flat/${flatId}`,
      ),
    );
  },

  async updateStatus(
    id,
    status,
  ) {
    return await withReadableError(
      apiFetch<Resident>(
        `/residents/${id}/status?status=${encodeURIComponent(
          status,
        )}`,
        {
          method: "PATCH",
        },
      ),
    );
  },

  async getMe() {
    return await withReadableError(
      apiFetch<Resident>("/residents/me"),
    );
  },

  async list() {
    return await withReadableError(
      apiFetch<Resident[]>("/residents"),
    );
  },

  async listUnassigned() {
    return await withReadableError(
      apiFetch<UnassignedResident[]>("/residents/unassigned"),
    );
  },

  async selfLinkFlat(flatId: string, residentType: ResidentType) {
    return await withReadableError(
      apiFetch<Resident>("/residents/me/link-flat", {
        method: "POST",
        json: {
          flatId: Number(flatId),
          residentType,
        },
      }),
    );
  },

  async provisionResident(input: ResidentProvisionInput) {
    return await withReadableError(
      apiFetch<Resident>("/residents/provision", {
        method: "POST",
        json: {
          username: input.username,
          fullName: input.fullName,
          email: input.email || null,
          mobileNumber: input.mobileNumber,
          password: input.password,
          flatId: Number(input.flatId),
          residentType: input.residentType,
        },
      }),
    );
  },

  async submitOnboarding(input: ResidentOnboardingSubmitInput) {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>("/residents/onboarding", {
        method: "POST",
        json: {
          societyId: input.societyId,
          fullName: input.fullName,
          residentType: input.residentType,
          flatTypePreference: input.flatTypePreference || null,
          familyMemberCount: input.familyMemberCount || 1,
          preferredBuildingId: input.preferredBuildingId ? Number(input.preferredBuildingId) : null,
          preferredFlatNumber: input.preferredFlatNumber || null,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone: input.emergencyContactPhone || null,
          vehicleNumber: input.vehicleNumber || null,
        },
      }),
    );
  },

  async getMyOnboardingStatus() {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>("/residents/onboarding/me"),
    );
  },

  async listOnboardingRequests() {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest[]>("/residents/onboarding/admin/requests"),
    );
  },

  async getOnboardingRequest(id: string | number) {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>(`/residents/onboarding/admin/requests/${id}`),
    );
  },

  async allocateFlat(id: string | number, input: FlatAllocationInput) {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>(`/residents/onboarding/admin/requests/${id}/allocate`, {
        method: "POST",
        json: {
          flatId: Number(input.flatId),
          confirmedFlatType: input.confirmedFlatType || null,
          maintenanceInfo: input.maintenanceInfo || null,
          parkingStatus: input.parkingStatus || null,
          notes: input.notes || null,
        },
      }),
    );
  },

  async requestChanges(id: string | number, notes: string) {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>(`/residents/onboarding/admin/requests/${id}/request-changes`, {
        method: "POST",
        json: { notes },
      }),
    );
  },

  async rejectOnboarding(id: string | number, reason: string) {
    return await withReadableError(
      apiFetch<ResidentOnboardingRequest>(`/residents/onboarding/admin/requests/${id}/reject`, {
        method: "POST",
        json: { notes: reason },
      }),
    );
  },

  async getFlatsAvailability(buildingId?: string | number) {
    const url = buildingId
      ? `/residents/flats/availability?buildingId=${encodeURIComponent(buildingId)}`
      : "/residents/flats/availability";
    return await withReadableError(
      apiFetch<FlatAvailability[]>(url),
    );
  },

  async listRegisteredVisitors() {
    try {
      const auths = await withReadableError(
        apiFetch<VisitorAuthorization[]>("/visitor-authorizations"),
      );
      return (auths || []).map((a) => ({
        id: String(a.id),
        name: a.visitorName,
        mobile: a.visitorMobile,
        visitorType: a.visitorType,
        flat: {
          id: String(a.flatId),
          number: a.flatNumber,
          buildingId: "",
          floorId: "",
          residentIds: [String(a.residentId)],
        },
        active: a.active,
        lastVisit: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "Recently",
      }));
    } catch {
      return [];
    }
  },
};

// ============================================================
// REAL Security Staff API
// ============================================================

export const securityStaffService: SecurityStaffService = {
  async list() {
    return await withReadableError(
      apiFetch<SecurityStaff[]>(
        "/security-staff",
      ),
    );
  },

  async get(id) {
    return await withReadableError(
      apiFetch<SecurityStaff>(
        `/security-staff/${id}`,
      ),
    );
  },

  async create(input) {
    return await withReadableError(
      apiFetch<SecurityStaff>(
        "/security-staff",
        {
          method: "POST",
          json: input,
        },
      ),
    );
  },

  async updateStatus(id, status) {
    return await withReadableError(
      apiFetch<SecurityStaff>(
        `/security-staff/${id}/status?status=${encodeURIComponent(status)}`,
        {
          method: "PATCH",
        },
      ),
    );
  },
};



export const notificationService: NotificationService = {
  async list() {
    const rows = await withReadableError(
      apiFetch<Array<{
        id: number | string;
        title: string;
        message: string;
        category?: "ANNOUNCEMENT" | "WORKFLOW";
        type: string;
        audience?: any;
        eventDate?: string;
        eventTime?: string;
        purpose?: string;
        imageUrl?: string;
        read: boolean;
        readAt?: string;
        pinned?: boolean;
        createdAt: string;
        visitRequestId?: number | string;
      }>>("/notifications"),
    );
    return rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      description: row.message,
      type: row.type,
      timestamp: row.createdAt,
      read: row.read,
      requestId: row.visitRequestId != null ? String(row.visitRequestId) : undefined,
      category: row.category,
      audience: row.audience,
      eventDate: row.eventDate,
      eventTime: row.eventTime,
      purpose: row.purpose,
      imageUrl: row.imageUrl,
      pinned: row.pinned,
    }));
  },

  async markRead(id) {
    await withReadableError(
      apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" }),
    );
    realtimeEvents.publish("notification:read", { id });
  },

  async markAllRead() {
    await withReadableError(
      apiFetch<void>("/notifications/read-all", { method: "PATCH" }),
    );
    realtimeEvents.publish("notification:all-read", {});
  },

  async listDashboardAnnouncements() {
    return withReadableError(
      apiFetch<Announcement[]>("/notifications/announcements"),
    );
  },

  async listPublicAnnouncements() {
    return withReadableError(
      apiFetch<Announcement[]>("/notifications/public"),
    );
  },

  async listAdminAnnouncements() {
    return withReadableError(
      apiFetch<Announcement[]>("/notifications/announcements/admin"),
    );
  },

  async createAnnouncement(input) {
    const res = await withReadableError(
      apiFetch<Announcement>("/notifications/announcements", {
        method: "POST",
        json: input,
      }),
    );
    realtimeEvents.publish("announcement:changed", res);
    return res;
  },

  async updateAnnouncement(id, input) {
    const res = await withReadableError(
      apiFetch<Announcement>(`/notifications/announcements/${id}`, {
        method: "PUT",
        json: input,
      }),
    );
    realtimeEvents.publish("announcement:changed", res);
    return res;
  },

  async toggleActiveAnnouncement(id) {
    const res = await withReadableError(
      apiFetch<Announcement>(`/notifications/announcements/${id}/toggle-active`, {
        method: "PATCH",
      }),
    );
    realtimeEvents.publish("announcement:changed", res);
    return res;
  },

  async deleteAnnouncement(id) {
    await withReadableError(
      apiFetch<void>(`/notifications/announcements/${id}`, {
        method: "DELETE",
      }),
    );
    realtimeEvents.publish("announcement:changed", { id, deleted: true });
  },

  async dismissAnnouncement(id) {
    await withReadableError(
      apiFetch<void>(`/notifications/announcements/${id}/dismiss`, {
        method: "PATCH",
      }),
    );
    realtimeEvents.publish("announcement:dismissed", { id });
  },
};

export const auditService: AuditService = {
  async list() {
    const rows = await withReadableError(
      apiFetch<Array<{
        id: number | string;
        action: string;
        actorUsername?: string;
        entityType?: string;
        description?: string;
        createdAt: string;
      }>>("/audit"),
    );
    return rows.map((row) => ({
      id: String(row.id),
      action: row.action,
      actor: row.actorUsername ?? "System",
      target: row.entityType ?? "",
      timestamp: row.createdAt,
      detail: row.description ?? "",
    }));
  },
};

type EventListener = (event: {
  type: string;
  payload: unknown;
}) => void;

const listeners =
  new Set<EventListener>();

export const realtimeEvents = {
  subscribe(
    listener: EventListener,
  ) {
    listeners.add(listener);

    return () =>
      listeners.delete(listener);
  },

  publish(
    type: string,
    payload: unknown,
  ) {
    listeners.forEach(
      (listener) =>
        listener({
          type,
          payload,
        }),
    );
  },
};

export interface PublicSummary {
  todayVisitorsCount: number;
  todayVisitsCount: number;
  todayActivitiesCount: number;
  totalSocietiesCount: number;
  activeSocietiesCount: number;
  societyName: string;
  primarySocietyName: string;
}

export interface PublicService {
  getSummary(): Promise<PublicSummary>;
}

export const publicService: PublicService = {
  async getSummary() {
    const raw = await withReadableError(
      apiFetch<Record<string, unknown>>("/public/summary"),
    );

    const todayVisitorsCount = Number(raw?.todayVisitorsCount ?? raw?.todayVisitsCount ?? 0);
    const todayActivitiesCount = Number(raw?.todayActivitiesCount ?? todayVisitorsCount);
    const totalSocietiesCount = Number(raw?.totalSocietiesCount ?? raw?.activeSocietiesCount ?? 1);
    const societyName = String(raw?.societyName || raw?.primarySocietyName || "Green Valley Residency");

    return {
      todayVisitorsCount,
      todayVisitsCount: todayVisitorsCount,
      todayActivitiesCount,
      totalSocietiesCount,
      activeSocietiesCount: totalSocietiesCount,
      societyName,
      primarySocietyName: societyName,
    };
  },
};

export interface DashboardService {
  getSocietyCommandCenter(params?: {
    buildingId?: number;
    timeRange?: string;
  }): Promise<SocietyCommandCenterResponse>;
}

export const dashboardService: DashboardService = {
  async getSocietyCommandCenter(params) {
    const query = new URLSearchParams();
    if (params?.buildingId) {
      query.set("buildingId", String(params.buildingId));
    }
    if (params?.timeRange) {
      query.set("timeRange", params.timeRange);
    }
    const queryString = query.toString();
    const path = `/dashboard/command-center${queryString ? `?${queryString}` : ""}`;
    return await withReadableError(apiFetch<SocietyCommandCenterResponse>(path));
  },
};

// =============================================================================
// Society Creation Request Service (Public & Platform Management)
// =============================================================================

export interface SocietyRequestService {
  submit(data: SocietyCreationSubmitInput, document?: File): Promise<SocietyCreationRequest>;
  resubmit(referenceCode: string, data: SocietyCreationSubmitInput, document?: File): Promise<SocietyCreationRequest>;
  track(query: string): Promise<SocietyCreationRequest[]>;
  list(status?: string): Promise<SocietyCreationRequest[]>;
  get(id: number): Promise<SocietyCreationRequest>;
  markUnderReview(id: number, notes?: string): Promise<SocietyCreationRequest>;
  requestChanges(id: number, notes: string): Promise<SocietyCreationRequest>;
  reject(id: number, reason: string): Promise<SocietyCreationRequest>;
  approveAndCreate(id: number, action?: ReviewActionInput): Promise<SocietyCreationRequest>;
  handoverAdmin(societyId: number, input: AdminHandoverInput): Promise<void>;
}

export const societyRequestService: SocietyRequestService = {
  async submit(data, document) {
    // Sanitize optional empty strings to avoid validation issues
    const sanitizedData: SocietyCreationSubmitInput = {
      ...data,
      societyOfficialEmail: data.societyOfficialEmail?.trim() || undefined,
      secondaryContactName: data.secondaryContactName?.trim() || undefined,
      secondaryContactPhone: data.secondaryContactPhone?.trim() || undefined,
      secondaryContactEmail: data.secondaryContactEmail?.trim() || undefined,
      registrationNumber: data.registrationNumber?.trim() || undefined,
    };

    if (document) {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(sanitizedData)], { type: "application/json" }),
      );
      formData.append("document", document);
      return await withReadableError(
        apiFetch<SocietyCreationRequest>("/public/society-requests", {
          method: "POST",
          body: formData,
        }),
      );
    }

    return await withReadableError(
      apiFetch<SocietyCreationRequest>("/public/society-requests", {
        method: "POST",
        json: sanitizedData,
      }),
    );
  },

  async resubmit(referenceCode, data, document) {
    const cleanRef = referenceCode.replace("#", "").trim().toUpperCase();
    const sanitizedData: SocietyCreationSubmitInput = {
      ...data,
      societyOfficialEmail: data.societyOfficialEmail?.trim() || undefined,
      secondaryContactName: data.secondaryContactName?.trim() || undefined,
      secondaryContactPhone: data.secondaryContactPhone?.trim() || undefined,
      secondaryContactEmail: data.secondaryContactEmail?.trim() || undefined,
      registrationNumber: data.registrationNumber?.trim() || undefined,
    };

    if (document) {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(sanitizedData)], { type: "application/json" }),
      );
      formData.append("document", document);
      return await withReadableError(
        apiFetch<SocietyCreationRequest>(`/public/society-requests/${encodeURIComponent(cleanRef)}`, {
          method: "PUT",
          body: formData,
        }),
      );
    }

    return await withReadableError(
      apiFetch<SocietyCreationRequest>(`/public/society-requests/${encodeURIComponent(cleanRef)}`, {
        method: "PUT",
        json: sanitizedData,
      }),
    );
  },

  async track(query) {
    const params = new URLSearchParams();
    params.set("query", query);
    return await withReadableError(
      apiFetch<SocietyCreationRequest[]>(
        `/public/society-requests/track?${params.toString()}`,
      ),
    );
  },

  async list(status) {
    const params = new URLSearchParams();
    if (status && status !== "ALL") {
      params.set("status", status);
    }
    const qs = params.toString();
    return await withReadableError(
      apiFetch<SocietyCreationRequest[]>(
        `/platform/society-requests${qs ? `?${qs}` : ""}`,
      ),
    );
  },

  async get(id) {
    return await withReadableError(
      apiFetch<SocietyCreationRequest>(`/platform/society-requests/${id}`),
    );
  },

  async markUnderReview(id, notes) {
    return await withReadableError(
      apiFetch<SocietyCreationRequest>(`/platform/society-requests/${id}/review`, {
        method: "POST",
        json: { notes },
      }),
    );
  },

  async requestChanges(id, notes) {
    return await withReadableError(
      apiFetch<SocietyCreationRequest>(
        `/platform/society-requests/${id}/request-changes`,
        {
          method: "POST",
          json: { notes },
        },
      ),
    );
  },

  async reject(id, reason) {
    return await withReadableError(
      apiFetch<SocietyCreationRequest>(`/platform/society-requests/${id}/reject`, {
        method: "POST",
        json: { reason },
      }),
    );
  },

  async approveAndCreate(id, action) {
    return await withReadableError(
      apiFetch<SocietyCreationRequest>(
        `/platform/society-requests/${id}/approve-and-create`,
        {
          method: "POST",
          json: action || {},
        },
      ),
    );
  },

  async handoverAdmin(societyId, input) {
    await withReadableError(
      apiFetch<void>(`/platform/societies/${societyId}/handover`, {
        method: "POST",
        json: input,
      }),
    );
  },
};

// =============================================================================
// Platform Management Service (Level 1 Platform Management)
// =============================================================================

export interface PlatformService {
  getKpis(): Promise<PlatformKPIs>;
  getSocieties(): Promise<PlatformSocietyDirectoryItem[]>;
  getAudit(limit?: number): Promise<AuditEvent[]>;
  sendMessageToAdmin(payload: {
    societyId: number;
    subject: string;
    message: string;
    category?: string;
    sendEmail?: boolean;
  }): Promise<void>;
  sendNotificationToUser(payload: {
    targetUserId: number;
    title: string;
    message: string;
  }): Promise<void>;
  dispatchCredentials(
    societyId: number,
    payload?: { newPassword?: string; notes?: string },
  ): Promise<{
    societyId: number;
    societyName: string;
    adminUserId: number;
    adminFullName: string;
    adminUsername: string;
    adminEmail: string;
    emailSent: boolean;
    message: string;
  }>;
}

export const platformService: PlatformService = {
  async getKpis() {
    return await withReadableError(
      apiFetch<PlatformKPIs>("/platform/dashboard/kpis"),
    );
  },

  async getSocieties() {
    return await withReadableError(
      apiFetch<PlatformSocietyDirectoryItem[]>("/platform/societies"),
    );
  },

  async getAudit(limit = 50) {
    return await withReadableError(
      apiFetch<AuditEvent[]>(`/platform/audit?limit=${limit}`),
    );
  },

  async sendMessageToAdmin(payload) {
    await withReadableError(
      apiFetch<void>("/platform/messages/send-to-admin", {
        method: "POST",
        json: payload,
      }),
    );
  },

  async sendNotificationToUser(payload) {
    await withReadableError(
      apiFetch<void>("/platform/notifications/send-to-user", {
        method: "POST",
        json: payload,
      }),
    );
  },

  async dispatchCredentials(societyId, payload) {
    return await withReadableError(
      apiFetch<{
        societyId: number;
        societyName: string;
        adminUserId: number;
        adminFullName: string;
        adminUsername: string;
        adminEmail: string;
        emailSent: boolean;
        message: string;
      }>(`/platform/societies/${societyId}/dispatch-credentials`, {
        method: "POST",
        json: payload || {},
      }),
    );
  },
};


