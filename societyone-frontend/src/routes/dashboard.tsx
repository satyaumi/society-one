import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  DoorOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
  StatGrid,
} from "@/components/societyone";
import { ApartmentAllocationCard } from "@/components/ApartmentAllocationCard";
import { ResidentOnboardingForm } from "@/components/ResidentOnboardingForm";
import { AnnouncementStrip } from "@/components/notifications/AnnouncementStrip";
import { SocietyCommandCenter } from "@/components/admin/SocietyCommandCenter";
import { authService, residentService, societyService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { DashboardSummary, ResidentOnboardingRequest, Role, User, VisitRequest } from "@/types/domain";
import { Clock, Edit3, Home, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Dashboard | SocietyOne" },
      { name: "description", content: "Role-aware SocietyOne visitor and security dashboard." },
      { property: "og:title", content: "Dashboard | SocietyOne" },
      { property: "og:description", content: "Role-aware SocietyOne visitor and security dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardSummary[]>([]);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [onboarding, setOnboarding] = useState<ResidentOnboardingRequest | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const [summary, items, onboardingStatus] = await Promise.all([
        societyService.getSummary(currentUser.role).catch(() => []),
        visitorService.listRequests().catch(() => []),
        currentUser.role === "RESIDENT"
          ? residentService.getMyOnboardingStatus().catch(() => null)
          : Promise.resolve(null),
      ]);
      setStats(summary);
      setRequests(items);
      setOnboarding(onboardingStatus);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.approveRequest(id);
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Visitor request approved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeny(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.rejectRequest(id);
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Visitor request denied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny request.");
    } finally {
      setBusyId(null);
    }
  }

  const role: Role = user?.role ?? "RESIDENT";
  const firstName = user?.name?.split(" ")[0];

  const titles: Record<Role, { title: string; intro: string; eyebrow: string }> = {
    RESIDENT: {
      title: firstName ? `Welcome, ${firstName}` : "Welcome back",
      intro: "Here is what is happening around your residence today.",
      eyebrow: "Resident dashboard",
    },
    VISITOR: {
      title: firstName ? `Welcome, ${firstName}` : "Welcome",
      intro: "Track your requests and upcoming entry permissions in real time.",
      eyebrow: "Visitor dashboard",
    },
    SECURITY: {
      title: "Gate Control Center",
      intro: "Monitor gate arrivals, approvals, and verify visitors smoothly.",
      eyebrow: "Security dashboard",
    },
    ADMIN: {
      title: "Society Operations Overview",
      intro: "Monitor residential units, personnel, and visitor activity.",
      eyebrow: "Admin dashboard",
    },
    PLATFORM_ADMIN: {
      title: "Platform Management Portal",
      intro: "Oversee societies, review onboarding requests, and manage platform governance.",
      eyebrow: "Platform Management",
    },
  };

  const insideCount = requests.filter((r) => r.visitStatus === "CHECKED_IN").length;
  const waitingCount = requests.filter(
    (r) =>
      r.visitStatus === "WAITING_AT_GATE" ||
      r.requestStatus === "PENDING_RESIDENT" ||
      r.requestStatus === "PENDING_SECURITY",
  ).length;

  if (role === "PLATFORM_ADMIN") {
    return (
      <AppShell title="Platform Management" eyebrow="Main Admin">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <h3 className="text-xl font-bold font-display">Redirecting to Platform Management...</h3>
          <p className="text-sm text-muted-foreground">
            You are logged in with Level 1 Platform Management privileges.
          </p>
          <Link to="/platform">
            <Button className="mt-2">Go to Platform Management Portal</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (role === "ADMIN") {
    return (
      <AppShell title="Society Command Center" eyebrow="Admin">
        <AnnouncementStrip />
        <div className="mt-4">
          <SocietyCommandCenter />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={titles[role].title} eyebrow={titles[role].eyebrow}>
      <AnnouncementStrip />
      <PageIntro
        eyebrow={titles[role].eyebrow}
        title={titles[role].title}
        description={titles[role].intro}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {role === "SECURITY" ? (
              <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
                <Link to="/security/at-security">
                  <DoorOpen /> Gate desk
                </Link>
              </Button>
            ) : (
              <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
                <Link to="/invite">
                  <UserPlus /> {role === "VISITOR" ? "Request a visit" : "Invite visitor"}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {loading ? (
        <div className="mt-7">
          <LoadingState label="Loading your dashboard..." />
        </div>
      ) : (
        <>
          {/* Resident Onboarding / Allocation Card / Banner */}
          {role === "RESIDENT" && onboarding && (
            <div className="mt-6">
              {onboarding.status === "ALLOCATED" ? (
                <ApartmentAllocationCard allocation={onboarding} />
              ) : onboarding.status === "CHANGES_REQUESTED" ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 shadow-sm dark:text-amber-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <ShieldAlert className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold">
                          Action Required — Please update your resident details
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Admin reviewed your application and requested the following corrections:
                        </p>
                        {onboarding.adminNotes && (
                          <div className="mt-2 rounded-lg border border-amber-500/20 bg-background/80 p-3 text-xs font-medium text-foreground">
                            "{onboarding.adminNotes}"
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowOnboardingModal(true)}
                      className="bg-amber-600 font-semibold text-white hover:bg-amber-700"
                      size="sm"
                    >
                      <Edit3 className="mr-1.5 size-3.5" />
                      Update Details
                    </Button>
                  </div>
                </div>
              ) : onboarding.status === "SUBMITTED" || onboarding.status === "UNDER_ADMIN_REVIEW" ? (
                <div className="rounded-2xl border border-brand-blue/30 bg-info-soft p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
                      <Clock className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          Your apartment allocation is under Admin review
                        </h3>
                        <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
                          {onboarding.status === "UNDER_ADMIN_REVIEW" ? "Under Review" : "Submitted"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Your resident details have been submitted. Society Admin is reviewing your information and will officially allocate your apartment/flat shortly.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground">
                        <span><strong>Name:</strong> {onboarding.fullName}</span>
                        <span><strong>Role:</strong> {onboarding.residentType}</span>
                        <span><strong>Family Count:</strong> {onboarding.familyMemberCount}</span>
                        {onboarding.preferredBuildingName && (
                          <span><strong>Pref. Building:</strong> {onboarding.preferredBuildingName}</span>
                        )}
                        {onboarding.preferredFlatNumber && (
                          <span><strong>Pref. Flat:</strong> {onboarding.preferredFlatNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-brand-blue/30 bg-card p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                        <Home className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-foreground">
                          Complete Your Resident Details
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Please complete your resident onboarding form so Admin can allocate your apartment/flat.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowOnboardingModal(true)}
                      className="bg-brand-blue font-semibold hover:bg-brand-blue/90"
                    >
                      Complete Onboarding
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onboarding Modal */}
          {showOnboardingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
                <ResidentOnboardingForm
                  initialData={onboarding}
                  defaultFullName={user?.name}
                  onSuccess={(updated) => {
                    setOnboarding(updated);
                    setShowOnboardingModal(false);
                    setSuccess("Resident onboarding submitted successfully! Admin will review your allocation.");
                  }}
                  onCancel={() => setShowOnboardingModal(false)}
                />
              </div>
            </div>
          )}

          <div className="mt-7">
            <StatGrid stats={stats} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeading
                title={
                  role === "SECURITY"
                    ? "Visitors needing attention"
                    : role === "VISITOR"
                      ? "Your latest requests"
                      : "Recent requests for your flat"
                }
                action={
                  <Link
                    to="/requests"
                    className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
                  >
                    View all <ArrowRight className="size-4" />
                  </Link>
                }
              />

              {requests.length === 0 ? (
                <EmptyState
                  title="No active requests"
                  description="When visits are scheduled or visitors arrive, they will appear here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {requests.slice(0, 4).map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      actions={
                        role === "RESIDENT" &&
                        request.requestStatus === "PENDING_RESIDENT" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              disabled={busyId === request.id}
                              onClick={() => void handleDeny(request.id)}
                            >
                              {busyId === request.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <X className="mr-1 size-3.5" />
                              )}
                              Deny
                            </Button>
                            <Button
                              size="sm"
                              className="bg-brand-blue hover:bg-brand-blue/90"
                              disabled={busyId === request.id}
                              onClick={() => void handleApprove(request.id)}
                            >
                              {busyId === request.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="mr-1 size-3.5" />
                              )}
                              Approve
                            </Button>
                          </div>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
              <div className="rounded-xl border border-brand-blue/20 bg-info-soft p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-blue">
                  Activity Pulse
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-foreground">
                  {insideCount > 0
                    ? `${insideCount} visitor${insideCount === 1 ? "" : "s"} currently inside`
                    : "Gate status normal"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {waitingCount > 0
                    ? `${waitingCount} visitor request${waitingCount === 1 ? "" : "s"} awaiting attention or check-in.`
                    : "No visitors currently waiting at the gate."}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-orange">
                  Quick Actions
                </p>
                <div className="mt-4 space-y-2">
                  {(role === "SECURITY"
                    ? [
                        ["Online visitors", "/security/online"],
                        ["At gate desk", "/security/at-security"],
                        ["Visitor history", "/history"],
                      ]
                    : [
                        [
                          role === "VISITOR"
                            ? "Request a visit"
                            : "Invite a visitor",
                          "/invite",
                        ],
                        ["View requests", "/requests"],
                        ["Visitor history", "/history"],
                        ["Settings", "/settings"],
                      ]
                  ).map(([label, to]) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center justify-between rounded-lg bg-secondary px-3.5 py-3 text-sm font-semibold hover:bg-accent transition-colors"
                    >
                      {label}
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}