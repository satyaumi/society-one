import { type FormEvent, useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Power,
  PowerOff,
  Search,
  Home,
  Building2,
  Clock,
  ShieldAlert,
  Check,
  X,
  ShieldCheck,
  Coins,
  MapPin,
  Edit3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  LoadingState,
  PageIntro,
} from "@/components/societyone";

import {
  residentService,
  societyService,
  type Resident,
  type ResidentProvisionInput,
  type ResidentStatus,
  type ResidentType,
  type UnassignedResident,
} from "@/services";
import type {
  FlatAvailability,
  ResidentOnboardingRequest,
  Society,
} from "@/types/domain";

import { requireAuth } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/admin/residents")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Resident Management | SocietyOne Admin" },
      {
        name: "description",
        content: "Manage and provision resident accounts for flats in your society.",
      },
    ],
  }),
  component: AdminResidentsPage,
});

function AdminResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [residentTypeFilter, setResidentTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [buildingFilter, setBuildingFilter] = useState<string>("ALL");
  const [onboardingSearch, setOnboardingSearch] = useState<string>("");

  const [form, setForm] = useState<{
    username: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    password: string;
    flatId: string;
    residentType: ResidentType;
  }>({
    username: "",
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    flatId: "",
    residentType: "OWNER",
  });

  const [unassignedResidents, setUnassignedResidents] = useState<UnassignedResident[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | number | null>(null);
  const [assignForm, setAssignForm] = useState<{
    flatId: string;
    residentType: ResidentType;
  }>({
    flatId: "",
    residentType: "OWNER",
  });

  // Onboarding & Allocation Workflow State
  const [onboardingRequests, setOnboardingRequests] = useState<ResidentOnboardingRequest[]>([]);
  const [availableFlats, setAvailableFlats] = useState<FlatAvailability[]>([]);
  const [activeTab, setActiveTab] = useState<"onboarding" | "residents">("onboarding");

  // Allocation Modal State
  const [allocatingRequest, setAllocatingRequest] = useState<ResidentOnboardingRequest | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [allocationForm, setAllocationForm] = useState<{
    flatId: string;
    confirmedFlatType: string;
    maintenanceInfo: string;
    parkingStatus: string;
    notes: string;
  }>({
    flatId: "",
    confirmedFlatType: "2BHK",
    maintenanceInfo: "₹2,500/month (Due on 5th)",
    parkingStatus: "Slot Assigned",
    notes: "",
  });

  // Changes / Reject Modal State
  const [requestingChangesReq, setRequestingChangesReq] = useState<ResidentOnboardingRequest | null>(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [rejectingReq, setRejectingReq] = useState<ResidentOnboardingRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [resList, soc, unassigned, onboardings, flatsAvail] = await Promise.all([
        residentService.list(),
        societyService.getSociety(),
        residentService.listUnassigned().catch(() => []),
        residentService.listOnboardingRequests().catch(() => []),
        residentService.getFlatsAvailability().catch(() => []),
      ]);
      setResidents(resList);
      setSociety(soc);
      setUnassignedResidents(unassigned);
      setOnboardingRequests(onboardings);
      setAvailableFlats(flatsAvail);

      if (soc && !form.flatId) {
        const firstFlat = soc.buildings?.[0]?.floors?.[0]?.flats?.[0];
        if (firstFlat) {
          setForm((f) => ({ ...f, flatId: firstFlat.id }));
          setAssignForm((f) => ({ ...f, flatId: firstFlat.id }));
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load residents.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleStartAllocate(req: ResidentOnboardingRequest) {
    setAllocatingRequest(req);
    setError("");
    setSuccess("");

    // Determine initial building
    const bldId = req.preferredBuildingId ? String(req.preferredBuildingId) : (society?.buildings?.[0]?.id || "");
    setSelectedBuildingId(bldId);

    // Find available flat, prioritizing preferred flat if available
    let chosenFlatId = "";
    if (req.preferredFlatNumber) {
      const match = availableFlats.find(
        (f) => !f.isOccupied && f.flatNumber.toLowerCase() === req.preferredFlatNumber?.toLowerCase()
      );
      if (match) {
        chosenFlatId = String(match.flatId);
      }
    }
    if (!chosenFlatId) {
      const firstAvail = availableFlats.find((f) => !f.isOccupied && (!bldId || String(f.buildingId) === bldId));
      if (firstAvail) {
        chosenFlatId = String(firstAvail.flatId);
      }
    }

    setAllocationForm({
      flatId: chosenFlatId,
      confirmedFlatType: req.flatTypePreference || "2BHK",
      maintenanceInfo: "₹2,500/month (Due on 5th)",
      parkingStatus: "Slot Assigned",
      notes: "",
    });
  }

  async function handleConfirmAllocate(e: FormEvent) {
    e.preventDefault();
    if (!allocatingRequest) return;
    if (!allocationForm.flatId) {
      setError("Please select an available flat to allocate.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      await residentService.allocateFlat(allocatingRequest.id!, {
        flatId: Number(allocationForm.flatId),
        confirmedFlatType: allocationForm.confirmedFlatType,
        maintenanceInfo: allocationForm.maintenanceInfo,
        parkingStatus: allocationForm.parkingStatus,
        notes: allocationForm.notes,
      });
      setSuccess(`Flat successfully allocated to ${allocatingRequest.fullName}!`);
      setAllocatingRequest(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate flat.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmChanges(e: FormEvent) {
    e.preventDefault();
    if (!requestingChangesReq || !changeNotes.trim()) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      await residentService.requestChanges(requestingChangesReq.id!, changeNotes.trim());
      setSuccess("Changes requested! Resident has been notified to update details.");
      setRequestingChangesReq(null);
      setChangeNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request changes.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectingReq || !rejectNotes.trim()) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      await residentService.rejectOnboarding(rejectingReq.id!, rejectNotes.trim());
      setSuccess("Onboarding request rejected.");
      setRejectingReq(null);
      setRejectNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject onboarding request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignUnassigned(userId: string | number) {
    if (!assignForm.flatId) {
      setError("Please select a flat to assign this resident.");
      return;
    }
    try {
      setCreating(true);
      setError("");
      setSuccess("");
      await residentService.createResident({
        userId: String(userId),
        flatId: assignForm.flatId,
        residentType: assignForm.residentType,
      });
      setSuccess("Resident assigned to flat successfully!");
      setAssigningUserId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign resident.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.flatId) {
      setError("Please select a flat for this resident.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setCreating(true);

      const input: ResidentProvisionInput = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        mobileNumber: form.mobileNumber.trim(),
        password: form.password,
        flatId: form.flatId,
        residentType: form.residentType,
      };

      const created = await residentService.provisionResident(input);

      setForm({
        username: "",
        fullName: "",
        email: "",
        mobileNumber: "",
        password: "",
        flatId: form.flatId,
        residentType: "OWNER",
      });

      setShowForm(false);
      setSuccess(
        `Resident account "${created.username}" provisioned to Flat ${created.flatNumber} successfully.`,
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to provision resident.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(item: Resident) {
    const newStatus: ResidentStatus =
      item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setError("");
    setSuccess("");
    setUpdatingId(item.id);

    try {
      await residentService.updateStatus(item.id, newStatus);
      setSuccess(
        `Resident "${item.username || item.flatNumber}" marked as ${newStatus.toLowerCase()}.`,
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update resident status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // Flatten all available flats from society
  const allFlats = useMemo(() => {
    if (!society) return [];
    return (society.buildings ?? []).flatMap((building) =>
      (building.floors ?? []).flatMap((floor) =>
        (floor.flats ?? []).map((flat) => ({
          id: flat.id,
          number: flat.number,
          buildingName: building.name,
          floorNumber: floor.number,
        })),
      ),
    );
  }, [society]);

  const filteredResidents = useMemo(() => {
    let list = residents;

    if (residentTypeFilter !== "ALL") {
      list = list.filter((r) => r.residentType === residentTypeFilter);
    }
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (buildingFilter !== "ALL") {
      list = list.filter((r) => String(r.buildingId) === buildingFilter || r.buildingName === buildingFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    const tokens = q.split(/\s+/).filter(Boolean);

    return list.filter((r) => {
      const haystacks = [
        r.fullName?.toLowerCase() || "",
        r.username?.toLowerCase() || "",
        `@${r.username?.toLowerCase() || ""}`,
        r.flatNumber?.toLowerCase() || "",
        `flat ${r.flatNumber?.toLowerCase() || ""}`,
        `unit ${r.flatNumber?.toLowerCase() || ""}`,
        r.buildingName?.toLowerCase() || "",
        `floor ${r.floorNumber ?? ""}`,
        `fl ${r.floorNumber ?? ""}`,
        r.mobileNumber?.toLowerCase() || "",
        r.mobileNumber?.replace(/[^0-9]/g, "") || "",
        r.email?.toLowerCase() || "",
        r.residentType?.toLowerCase() || "",
        r.residentType === "OWNER" ? "owner" : r.residentType === "TENANT" ? "tenant" : "family member",
        r.status?.toLowerCase() || "",
      ];

      return tokens.every((token) =>
        haystacks.some((h) => h.includes(token))
      );
    });
  }, [residents, search, residentTypeFilter, statusFilter, buildingFilter]);

  const filteredOnboardingRequests = useMemo(() => {
    const q = onboardingSearch.trim().toLowerCase();
    if (!q) return onboardingRequests;
    const tokens = q.split(/\s+/).filter(Boolean);
    return onboardingRequests.filter((req) => {
      const haystacks = [
        req.fullName?.toLowerCase() || "",
        req.username?.toLowerCase() || "",
        `@${req.username?.toLowerCase() || ""}`,
        req.userEmail?.toLowerCase() || "",
        req.userMobile?.toLowerCase() || "",
        req.preferredBuildingName?.toLowerCase() || "",
        req.preferredFlatNumber?.toLowerCase() || "",
        `flat ${req.preferredFlatNumber?.toLowerCase() || ""}`,
        req.allocatedFlatNumber?.toLowerCase() || "",
        `flat ${req.allocatedFlatNumber?.toLowerCase() || ""}`,
        req.allocatedBuildingName?.toLowerCase() || "",
        req.flatTypePreference?.toLowerCase() || "",
        req.residentType?.toLowerCase() || "",
        req.status?.toLowerCase() || "",
      ];
      return tokens.every((token) =>
        haystacks.some((h) => h.includes(token))
      );
    });
  }, [onboardingRequests, onboardingSearch]);

  return (
    <AppShell title="Residents" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin · People"
        title="Resident management"
        description="Provision, view, and manage resident accounts assigned to residential flats."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue/90"
              onClick={() => {
                setShowForm((v) => !v);
                setError("");
                setSuccess("");
              }}
            >
              <Plus /> Provision resident
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

      {/* Tabs Switcher */}
      <div className="mt-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("onboarding")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "onboarding"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="size-4" />
          Onboarding & Allocation Requests
          {onboardingRequests.filter(
            (r) => r.status === "SUBMITTED" || r.status === "UNDER_ADMIN_REVIEW" || r.status === "CHANGES_REQUESTED"
          ).length > 0 && (
            <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-xs font-bold text-brand-blue">
              {
                onboardingRequests.filter(
                  (r) => r.status === "SUBMITTED" || r.status === "UNDER_ADMIN_REVIEW" || r.status === "CHANGES_REQUESTED"
                ).length
              }
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("residents")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "residents"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" />
          Assigned Residents ({residents.length})
        </button>
      </div>

      {activeTab === "onboarding" && (
        <section className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 className="font-semibold text-foreground">Resident Onboarding Requests</h2>
              <p className="text-sm text-muted-foreground">
                {onboardingRequests.length} onboarding submission{onboardingRequests.length === 1 ? "" : "s"} awaiting review or allocated
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={onboardingSearch}
                onChange={(e) => setOnboardingSearch(e.target.value)}
                placeholder="Search applicant, flat, building..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {onboardingSearch && (
                <button
                  type="button"
                  onClick={() => setOnboardingSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingState label="Loading onboarding requests..." />
            </div>
          ) : onboardingRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No resident onboarding requests found. When newly registered residents submit their onboarding details, they will appear here.
            </div>
          ) : filteredOnboardingRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <p>No onboarding requests match &ldquo;<strong>{onboardingSearch}</strong>&rdquo;</p>
              <Button variant="outline" size="sm" onClick={() => setOnboardingSearch("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 font-medium">Resident</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Family</th>
                    <th className="px-5 py-3 font-medium">Flat Preference</th>
                    <th className="px-5 py-3 font-medium">Building / Unit Pref.</th>
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOnboardingRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">{req.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          @{req.username} {req.userMobile && `• ${req.userMobile}`}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {req.residentType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {req.familyMemberCount || 1} {req.familyMemberCount === 1 ? "person" : "people"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {req.flatTypePreference || "2BHK"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-foreground">
                          {req.preferredBuildingName ? req.preferredBuildingName : "Any Building"}
                        </div>
                        {req.preferredFlatNumber && (
                          <div className="text-xs text-muted-foreground">
                            Flat {req.preferredFlatNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            req.status === "ALLOCATED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : req.status === "CHANGES_REQUESTED"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : req.status === "REJECTED"
                                  ? "bg-destructive/15 text-destructive border border-destructive/20"
                                  : "bg-brand-blue/15 text-brand-blue border border-brand-blue/20"
                          }`}
                        >
                          {req.status === "ALLOCATED"
                            ? "Allocated"
                            : req.status === "CHANGES_REQUESTED"
                              ? "Changes Requested"
                              : req.status === "UNDER_ADMIN_REVIEW"
                                ? "Under Review"
                                : req.status === "REJECTED"
                                  ? "Rejected"
                                  : "Submitted"}
                        </span>
                        {req.status === "ALLOCATED" && req.allocatedFlatNumber && (
                          <div className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Flat {req.allocatedFlatNumber} ({req.allocatedBuildingName})
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {req.status !== "ALLOCATED" && req.status !== "REJECTED" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-brand-blue hover:bg-brand-blue/90 font-semibold"
                              onClick={() => handleStartAllocate(req)}
                            >
                              <Home className="mr-1.5 size-3.5" />
                              Allocate Flat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                              onClick={() => {
                                setRequestingChangesReq(req);
                                setChangeNotes("");
                              }}
                            >
                              <Edit3 className="mr-1 size-3" />
                              Request Changes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setRejectingReq(req);
                                setRejectNotes("");
                              }}
                            >
                              <X className="mr-1 size-3" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Allocation Modal */}
      {allocatingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
                  <ShieldCheck className="size-3.5" />
                  Official Flat Allocation
                </div>
                <h2 className="mt-2 font-display text-xl font-bold text-foreground">
                  Allocate Apartment / Flat
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Review preferences and confirm official assignment for {allocatingRequest.fullName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingRequest(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Preferences Recap */}
            <div className="mt-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-3.5 text-xs space-y-1">
              <p className="font-semibold text-foreground">Resident Application Details:</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                <span><strong>Type:</strong> {allocatingRequest.residentType}</span>
                <span><strong>Family:</strong> {allocatingRequest.familyMemberCount || 1} members</span>
                <span><strong>Pref. Flat Type:</strong> {allocatingRequest.flatTypePreference || "2BHK"}</span>
                <span>
                  <strong>Pref. Flat:</strong>{" "}
                  {allocatingRequest.preferredFlatNumber
                    ? `Flat ${allocatingRequest.preferredFlatNumber}`
                    : "No flat preference"}
                </span>
                {allocatingRequest.preferredBuildingName && (
                  <span className="col-span-2">
                    <strong>Pref. Building:</strong> {allocatingRequest.preferredBuildingName}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleConfirmAllocate} className="mt-5 space-y-4">
              {/* Building Filter */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-building" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by Building
                </Label>
                <select
                  id="alloc-building"
                  value={selectedBuildingId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBuildingId(bId);
                    const firstAvail = availableFlats.find(
                      (f) => !f.isOccupied && (!bId || String(f.buildingId) === bId)
                    );
                    setAllocationForm((prev) => ({
                      ...prev,
                      flatId: firstAvail ? String(firstAvail.flatId) : "",
                    }));
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">All Buildings in Society</option>
                  {society?.buildings?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flat Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-flat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Available Flat <span className="text-destructive">*</span>
                </Label>
                <select
                  id="alloc-flat"
                  value={allocationForm.flatId}
                  onChange={(e) => setAllocationForm({ ...allocationForm, flatId: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">Choose an available flat...</option>
                  {availableFlats
                    .filter((f) => !selectedBuildingId || String(f.buildingId) === selectedBuildingId)
                    .map((flat) => {
                      const isPref =
                        allocatingRequest.preferredFlatNumber &&
                        flat.flatNumber.toLowerCase() === allocatingRequest.preferredFlatNumber.toLowerCase();
                      return (
                        <option
                          key={flat.flatId}
                          value={flat.flatId}
                          disabled={flat.isOccupied}
                          className={flat.isOccupied ? "text-muted-foreground bg-muted" : "font-semibold"}
                        >
                          Flat {flat.flatNumber} ({flat.buildingName}, Floor {flat.floorNumber}) —{" "}
                          {flat.isOccupied
                            ? `Occupied by ${flat.occupiedByResidentName || "Resident"}`
                            : isPref
                              ? "Available (Resident Preferred ★)"
                              : "Available"}
                        </option>
                      );
                    })}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Flats occupied by existing active residents cannot be selected.
                </p>
              </div>

              {/* Confirmed Flat Type */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-flattype" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirmed Flat Type
                </Label>
                <select
                  id="alloc-flattype"
                  value={allocationForm.confirmedFlatType}
                  onChange={(e) =>
                    setAllocationForm({ ...allocationForm, confirmedFlatType: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="1BHK">1 BHK</option>
                  <option value="2BHK">2 BHK</option>
                  <option value="3BHK">3 BHK</option>
                  <option value="4BHK">4 BHK</option>
                  <option value="STUDIO">Studio</option>
                  <option value="PENTHOUSE">Penthouse</option>
                </select>
              </div>

              {/* Maintenance & Parking */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="alloc-maintenance" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Maintenance Information
                  </Label>
                  <Input
                    id="alloc-maintenance"
                    value={allocationForm.maintenanceInfo}
                    onChange={(e) =>
                      setAllocationForm({ ...allocationForm, maintenanceInfo: e.target.value })
                    }
                    placeholder="e.g. ₹2,500/month (Due on 5th)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="alloc-parking" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Parking Status / Slot
                  </Label>
                  <Input
                    id="alloc-parking"
                    value={allocationForm.parkingStatus}
                    onChange={(e) =>
                      setAllocationForm({ ...allocationForm, parkingStatus: e.target.value })
                    }
                    placeholder="e.g. Slot P-12 (Covered)"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin Allocation Notes (Optional)
                </Label>
                <Input
                  id="alloc-notes"
                  value={allocationForm.notes}
                  onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                  placeholder="e.g. Approved with keys handed over"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAllocatingRequest(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !allocationForm.flatId}
                  className="bg-brand-blue font-semibold hover:bg-brand-blue/90"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 size-4" />
                      Confirm Flat Allocation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {requestingChangesReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Request Changes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Send application back to {requestingChangesReq.fullName} for corrections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestingChangesReq(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmChanges} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="change-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Correction Details / Notes <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="change-notes"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  placeholder="Specify what information or documents need to be updated..."
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestingChangesReq(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !changeNotes.trim()}
                  className="bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  {actionLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Send to Resident
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-destructive">
                  Reject Onboarding Request
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reject onboarding submission for {rejectingReq.fullName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reject-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reason for Rejection <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="reject-notes"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  placeholder="State the reason for rejecting this application..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingReq(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !rejectNotes.trim()}
                  variant="destructive"
                  className="font-semibold"
                >
                  {actionLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Home className="size-5 text-brand-blue" />
            <div>
              <h2 className="font-semibold text-foreground">
                Provision resident account
              </h2>
              <p className="text-sm text-muted-foreground">
                Assign a user to a flat unit with the RESIDENT role.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="flatId">Flat / Unit</Label>
              <select
                id="flatId"
                value={form.flatId}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, flatId: e.target.value }))
                }
                required
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                {allFlats.length === 0 ? (
                  <option value="">No flats configured in society</option>
                ) : (
                  allFlats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      Flat {flat.number} ({flat.buildingName}, Floor {flat.floorNumber})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="residentType">Resident type</Label>
              <select
                id="residentType"
                value={form.residentType}
                onChange={(e) =>
                  setForm((cur) => ({
                    ...cur,
                    residentType: e.target.value as ResidentType,
                  }))
                }
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
                <option value="FAMILY_MEMBER">Family member</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, fullName: e.target.value }))
                }
                placeholder="e.g. Rajesh Kumar"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, username: e.target.value }))
                }
                placeholder="e.g. rajesh_kumar"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="mobileNumber">Mobile number</Label>
              <Input
                id="mobileNumber"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, mobileNumber: e.target.value }))
                }
                placeholder="+91 99887 77665"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, email: e.target.value }))
                }
                placeholder="e.g. rajesh@example.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">Initial password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, password: e.target.value }))
                }
                placeholder="Minimum 8 characters"
                required
                className="mt-1.5"
              />
            </div>

            <div className="flex items-end gap-2 sm:col-span-2 pt-2">
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  "Provision resident"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {unassignedResidents.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <Users className="size-5 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">
                    Unassigned Registered Residents
                  </h2>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {unassignedResidents.length} Pending Flat
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These residents have created an account but need to be linked to a building and flat.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            {unassignedResidents.map((user) => (
              <div
                key={user.userId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {user.fullName || user.username}
                    <span className="ml-2 text-xs text-muted-foreground">(@{user.username})</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {user.email && <span>Email: {user.email}</span>}
                    {user.mobileNumber && <span>Mobile: {user.mobileNumber}</span>}
                  </div>
                </div>

                {assigningUserId === user.userId ? (
                  <div className="flex flex-wrap items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
                    <select
                      value={assignForm.flatId}
                      onChange={(e) =>
                        setAssignForm((f) => ({ ...f, flatId: e.target.value }))
                      }
                      className="h-8 text-xs rounded border border-input bg-background px-2"
                    >
                      <option value="">Select Flat...</option>
                      {allFlats.map((flat) => (
                        <option key={flat.id} value={flat.id}>
                          Flat {flat.number} ({flat.buildingName}, Fl {flat.floorNumber})
                        </option>
                      ))}
                    </select>

                    <select
                      value={assignForm.residentType}
                      onChange={(e) =>
                        setAssignForm((f) => ({
                          ...f,
                          residentType: e.target.value as ResidentType,
                        }))
                      }
                      className="h-8 text-xs rounded border border-input bg-background px-2"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="TENANT">Tenant</option>
                      <option value="FAMILY_MEMBER">Family member</option>
                    </select>

                    <Button
                      size="sm"
                      className="h-8 text-xs bg-brand-blue hover:bg-brand-blue/90"
                      disabled={creating || !assignForm.flatId}
                      onClick={() => void handleAssignUnassigned(user.userId)}
                    >
                      {creating ? <Loader2 className="size-3 animate-spin" /> : "Confirm"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setAssigningUserId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-brand-blue/50 text-brand-blue hover:bg-brand-blue/10 self-start sm:self-auto"
                    onClick={() => {
                      setAssigningUserId(user.userId);
                      if (allFlats.length > 0 && !assignForm.flatId) {
                        setAssignForm((f) => ({ ...f, flatId: allFlats[0].id }));
                      }
                    }}
                  >
                    Assign Flat
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Assigned residents</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredResidents.length} of {residents.length} resident account{residents.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, flat, mobile, building..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "OWNER", "TENANT", "FAMILY_MEMBER"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setResidentTypeFilter(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    residentTypeFilter === type
                      ? "bg-brand-blue text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {type === "ALL" ? "All Types" : type === "OWNER" ? "Owners" : type === "TENANT" ? "Tenants" : "Family"}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border hidden sm:block mx-1" />

            <div className="flex flex-wrap items-center gap-1.5">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {status === "ALL" ? "All Status" : status === "ACTIVE" ? "Active" : "Inactive"}
                </button>
              ))}
            </div>

            {(search || residentTypeFilter !== "ALL" || statusFilter !== "ALL" || buildingFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                onClick={() => {
                  setSearch("");
                  setResidentTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setBuildingFilter("ALL");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <LoadingState label="Loading residents..." />
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search || residentTypeFilter !== "ALL" || statusFilter !== "ALL" ? (
              <div className="space-y-2">
                <p>No residents match your search or filter criteria.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setSearch("");
                    setResidentTypeFilter("ALL");
                    setStatusFilter("ALL");
                    setBuildingFilter("ALL");
                  }}
                >
                  Clear search & filters
                </Button>
              </div>
            ) : (
              "No resident profiles found. Click 'Provision resident' to add one."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Flat</th>
                  <th className="px-5 py-3 font-medium">Building</th>
                  <th className="px-5 py-3 font-medium">Resident</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-foreground">
                      Flat {item.flatNumber}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {item.buildingName}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">
                        {item.fullName || item.username}
                      </div>
                      {item.fullName && (
                        <div className="text-xs text-muted-foreground">
                          @{item.username}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.mobileNumber}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {item.email || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {item.residentType === "OWNER"
                          ? "Owner"
                          : item.residentType === "TENANT"
                            ? "Tenant"
                            : "Family"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant={item.status === "ACTIVE" ? "outline" : "default"}
                        className={
                          item.status === "ACTIVE"
                            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
                        onClick={() => void handleToggleStatus(item)}
                        disabled={updatingId === item.id}
                      >
                        {updatingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : item.status === "ACTIVE" ? (
                          <>
                            <PowerOff className="mr-1.5 size-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="mr-1.5 size-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
