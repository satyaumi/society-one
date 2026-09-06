import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  DoorOpen,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
} from "@/components/societyone";
import { authService, visitorService } from "@/services";
import { requireRole } from "@/lib/auth/require-auth";
import type { User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/security/at-security")({
  beforeLoad: () => requireRole(["SECURITY", "ADMIN"]),
  head: () => ({
    meta: [
      { title: "At security | SocietyOne" },
      { name: "description", content: "Gate desk: check in walk-in visitors quickly." },
    ],
  }),
  component: SecurityAtDeskPage,
});

function SecurityAtDeskPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        err instanceof Error ? err.message : "Failed to load gate requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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

  async function handleCheckOut(id: string, visitorName: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorService.checkOut(id);
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setSuccess(`Visitor "${visitorName}" checked out successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check out visitor.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const filteredRequests = useMemo(() => {
    if (!query) return requests;
    return requests.filter((r) => {
      const name = r.visitor.name?.toLowerCase() || "";
      const flat = r.flat.number?.toLowerCase() || "";
      const vehicle = r.vehicleNumber?.toLowerCase() || "";
      const purpose = r.purpose?.toLowerCase() || "";
      return (
        name.includes(query) ||
        flat.includes(query) ||
        vehicle.includes(query) ||
        purpose.includes(query)
      );
    });
  }, [requests, query]);

  const atGate = filteredRequests.filter(
    (r) =>
      r.visitStatus !== "CHECKED_IN" &&
      r.visitStatus !== "CHECKED_OUT" &&
      r.visitStatus !== "CANCELLED" &&
      (r.visitStatus === "WAITING_AT_GATE" ||
        r.requestStatus === "APPROVED_BY_RESIDENT" ||
        r.requestStatus === "ACCEPTED_BY_SECURITY" ||
        r.requestStatus === "PENDING_SECURITY"),
  );
  const inside = filteredRequests.filter((r) => r.visitStatus === "CHECKED_IN");

  return (
    <AppShell title="At security desk" eyebrow="Security">
      <PageIntro
        eyebrow="Security · At gate"
        title="Gate desk"
        description="Verify arrivals, check in approved and waiting visitors, and record departures swiftly."
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
                <DoorOpen /> Register walk-in
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

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title="Find a visitor" />
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, flat number, vehicle, or purpose..."
                className="pl-9"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                <DoorOpen className="size-4 text-brand-blue" />
                <span>Ready to enter: <strong>{atGate.length}</strong></span>
              </Label>
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                <Search className="size-4 text-brand-blue" />
                <span>Inside society: <strong>{inside.length}</strong></span>
              </Label>
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                <LogOut className="size-4 text-brand-blue" />
                <span>Total active: <strong>{atGate.length + inside.length}</strong></span>
              </Label>
            </div>
          </div>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`Waiting at gate / Approved (${atGate.length})`} />
            {loading ? (
              <LoadingState />
            ) : atGate.length === 0 ? (
              <EmptyState
                title="No visitors waiting"
                description={
                  search
                    ? "No arrivals match your search."
                    : "When a visitor or delivery arrives at the gate, check them in here."
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {atGate.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actions={
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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
        </div>

        <div className="space-y-5">
          <ComingSoon
            title="Photo capture & OTP"
            description="A future release will capture visitor photos at the gate camera and send residents real-time entry notification alerts."
          />
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`Currently inside (${inside.length})`} />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading visitors inside...</p>
            ) : inside.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No inside visitors match your search."
                  : "No visitors currently inside the premises."}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {inside.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actions={
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-foreground hover:bg-muted"
                        disabled={busyId === request.id}
                        onClick={() =>
                          void handleCheckOut(request.id, request.visitor.name)
                        }
                      >
                        {busyId === request.id ? (
                          <Loader2 className="mr-1.5 size-4 animate-spin" />
                        ) : (
                          <LogOut className="mr-1.5 size-4" />
                        )}
                        Check out
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}