import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  IdCard,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  UserPlus,
  UserRound,
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
import { VisitorPhotoUpload } from "@/components/VisitorPhotoUpload";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  authService,
  visitorAuthorizationService,
  visitorService,
} from "@/services";
import { requireRole } from "@/lib/auth/require-auth";
import type {
  AuthorizationStatus,
  AuthorizationType,
  PublicStructureResponse,
  User,
  VisitorAuthorization,
  VisitorType,
} from "@/types/domain";

export const Route = createFileRoute("/security/regular")({
  beforeLoad: () => requireRole(["SECURITY", "ADMIN"]),
  head: () => ({
    meta: [
      { title: "Regular Visitors | Gate Security" },
      { name: "description", content: "Gate desk: verify and check in regular recurring visitors." },
    ],
  }),
  component: SecurityRegularPage,
});

function SecurityRegularPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorizations, setAuthorizations] = useState<VisitorAuthorization[]>([]);
  const [structure, setStructure] = useState<PublicStructureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Authorization Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetVisitorId, setTargetVisitorId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("DOMESTIC_WORKER");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [authorizationType, setAuthorizationType] = useState<AuthorizationType>("PERMANENT");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [existingPhotoReused, setExistingPhotoReused] = useState(false);
  const [lookingUpMobile, setLookingUpMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [currentUser, items, struct] = await Promise.all([
        authService.getCurrentUser(),
        visitorAuthorizationService.list(),
        visitorService.getPublicStructure().catch(() => null),
      ]);
      setUser(currentUser);
      setAuthorizations(items);
      setStructure(struct);

      if (struct && struct.societies.length > 0) {
        const flats = struct.societies[0].buildings.flatMap((b) => b.floors.flatMap((fl) => fl.flats));
        if (flats.length > 0 && !selectedFlatId) {
          setSelectedFlatId(String(flats[0].id));
          if (flats[0].residents.length > 0) {
            setSelectedResidentId(String(flats[0].residents[0].id));
          }
        }
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

  const allFlats = useMemo(() => {
    if (!structure || structure.societies.length === 0) return [];
    return structure.societies[0].buildings.flatMap((b) => b.floors.flatMap((fl) => fl.flats));
  }, [structure]);

  const selectedFlat = useMemo(() => {
    return allFlats.find((f) => String(f.id) === selectedFlatId) || allFlats[0] || null;
  }, [allFlats, selectedFlatId]);

  // Group authorizations by visitor (so Raj has multiple flats listed under him)
  const groupedVisitors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<
      string,
      {
        visitorId: string;
        visitorName: string;
        visitorMobile: string;
        visitorType: VisitorType;
        vehicleNumber?: string;
        photoUrl?: string;
        authorizations: VisitorAuthorization[];
      }
    >();

    for (const auth of authorizations) {
      const vKey = auth.visitorMobile || auth.visitorId;
      if (!map.has(vKey)) {
        map.set(vKey, {
          visitorId: auth.visitorId,
          visitorName: auth.visitorName,
          visitorMobile: auth.visitorMobile,
          visitorType: auth.visitorType,
          vehicleNumber: auth.vehicleNumber,
          photoUrl: auth.photoUrl,
          authorizations: [],
        });
      } else {
        const existing = map.get(vKey)!;
        if (!existing.photoUrl && auth.photoUrl) {
          existing.photoUrl = auth.photoUrl;
        }
      }
      map.get(vKey)!.authorizations.push(auth);
    }

    const list = Array.from(map.values());
    if (!q) return list;

    return list.filter(
      (v) =>
        v.visitorName.toLowerCase().includes(q) ||
        v.visitorMobile.includes(q) ||
        v.authorizations.some(
          (a) =>
            a.flatNumber.toLowerCase().includes(q) ||
            a.residentName.toLowerCase().includes(q) ||
            (a.notes && a.notes.toLowerCase().includes(q)),
        ),
    );
  }, [authorizations, search]);

  async function handleCheckIn(auth: VisitorAuthorization) {
    if (!auth.active) {
      setError(`Cannot check in: authorization is ${auth.status} or expired.`);
      return;
    }

    setBusyId(auth.id);
    setError(null);
    setSuccess(null);
    try {
      await visitorAuthorizationService.checkIn(auth.id);
      setSuccess(`Checked in ${auth.visitorName} for Flat ${auth.flatNumber}! Entry logged.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in regular visitor.");
    } finally {
      setBusyId(null);
    }
  }

  function openAddForVisitor(v: {
    visitorId: string;
    visitorName: string;
    visitorMobile: string;
    visitorType: VisitorType;
    photoUrl?: string;
  }) {
    setTargetVisitorId(v.visitorId);
    setFullName(v.visitorName);
    setMobileNumber(v.visitorMobile);
    setVisitorType(v.visitorType);
    setPhotoUrl(v.photoUrl || "");
    setExistingPhotoReused(Boolean(v.photoUrl));
    setShowAddModal(true);
  }

  async function handleMobileBlur() {
    const cleanMobile = mobileNumber.trim();
    if (cleanMobile.length >= 10 && !targetVisitorId) {
      try {
        setLookingUpMobile(true);
        const existing = await visitorService.lookupByMobile(cleanMobile);
        if (existing) {
          if (!fullName) setFullName(existing.name);
          if (existing.visitorType) setVisitorType(existing.visitorType);
          if (existing.photoUrl) {
            setPhotoUrl(existing.photoUrl);
            setExistingPhotoReused(true);
          }
        }
      } catch {
        // Silently ignore lookup errors
      } finally {
        setLookingUpMobile(false);
      }
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlatId) {
      setError("Please select a flat.");
      return;
    }

    if (!targetVisitorId && !photoUrl.trim()) {
      setError("Visitor photo is required for first-time regular visitor registration.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await visitorAuthorizationService.create({
        visitorId: targetVisitorId ? Number(targetVisitorId) : undefined,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        visitorType,
        vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
        photoUrl: photoUrl.trim() || undefined,
        flatId: selectedFlatId,
        residentId: selectedResidentId ? Number(selectedResidentId) : undefined,
        authorizationType,
        validUntil: authorizationType === "CUSTOM_EXPIRY" ? validUntil : undefined,
        notes: notes.trim() || undefined,
      });

      setAuthorizations((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setSuccess(`Authorization added for ${created.visitorName} → Flat ${created.flatNumber}!`);
      setShowAddModal(false);
      setTargetVisitorId(null);
      setFullName("");
      setMobileNumber("");
      setVehicleNumber("");
      setPhotoUrl("");
      setExistingPhotoReused(false);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add authorization.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Regular visitors" eyebrow="Security">
      <PageIntro
        eyebrow="Gate Security · Regulars"
        title="Regular & recurring visitors"
        description="Daily milk delivery, maids, drivers, and service staff. Verify identity and check in for authorized flats without creating duplicate records."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button
              onClick={() => {
                setTargetVisitorId(null);
                setFullName("");
                setMobileNumber("");
                setPhotoUrl("");
                setExistingPhotoReused(false);
                setShowAddModal(true);
              }}
              className="bg-brand-blue hover:bg-brand-blue/90"
            >
              <UserPlus className="mr-1.5 size-4" /> Register new regular
            </Button>
          </div>
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

      {/* Add / Extend Authorization Modal */}
      {showAddModal && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-display text-lg font-bold">
                {targetVisitorId ? `Add Flat Authorization for ${fullName}` : "Register Regular Visitor"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {targetVisitorId
                  ? "Reuses existing visitor record and adds authorization for another resident/flat."
                  : "Registers a regular worker with their first authorized flat."}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sec-name">Full Name</Label>
                <Input
                  id="sec-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Raj (Milk Delivery)"
                  disabled={Boolean(targetVisitorId)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sec-mobile">Mobile Number</Label>
                <div className="relative">
                  <Input
                    id="sec-mobile"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    onBlur={() => void handleMobileBlur()}
                    placeholder="10-digit mobile number"
                    disabled={Boolean(targetVisitorId)}
                    required
                    className="mt-1"
                  />
                  {lookingUpMobile && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="size-4 animate-spin text-brand-blue" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reusable Photo Upload Component */}
            <div className="pt-1">
              <VisitorPhotoUpload
                photoUrl={photoUrl}
                onPhotoChange={(url) => {
                  setPhotoUrl(url || "");
                  setExistingPhotoReused(false);
                }}
                required={!targetVisitorId && !existingPhotoReused}
                existingPhotoReused={existingPhotoReused}
                helperText={
                  existingPhotoReused
                    ? "Existing photo found on file and will be reused for this authorization."
                    : "Mandatory for first-time regular visitor registration. Reused for all future visits."
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sec-cat">Category / Purpose</Label>
                <select
                  id="sec-cat"
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                  disabled={Boolean(targetVisitorId)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DOMESTIC_WORKER">Domestic Worker / Maid</option>
                  <option value="DRIVER">Driver</option>
                  <option value="TECHNICIAN">Technician / Maintenance</option>
                  <option value="VENDOR_CONTRACTOR">Vendor / Contractor</option>
                  <option value="DELIVERY">Milk / Newspaper Provider</option>
                  <option value="OTHER">Other Regular Visitor</option>
                </select>
              </div>

              <div>
                <Label htmlFor="sec-auth-type">Authorization Type</Label>
                <select
                  id="sec-auth-type"
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
                <Label htmlFor="sec-valid-until">Valid Until Date</Label>
                <Input
                  id="sec-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* Target Flat & Resident Selection */}
            <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-background p-4">
              <div>
                <Label className="text-xs">Authorized Flat</Label>
                <select
                  value={selectedFlatId}
                  onChange={(e) => {
                    setSelectedFlatId(e.target.value);
                    const f = allFlats.find((fl) => String(fl.id) === e.target.value);
                    if (f?.residents?.[0]) setSelectedResidentId(String(f.residents[0].id));
                  }}
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
                  {allFlats.map((f) => (
                    <option key={f.id} value={f.id}>
                      Flat {f.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Resident Assigned</Label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                >
                  {selectedFlat?.residents.length === 0 ? (
                    <option value="">No resident assigned</option>
                  ) : (
                    selectedFlat?.residents.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="sec-notes">Pass Details / Notes (Optional)</Label>
              <Input
                id="sec-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Daily morning milk delivery, AC technician"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-brand-blue">
                {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}
                Save Authorization
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="mt-7">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search regular visitors by name, mobile, flat number, or resident..."
            className="pl-9 h-11"
          />
        </div>
      </div>

      {/* Visitors & Flat Authorizations Display */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading regular visitors..." />
        ) : groupedVisitors.length === 0 ? (
          <EmptyState
            title="No regular visitors found"
            description={
              search
                ? "No recurring visitor matches your search."
                : "No regular visitors registered yet. Click 'Register new regular' to add the first one."
            }
            icon={<IdCard />}
          />
        ) : (
          <div className="space-y-5">
            {groupedVisitors.map((v) => (
              <div
                key={v.visitorId}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all"
              >
                {/* Visitor Header with Prominent Photo for Identity Verification */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-border bg-info-soft shadow-sm">
                      {v.photoUrl ? (
                        <img
                          src={resolveMediaUrl(v.photoUrl)}
                          alt={v.visitorName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center font-display text-2xl font-bold text-brand-blue">
                          {v.visitorName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-foreground">{v.visitorName}</h3>
                        <Badge variant="outline" className="capitalize text-xs">
                          {v.visitorType.replace("_", " ").toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mobile: <strong className="text-foreground">{v.visitorMobile}</strong>
                        {v.vehicleNumber && ` · Vehicle: ${v.vehicleNumber}`}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddForVisitor(v)}
                    className="border-brand-blue/30 text-brand-blue hover:bg-info-soft self-start sm:self-auto"
                  >
                    <PlusCircle className="mr-1.5 size-3.5" /> Add Another Flat Authorization
                  </Button>
                </div>

                {/* Flat Authorizations List */}
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Authorized Flats ({v.authorizations.length})
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {v.authorizations.map((auth) => (
                      <div
                        key={auth.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between ${
                          auth.active
                            ? "border-border bg-background"
                            : "border-destructive/30 bg-destructive/5 opacity-80"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-base font-bold">
                              Flat {auth.flatNumber}
                            </span>
                            {auth.active ? (
                              <Badge className="bg-success text-primary-foreground text-xs">
                                <BadgeCheck className="mr-1 size-3" /> Active
                              </Badge>
                            ) : auth.status === "DISABLED" ? (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="mr-1 size-3" /> Paused
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-destructive/40 text-destructive text-xs">
                                Expired
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Resident: <strong className="text-foreground">{auth.residentName}</strong>
                          </p>

                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {auth.authorizationType === "TEMPORARY_TODAY" ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-brand-orange">
                                <Clock className="size-3" /> Temporary Today
                              </span>
                            ) : auth.validUntil ? (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="size-3" /> Valid until {auth.validUntil}
                              </span>
                            ) : (
                              <span>Daily Recurring Authorization</span>
                            )}
                            {auth.notes && <p className="italic text-foreground/80 mt-1">"{auth.notes}"</p>}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border">
                          {auth.active ? (
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              disabled={busyId === auth.id}
                              onClick={() => void handleCheckIn(auth)}
                            >
                              {busyId === auth.id ? (
                                <Loader2 className="mr-1.5 size-4 animate-spin" />
                              ) : (
                                <DoorOpen className="mr-1.5 size-4" />
                              )}
                              Check In for Flat {auth.flatNumber}
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-xs font-semibold text-destructive py-1.5 bg-destructive/10 rounded-lg">
                              <XCircle className="size-3.5" /> Access Disabled / Expired
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
