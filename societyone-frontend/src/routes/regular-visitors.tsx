import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import {
  authService,
  residentService,
  visitorAuthorizationService,
} from "@/services";
import { requireRole } from "@/lib/auth/require-auth";
import type {
  AuthorizationStatus,
  AuthorizationType,
  User,
  VisitorAuthorization,
  VisitorType,
} from "@/types/domain";

export const Route = createFileRoute("/regular-visitors")({
  beforeLoad: () => requireRole(["RESIDENT", "ADMIN"]),
  head: () => ({
    meta: [
      { title: "Regular Visitors | SocietyOne" },
      { name: "description", content: "Manage recurring visitor authorizations." },
    ],
  }),
  component: RegularVisitorsPage,
});

function RegularVisitorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorizations, setAuthorizations] = useState<VisitorAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add regular modal/form
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("DOMESTIC_WORKER");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [authorizationType, setAuthorizationType] = useState<AuthorizationType>("PERMANENT");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [residentFlatId, setResidentFlatId] = useState<string>("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [currentUser, items] = await Promise.all([
        authService.getCurrentUser(),
        visitorAuthorizationService.list(),
      ]);
      setUser(currentUser);
      setAuthorizations(items);

      if (currentUser.role === "RESIDENT") {
        const profile = await residentService.getMe().catch(() => null);
        if (profile) setResidentFlatId(String(profile.flatId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regular visitors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleToggleStatus(auth: VisitorAuthorization) {
    const nextStatus: AuthorizationStatus = auth.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setBusyId(auth.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await visitorAuthorizationService.updateStatus(auth.id, nextStatus);
      setAuthorizations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSuccess(
        nextStatus === "ACTIVE"
          ? `Restored authorization for ${auth.visitorName}`
          : `Paused authorization for ${auth.visitorName}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update authorization status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(auth: VisitorAuthorization) {
    if (!confirm(`Are you sure you want to remove ${auth.visitorName} from your authorized visitors?`)) {
      return;
    }
    setBusyId(auth.id);
    setError(null);
    setSuccess(null);
    try {
      await visitorAuthorizationService.delete(auth.id);
      setAuthorizations((prev) => prev.filter((a) => a.id !== auth.id));
      setSuccess(`Removed authorization for ${auth.visitorName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove authorization.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!residentFlatId) {
      setError("Your account does not have a linked flat. Please link your flat first.");
      return;
    }
    if (!fullName.trim() || !mobileNumber.trim()) {
      setError("Visitor name and mobile number are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await visitorAuthorizationService.create({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        visitorType,
        vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
        flatId: residentFlatId,
        authorizationType,
        validUntil: authorizationType === "CUSTOM_EXPIRY" ? validUntil : undefined,
        notes: notes.trim() || undefined,
      });

      setAuthorizations((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setSuccess(`Authorized ${created.visitorName} (${created.visitorType.replace("_", " ").toLowerCase()})`);
      setShowAddModal(false);
      setFullName("");
      setMobileNumber("");
      setVehicleNumber("");
      setNotes("");
      setAuthorizationType("PERMANENT");
      setValidUntil("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visitor authorization.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Regular visitors" eyebrow="Regular">
      <PageIntro
        eyebrow="Regular visitors"
        title="Trusted regular visitors"
        description="Domestic workers, drivers, milk delivery, and technicians who visit regularly. Gate security verifies them against your active authorization."
        action={
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-brand-blue hover:bg-brand-blue/90"
          >
            <PlusCircle className="mr-1.5 size-4" /> Add regular visitor
          </Button>
        }
      />

      {error && (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Add Regular Visitor Modal */}
      {showAddModal && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-display text-lg font-bold">Authorize a regular visitor</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>
          <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rv-name">Visitor Full Name</Label>
                <Input
                  id="rv-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Raj (Milk Provider) or Sunita (Maid)"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rv-mobile">Mobile Number</Label>
                <Input
                  id="rv-mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rv-type">Service / Visitor Category</Label>
                <select
                  id="rv-type"
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DOMESTIC_WORKER">Domestic Worker / Maid</option>
                  <option value="DRIVER">Driver</option>
                  <option value="TECHNICIAN">Technician / Maintenance</option>
                  <option value="VENDOR_CONTRACTOR">Vendor / Contractor</option>
                  <option value="DELIVERY">Milk / Newspaper / Regular Delivery</option>
                  <option value="OTHER">Other Regular Service</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rv-auth-type">Authorization Validity</Label>
                <select
                  id="rv-auth-type"
                  value={authorizationType}
                  onChange={(e) => setAuthorizationType(e.target.value as AuthorizationType)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PERMANENT">Recurring (Active Daily)</option>
                  <option value="TEMPORARY_TODAY">Temporary (Today Only)</option>
                  <option value="CUSTOM_EXPIRY">Custom Expiry Date</option>
                </select>
              </div>
            </div>

            {authorizationType === "CUSTOM_EXPIRY" && (
              <div>
                <Label htmlFor="rv-valid-until">Valid Until Date</Label>
                <Input
                  id="rv-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="rv-notes">Notes / Pass Details (Optional)</Label>
              <Input
                id="rv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Morning 7:00 AM milk delivery, Cleaning 9 AM"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-brand-blue">
                {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}
                Authorize Regular Visitor
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Authorizations List */}
      <div className="mt-7">
        {loading ? (
          <LoadingState label="Loading regular visitors..." />
        ) : authorizations.length === 0 ? (
          <EmptyState
            title="No regular visitors authorized"
            description="Add recurring visitors like your maid, driver, or milk delivery person so gate security can verify them quickly."
          />
        ) : (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`${authorizations.length} regular visitor authorizations`} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-4">
              {authorizations.map((item) => {
                const isPaused = item.status === "DISABLED";
                const isExpired = !item.active && item.status !== "DISABLED";

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-background p-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-info-soft font-display font-bold text-brand-blue">
                            <UserRound className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{item.visitorName}</p>
                            <p className="text-xs text-muted-foreground">{item.visitorMobile}</p>
                          </div>
                        </div>
                        <div>
                          {item.active ? (
                            <Badge className="bg-success text-primary-foreground">
                              <CheckCircle2 className="mr-1 size-3" /> Active
                            </Badge>
                          ) : isPaused ? (
                            <Badge variant="secondary">
                              <XCircle className="mr-1 size-3" /> Paused
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive/40 text-destructive">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground capitalize">
                            {item.visitorType.replace("_", " ").toLowerCase()}
                          </span>
                          {" · "}Flat {item.flatNumber}
                        </p>
                        {item.authorizationType === "TEMPORARY_TODAY" ? (
                          <span className="inline-flex items-center gap-1 text-brand-orange font-medium">
                            <Clock className="size-3" /> Temporary Today
                          </span>
                        ) : item.validUntil ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Calendar className="size-3" /> Valid until {item.validUntil}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Daily Recurring</span>
                        )}
                        {item.notes && <p className="italic text-foreground/80 mt-1">"{item.notes}"</p>}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleToggleStatus(item)}
                        className="text-xs"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="mr-1 size-3.5 animate-spin" />
                        ) : item.status === "ACTIVE" ? (
                          <PauseCircle className="mr-1 size-3.5 text-amber-500" />
                        ) : (
                          <PlayCircle className="mr-1 size-3.5 text-emerald-500" />
                        )}
                        {item.status === "ACTIVE" ? "Pause Access" : "Restore Access"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Remove authorization"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}