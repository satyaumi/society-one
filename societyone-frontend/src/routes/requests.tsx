import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  DoorOpen,
  Loader2,
  RefreshCw,
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
} from "@/components/societyone";
import { authService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Role, User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/requests")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Visitor requests | SocietyOne" },
      { name: "description", content: "Review and act on visitor requests." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | "PENDING" | "APPROVED" | "COMPLETED">("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [currentUser, items] = await Promise.all([
        authService.getCurrentUser(),
        visitorService.listRequests(),
      ]);
      setUser(currentUser);
      setRequests(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
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
      setSuccess("Request approved successfully.");
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
      setSuccess("Request denied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Are you sure you want to cancel this visit request?")) return;
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.cancelRequest(id);
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Request cancelled successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSecurityAccept(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.acceptBySecurity(id);
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Request accepted by security.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSecurityReject(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.rejectBySecurity(id);
      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("Request rejected by security.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    } finally {
      setBusyId(null);
    }
  }

  const role: Role = user?.role ?? "RESIDENT";
  const sectionTitle =
    role === "SECURITY"
      ? "Visitors needing attention"
      : role === "VISITOR"
        ? "Your visit requests"
        : "Requests for your flat";

  const filteredRequests = useMemo(() => {
    if (tab === "PENDING") {
      return requests.filter(
        (r) =>
          r.requestStatus === "PENDING_RESIDENT" ||
          r.requestStatus === "PENDING_SECURITY",
      );
    }
    if (tab === "APPROVED") {
      return requests.filter(
        (r) =>
          (r.requestStatus === "APPROVED_BY_RESIDENT" ||
            r.requestStatus === "ACCEPTED_BY_SECURITY") &&
          r.visitStatus !== "CHECKED_OUT" &&
          r.visitStatus !== "CANCELLED",
      );
    }
    if (tab === "COMPLETED") {
      return requests.filter(
        (r) =>
          r.visitStatus === "CHECKED_OUT" ||
          r.visitStatus === "CANCELLED" ||
          r.requestStatus === "CANCELLED" ||
          r.requestStatus === "DENIED_BY_RESIDENT" ||
          r.requestStatus === "REJECTED_BY_RESIDENT" ||
          r.requestStatus === "REJECTED_BY_SECURITY",
      );
    }
    return requests;
  }, [requests, tab]);

  return (
    <AppShell title="Visitor requests" eyebrow="Requests">
      <PageIntro
        eyebrow="Requests"
        title="Visitor requests"
        description={
          role === "VISITOR"
            ? "Track the status of your entry requests in real time."
            : "Review, approve, and manage access requests for your residential unit."
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
              <Link to="/invite">
                <DoorOpen /> {role === "VISITOR" ? "Request a visit" : "Invite visitor"}
              </Link>
            </Button>
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

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2 border-b border-border pb-3">
        {(["ALL", "PENDING", "APPROVED", "COMPLETED"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              tab === t
                ? "bg-brand-blue text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingState />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="No requests found"
            description={
              tab !== "ALL"
                ? `No requests under ${tab.toLowerCase()} filter.`
                : role === "VISITOR"
                  ? "Submit a visit request and track its progress here."
                  : "When a visitor arrives or requests entry, it will show up here."
            }
          />
        ) : (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading
              title={`${sectionTitle} (${filteredRequests.length})`}
              action={
                <Link
                  to="/history"
                  className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
                >
                  View history <ArrowRight className="size-4" />
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {filteredRequests.map((request) => {
                const canCancel =
                  request.requestStatus !== "CANCELLED" &&
                  request.visitStatus !== "CHECKED_IN" &&
                  request.visitStatus !== "CHECKED_OUT";

                return (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actions={
                      <div className="flex items-center gap-2">
                        {role === "RESIDENT" &&
                          request.requestStatus === "PENDING_RESIDENT" && (
                            <>
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
                            </>
                          )}

                        {role === "SECURITY" &&
                          (request.requestStatus === "APPROVED_BY_RESIDENT" ||
                            request.requestStatus === "PENDING_SECURITY") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                disabled={busyId === request.id}
                                onClick={() =>
                                  void handleSecurityReject(request.id)
                                }
                              >
                                {busyId === request.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <X className="mr-1 size-3.5" />
                                )}
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-brand-blue hover:bg-brand-blue/90"
                                disabled={busyId === request.id}
                                onClick={() =>
                                  void handleSecurityAccept(request.id)
                                }
                              >
                                {busyId === request.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="mr-1 size-3.5" />
                                )}
                                Accept
                              </Button>
                            </>
                          )}

                        {canCancel && (role === "RESIDENT" || role === "VISITOR" || role === "ADMIN") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive text-xs"
                            disabled={busyId === request.id}
                            onClick={() => void handleCancel(request.id)}
                          >
                            <Ban className="mr-1 size-3" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}