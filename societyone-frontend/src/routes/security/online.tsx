import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
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
import { ViewAuthorizationModal } from "@/components/ViewAuthorizationModal";
import { authService, visitorService } from "@/services";
import { requireRole } from "@/lib/auth/require-auth";
import type { User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/security/online")({
  beforeLoad: () => requireRole(["SECURITY", "ADMIN"]),
  head: () => ({
    meta: [
      { title: "Online visitors | SocietyOne Security" },
      { name: "description", content: "Online visitor requests for security verification." },
    ],
  }),
  component: SecurityOnlinePage,
});

function SecurityOnlinePage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAuthRequest, setSelectedAuthRequest] = useState<VisitRequest | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
        err instanceof Error ? err.message : "Failed to load online requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleAccept(id: string, visitorName: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.acceptBySecurity(id);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSuccess(`Request for "${visitorName}" accepted.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept visitor request.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string, visitorName: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.rejectBySecurity(id);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSuccess(`Request for "${visitorName}" rejected.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject visitor request.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckIn(id: string, visitorName: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.checkIn(id);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSuccess(`Visitor "${visitorName}" checked in successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check in visitor.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const onlineApproved = requests.filter(
    (r) =>
      r.requestStatus === "APPROVED_BY_RESIDENT" &&
      r.visitStatus !== "CHECKED_IN" &&
      r.visitStatus !== "CHECKED_OUT",
  );

  const pendingSecurity = requests.filter(
    (r) =>
      r.requestStatus === "PENDING_SECURITY" &&
      r.visitStatus !== "CANCELLED",
  );

  return (
    <AppShell title="Online visitors" eyebrow="Security">
      <PageIntro
        eyebrow="Security · Online"
        title="Online visitor requests"
        description="Review incoming online requests. Approved visitors are cleared for gate check-in; pending items need security verification."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button asChild variant="outline">
              <Link to="/security/at-security">
                <ClipboardCheck /> At security desk
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

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading
            title={`Resident Approved (${onlineApproved.length})`}
            action={
              <Link
                to="/security/at-security"
                className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
              >
                Go to gate desk <ArrowRight className="size-4" />
              </Link>
            }
          />
          {loading ? (
            <LoadingState />
          ) : onlineApproved.length === 0 ? (
            <EmptyState
              title="No approved arrivals"
              description="Resident-approved requests will show up here when the expected date and time arrive."
            />
          ) : (
            <div className="divide-y divide-border">
              {onlineApproved.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  onViewAuthorization={(req) => {
                    setSelectedAuthRequest(req);
                    setShowAuthModal(true);
                  }}
                  actions={
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={busyId === request.id}
                      onClick={() =>
                        void handleCheckIn(request.id, request.visitor.name)
                      }
                    >
                      {busyId === request.id ? (
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <DoorOpen className="mr-1.5 size-4" />
                      )}
                      Check in
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading
            title={`Pending Security Review (${pendingSecurity.length})`}
          />
          {loading ? (
            <LoadingState />
          ) : pendingSecurity.length === 0 ? (
            <EmptyState
              title="Nothing pending"
              description="Requests created without instant online approval land here for a quick security verification."
            />
          ) : (
            <div className="divide-y divide-border">
              {pendingSecurity.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  actions={
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={busyId === request.id}
                        onClick={() =>
                          void handleReject(request.id, request.visitor.name)
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
                          void handleAccept(request.id, request.visitor.name)
                        }
                      >
                        {busyId === request.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1 size-3.5" />
                        )}
                        Accept
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ViewAuthorizationModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        request={selectedAuthRequest}
        onCheckIn={async (id) => {
          if (selectedAuthRequest) {
            await handleCheckIn(id, selectedAuthRequest.visitor.name);
          }
        }}
        isCheckingIn={busyId === selectedAuthRequest?.id}
      />
    </AppShell>
  );
}