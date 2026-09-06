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
import { authService, societyService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { DashboardSummary, Role, User, VisitRequest } from "@/types/domain";

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

      const [summary, items] = await Promise.all([
        societyService.getSummary(currentUser.role).catch(() => []),
        visitorService.listRequests().catch(() => []),
      ]);
      setStats(summary);
      setRequests(items);
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
  };

  const insideCount = requests.filter((r) => r.visitStatus === "CHECKED_IN").length;
  const waitingCount = requests.filter(
    (r) =>
      r.visitStatus === "WAITING_AT_GATE" ||
      r.requestStatus === "PENDING_RESIDENT" ||
      r.requestStatus === "PENDING_SECURITY",
  ).length;

  return (
    <AppShell title={titles[role].title} eyebrow={titles[role].eyebrow}>
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
            ) : role === "ADMIN" ? (
              <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
                <Link to="/admin/society">
                  <ShieldCheck /> Society structure
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
                    : role === "ADMIN"
                      ? [
                          ["Resident management", "/admin/residents"],
                          ["Security staff", "/admin/security-staff"],
                          ["Society structure", "/admin/society"],
                          ["Audit history", "/history"],
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