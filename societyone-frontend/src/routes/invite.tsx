import { useEffect, useState, useMemo, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Home,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { VisitorPhotoUpload } from "@/components/VisitorPhotoUpload";
import { resolveMediaUrl } from "@/lib/media-url";
import societyOneLogo from "@/assets/societyone-logo.png";
import {
  authService,
  residentService,
  societyService,
  visitorService,
} from "@/services";
import type { Resident as ResidentProfile } from "@/services";
import type {
  Flat,
  PublicStructureResponse,
  Role,
  Society,
  User,
  VisitRequest,
  VisitorType,
} from "@/types/domain";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "Visit Request & Invites | SocietyOne" },
      { name: "description", content: "Instant guest visit request and resident pre-authorizations." },
    ],
  }),
  component: InvitePage,
});

const INVITE_DRAFT_KEY = "societyone.invite_form_draft.v1";

interface InviteFormDraft {
  visitorType?: VisitorType;
  name?: string;
  mobile?: string;
  purpose?: string;
  vehicleNumber?: string;
  expectedTime?: string;
  photoUrl?: string;
  selectedBuildingId?: string;
  selectedFlatId?: string;
  selectedResidentId?: string;
}

function loadDraft(): InviteFormDraft | null {
  try {
    const raw = localStorage.getItem(INVITE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: InviteFormDraft) {
  try {
    localStorage.setItem(INVITE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(INVITE_DRAFT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function InvitePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Draft persistence state
  const initialDraft = useMemo(() => loadDraft(), []);
  const [draftRestored, setDraftRestored] = useState(
    Boolean(
      initialDraft &&
        (initialDraft.name ||
          initialDraft.mobile ||
          initialDraft.purpose ||
          initialDraft.vehicleNumber),
    ),
  );

  // Structure state for public / staff mode
  const [publicStructure, setPublicStructure] = useState<PublicStructureResponse | null>(null);
  const [structureLoading, setStructureLoading] = useState(true);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialDraft?.selectedBuildingId ?? "",
  );
  const [selectedFlatId, setSelectedFlatId] = useState<string>(
    initialDraft?.selectedFlatId ?? "",
  );
  const [selectedResidentId, setSelectedResidentId] = useState<string>(
    initialDraft?.selectedResidentId ?? "",
  );
  const [flatResidents, setFlatResidents] = useState<ResidentProfile[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);

  // Resident state
  const [residentProfile, setResidentProfile] = useState<ResidentProfile | null>(null);
  const [selfLinking, setSelfLinking] = useState(false);
  const [selfResidentType, setSelfResidentType] = useState<"OWNER" | "TENANT" | "FAMILY_MEMBER">("OWNER");

  // Form state initialized with draft values
  const [name, setName] = useState(initialDraft?.name ?? "");
  const [mobile, setMobile] = useState(initialDraft?.mobile ?? "");
  const [purpose, setPurpose] = useState(initialDraft?.purpose ?? "");
  const [visitorType, setVisitorType] = useState<VisitorType>(initialDraft?.visitorType ?? "GUEST");
  const [vehicleNumber, setVehicleNumber] = useState(initialDraft?.vehicleNumber ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialDraft?.photoUrl ?? "");
  const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedTime, setExpectedTime] = useState(initialDraft?.expectedTime ?? "12:00");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live tracking state for guest visitor
  const [trackedRequest, setTrackedRequest] = useState<VisitRequest | null>(null);
  const [trackingPollActive, setTrackingPollActive] = useState(false);

  // Save form draft across refreshes / tab switches
  useEffect(() => {
    if (name || mobile || purpose || vehicleNumber || photoUrl || selectedBuildingId || selectedFlatId || selectedResidentId) {
      saveDraft({
        visitorType,
        name,
        mobile,
        purpose,
        vehicleNumber,
        photoUrl,
        expectedTime,
        selectedBuildingId,
        selectedFlatId,
        selectedResidentId,
      });
    }
  }, [visitorType, name, mobile, purpose, vehicleNumber, photoUrl, expectedTime, selectedBuildingId, selectedFlatId, selectedResidentId]);

  function handleClearDraft() {
    clearDraft();
    setName("");
    setMobile("");
    setPurpose("");
    setVehicleNumber("");
    setPhotoUrl("");
    setExpectedTime("12:00");
    setVisitorType("GUEST");
    setDraftRestored(false);
  }

  const fetchStructure = useCallback(async () => {
    try {
      setStructureLoading(true);
      setStructureError(null);
      const structure = await visitorService.getPublicStructure();
      if (structure && structure.societies && structure.societies.length > 0) {
        setPublicStructure(structure);
        const firstSoc = structure.societies[0];
        setSelectedSocietyId(String(firstSoc.id));
      } else {
        setStructureError("No societies or buildings currently available.");
      }
    } catch (err) {
      console.error("Failed to load public structure:", err);
      setStructureError(err instanceof Error ? err.message : "Unable to load building data.");
      // Fallback
      try {
        const socList = await societyService.listSocieties();
        if (socList.length > 0) {
          setSocieties(socList);
          setSelectedSocietyId(String(socList[0].id));
        }
      } catch {
        // Ignore fallback error
      }
    } finally {
      setStructureLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setPageLoading(true);
        // Try getting logged-in user if available (do not fail if unauthenticated)
        try {
          const currentUser = await authService.getCurrentUser();
          if (mounted && currentUser) {
            setUser(currentUser);
            if (currentUser.role === "RESIDENT") {
              const me = await residentService.getMe().catch(() => null);
              if (mounted && me) {
                setResidentProfile(me);
              }
            }
          }
        } catch {
          // Unauthenticated guest visitor - expected!
          if (mounted) setUser(null);
        }

        await fetchStructure();
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [fetchStructure]);

  // Update selected building/flat when public structure changes or dropdowns change
  const currentPublicSociety = useMemo(() => {
    if (!publicStructure || !publicStructure.societies) return null;
    return (
      publicStructure.societies.find((s) => String(s.id) === selectedSocietyId) ||
      publicStructure.societies[0] ||
      null
    );
  }, [publicStructure, selectedSocietyId]);

  const currentPublicBuilding = useMemo(() => {
    if (!currentPublicSociety || !currentPublicSociety.buildings) return null;
    return (
      currentPublicSociety.buildings.find((b) => String(b.id) === selectedBuildingId) ||
      currentPublicSociety.buildings[0] ||
      null
    );
  }, [currentPublicSociety, selectedBuildingId]);

  const availablePublicFlats = useMemo(() => {
    if (!currentPublicBuilding || !currentPublicBuilding.floors) return [];
    return currentPublicBuilding.floors.flatMap((flr) => flr.flats ?? []);
  }, [currentPublicBuilding]);

  const currentPublicFlat = useMemo(() => {
    return (
      availablePublicFlats.find((f) => String(f.id) === selectedFlatId) ||
      availablePublicFlats[0] ||
      null
    );
  }, [availablePublicFlats, selectedFlatId]);

  const availableResidents = useMemo(() => {
    if (currentPublicFlat && currentPublicFlat.residents) {
      return currentPublicFlat.residents;
    }
    return flatResidents.map((r) => ({
      id: Number(r.userId),
      fullName: r.username || "Resident",
      username: r.username || "",
    }));
  }, [currentPublicFlat, flatResidents]);

  // Reactive synchronization: ensure building, flat, and resident are always auto-selected
  useEffect(() => {
    if (!currentPublicSociety || !currentPublicSociety.buildings || currentPublicSociety.buildings.length === 0) return;
    const exists = currentPublicSociety.buildings.some((b) => String(b.id) === selectedBuildingId);
    if (!exists) {
      setSelectedBuildingId(String(currentPublicSociety.buildings[0].id));
    }
  }, [currentPublicSociety, selectedBuildingId]);

  useEffect(() => {
    if (availablePublicFlats.length === 0) return;
    const exists = availablePublicFlats.some((f) => String(f.id) === selectedFlatId);
    if (!exists) {
      setSelectedFlatId(String(availablePublicFlats[0].id));
    }
  }, [availablePublicFlats, selectedFlatId]);

  useEffect(() => {
    if (availableResidents.length === 0) return;
    const exists = availableResidents.some((r) => String(r.id) === selectedResidentId);
    if (!exists) {
      setSelectedResidentId(String(availableResidents[0].id));
    }
  }, [availableResidents, selectedResidentId]);

  // When selected flat changes in authenticated staff mode, load residents
  useEffect(() => {
    if (user && user.role !== "RESIDENT" && selectedFlatId && !publicStructure) {
      let mounted = true;
      setLoadingResidents(true);
      residentService
        .listByFlat(selectedFlatId)
        .then((resList) => {
          if (!mounted) return;
          setFlatResidents(resList);
          if (resList.length > 0) {
            setSelectedResidentId(String(resList[0].userId));
          } else {
            setSelectedResidentId("");
          }
        })
        .catch(() => {
          if (mounted) {
            setFlatResidents([]);
            setSelectedResidentId("");
          }
        })
        .finally(() => {
          if (mounted) setLoadingResidents(false);
        });
      return () => {
        mounted = false;
      };
    }
  }, [selectedFlatId, user, publicStructure]);

  // Polling for live status of guest visitor request
  useEffect(() => {
    if (!trackingPollActive || !trackedRequest) return;

    const interval = setInterval(async () => {
      try {
        const updated = await visitorService.getPublicVisitRequestStatus(trackedRequest.id);
        setTrackedRequest(updated);
        // Stop poll if checked out or cancelled
        if (updated.visitStatus === "CHECKED_OUT" || updated.visitStatus === "CANCELLED" || updated.requestStatus === "REJECTED_BY_RESIDENT") {
          // Keep displaying status
        }
      } catch {
        // Ignore background polling errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [trackingPollActive, trackedRequest]);

  async function handleConnectFlat() {
    if (!selectedFlatId) {
      setFormError("Please select a flat to connect.");
      return;
    }
    setSelfLinking(true);
    setFormError(null);
    try {
      const linked = await residentService.selfLinkFlat(selectedFlatId, selfResidentType);
      setResidentProfile(linked);
      setSuccessMessage(`Successfully connected to Flat ${linked.flatNumber}!`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to connect to flat.");
    } finally {
      setSelfLinking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setFormError("Visitor name is required.");
      return;
    }
    if (!mobile.trim()) {
      setFormError("Contact mobile number is required.");
      return;
    }
    if (!purpose.trim()) {
      setFormError("Purpose of visit is required.");
      return;
    }

    setSaving(true);

    try {
      // 1. GUEST / UNAUTHENTICATED VISITOR FLOW
      if (!user) {
        if (!selectedSocietyId || !selectedFlatId || !selectedResidentId) {
          setFormError("Please select the Society, Flat, and Resident you are visiting.");
          setSaving(false);
          return;
        }

        const requestInput = {
          fullName: name.trim(),
          mobileNumber: mobile.trim(),
          purpose: purpose.trim(),
          visitorType,
          vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
          photoUrl: photoUrl.trim() || undefined,
          societyId: Number(selectedSocietyId),
          buildingId: selectedBuildingId ? Number(selectedBuildingId) : undefined,
          flatId: Number(selectedFlatId),
          residentId: Number(selectedResidentId),
          expectedDate: expectedDate || new Date().toISOString().slice(0, 10),
          expectedTime: expectedTime || "12:00",
        };

        const created = await visitorService.createPublicVisitRequest(requestInput);
        clearDraft();
        setDraftRestored(false);
        setTrackedRequest(created);
        setTrackingPollActive(true);
        setSuccessMessage("Visit request sent to the resident! Tracking live status below.");
        return;
      }

      // 2. AUTHENTICATED RESIDENT FLOW (Pre-authorize Guest or Delivery)
      if (user.role === "RESIDENT") {
        if (!residentProfile) {
          setFormError("No flat linked to your resident account. Please link your flat first.");
          setSaving(false);
          return;
        }

        const residentInput = {
          visitor: {
            id: `visitor-${Date.now()}`,
            name: name.trim(),
            email: "",
            mobile: mobile.trim(),
            role: "VISITOR" as const,
            visitorType,
          },
          resident: {
            id: String(residentProfile.userId),
            name: residentProfile.username || user.name,
            role: "RESIDENT" as const,
            flatId: String(residentProfile.flatId),
          },
          society: {
            id: String(residentProfile.societyId),
            name: residentProfile.societyName,
            address: "",
            buildings: [],
          },
          flat: {
            id: String(residentProfile.flatId),
            number: residentProfile.flatNumber,
            buildingId: String(residentProfile.buildingId),
            floorId: String(residentProfile.floorId),
            residentIds: [String(residentProfile.userId)],
          },
          source: "RESIDENT" as const,
          visitorType,
          expectedDate: expectedDate || new Date().toISOString().slice(0, 10),
          expectedTime: expectedTime || "12:00",
          purpose: purpose.trim(),
          vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
          photoUrl: photoUrl.trim() || undefined,
        };

        await visitorService.createRequest(residentInput);
        clearDraft();
        setDraftRestored(false);
        setSuccessMessage(
          visitorType === "DELIVERY" || visitorType === "COURIER"
            ? "Delivery pre-authorized! Security will permit entry upon arrival."
            : "Visitor invite created! Security will verify them at gate.",
        );
        setTimeout(() => {
          navigate({ to: "/requests" });
        }, 1200);
        return;
      }

      // 3. SECURITY / ADMIN WALK-IN GATE REGISTRATION
      if (!selectedFlatId || !selectedResidentId) {
        setFormError("Please select the destination flat and resident.");
        setSaving(false);
        return;
      }

      const chosenResident = availableResidents.find((r) => String(r.id) === selectedResidentId);
      const chosenFlatNumber = currentPublicFlat?.number || "Selected Flat";

      const staffInput = {
        visitor: {
          id: `visitor-${Date.now()}`,
          name: name.trim(),
          email: "",
          mobile: mobile.trim(),
          role: "VISITOR" as const,
          visitorType,
        },
        resident: {
          id: selectedResidentId,
          name: chosenResident?.fullName || "Resident",
          role: "RESIDENT" as const,
          flatId: selectedFlatId,
        },
        society: {
          id: selectedSocietyId,
          name: currentPublicSociety?.name || "Society",
          address: "",
          buildings: [],
        },
        flat: {
          id: selectedFlatId,
          number: chosenFlatNumber,
          buildingId: selectedBuildingId,
          floorId: "",
          residentIds: [selectedResidentId],
        },
        source: "SECURITY" as const,
        visitorType,
        expectedDate: expectedDate || new Date().toISOString().slice(0, 10),
        expectedTime: expectedTime || "12:00",
        purpose: purpose.trim(),
        vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
        photoUrl: photoUrl.trim() || undefined,
      };

      await visitorService.createRequest(staffInput);
      clearDraft();
      setDraftRestored(false);
      setSuccessMessage("Walk-in visitor registered! Request sent to resident for approval.");
      setTimeout(() => {
        navigate({ to: "/security/online" });
      }, 1000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create visit request.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------
  // RENDER: LIVE STATUS TRACKER FOR GUEST VISITOR
  // -------------------------------------------------------------
  if (trackedRequest) {
    const isApproved =
      trackedRequest.requestStatus === "APPROVED_BY_RESIDENT" ||
      trackedRequest.requestStatus === "ACCEPTED_BY_SECURITY";
    const isDenied =
      trackedRequest.requestStatus === "REJECTED_BY_RESIDENT" ||
      trackedRequest.requestStatus === "DENIED_BY_RESIDENT" ||
      trackedRequest.requestStatus === "REJECTED_BY_SECURITY";
    const isCheckedIn = trackedRequest.visitStatus === "CHECKED_IN";
    const isPending = trackedRequest.requestStatus === "PENDING_RESIDENT";

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Simple Header */}
        <header className="border-b border-border bg-card px-5 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={societyOneLogo} alt="SocietyOne" className="size-9 rounded-lg object-cover" />
              <span className="font-display text-lg font-bold">
                Society<span className="text-brand-orange">One</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-10">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue">
                  <Clock3 className="size-3.5" /> Request #{trackedRequest.id}
                </span>
                <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Live Visit Status</h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const updated = await visitorService.getPublicVisitRequestStatus(trackedRequest.id);
                  setTrackedRequest(updated);
                }}
              >
                <RefreshCw className="mr-1.5 size-4" /> Refresh
              </Button>
            </div>

            {/* Status Card Banner */}
            <div
              className={`mt-6 rounded-xl border p-5 ${
                isCheckedIn
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : isApproved
                    ? "border-brand-blue/40 bg-info-soft text-brand-blue"
                    : isDenied
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-brand-orange/40 bg-warning-soft text-accent-foreground"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {isCheckedIn ? (
                  <CheckCircle2 className="size-7 shrink-0 text-emerald-600" />
                ) : isApproved ? (
                  <ShieldCheck className="size-7 shrink-0 text-brand-blue" />
                ) : isDenied ? (
                  <XCircle className="size-7 shrink-0 text-destructive" />
                ) : (
                  <div className="size-4 rounded-full bg-brand-orange animate-ping mt-1.5 shrink-0" />
                )}
                <div>
                  <h2 className="font-display text-lg font-bold">
                    {isCheckedIn
                      ? "Entry Permitted — Welcome!"
                      : isApproved
                        ? "Resident Approved! Proceed to Gate"
                        : isDenied
                          ? "Visit Request Declined"
                          : "Waiting for Resident Approval..."}
                  </h2>
                  <p className="mt-1 text-sm opacity-90">
                    {isCheckedIn
                      ? `You have checked in at the gate. Visiting Flat ${trackedRequest.flat.number}.`
                      : isApproved
                        ? `Resident ${trackedRequest.resident.name} has approved your visit. Please show this screen to the security guard at the gate.`
                        : isDenied
                          ? "The resident has declined entry at this time. Entry cannot be permitted."
                          : `Your request has been sent to ${trackedRequest.resident.name} for Flat ${trackedRequest.flat.number}. This page updates automatically.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Visit Details Table */}
            <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-background p-4 text-sm">
              {trackedRequest.photoUrl && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">Visitor Photo</span>
                  <div className="size-14 overflow-hidden rounded-lg border border-border">
                    <img
                      src={resolveMediaUrl(trackedRequest.photoUrl)}
                      alt={trackedRequest.visitor.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Visitor Name</span>
                <span className="font-semibold">{trackedRequest.visitor.name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Mobile</span>
                <span className="font-semibold">{trackedRequest.visitor.mobile}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Destination Flat</span>
                <span className="font-semibold">Flat {trackedRequest.flat.number}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Resident</span>
                <span className="font-semibold">{trackedRequest.resident.name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-semibold">{trackedRequest.purpose || "General Visit"}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Visitor Type</span>
                <span className="font-semibold capitalize">{trackedRequest.visitorType.toLowerCase()}</span>
              </div>
              {trackedRequest.vehicleNumber && (
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Vehicle Number</span>
                  <span className="font-semibold">{trackedRequest.vehicleNumber}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setTrackedRequest(null);
                  setName("");
                  setMobile("");
                  setPurpose("");
                  setVehicleNumber("");
                }}
              >
                Submit Another Request
              </Button>
              <Button asChild className="flex-1 bg-brand-blue">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FORM CONTENT (Shared between public guest and authenticated user)
  // -------------------------------------------------------------
  const formContent = (
    <div className="mx-auto max-w-3xl">
      {/* Self-linking banner for resident without flat */}
      {user?.role === "RESIDENT" && !residentProfile && (
        <div className="mb-6 rounded-xl border border-brand-orange/40 bg-warning-soft p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-brand-orange mt-0.5" />
            <div className="flex-1">
              <h3 className="font-display text-base font-bold text-foreground">
                No flat linked to your account yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your account to your flat to enable visitor approvals and delivery authorizations.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Select Flat</Label>
                  <select
                    value={selectedFlatId}
                    onChange={(e) => setSelectedFlatId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Choose your flat...</option>
                    {availablePublicFlats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Your Occupancy</Label>
                  <select
                    value={selfResidentType}
                    onChange={(e) => setSelfResidentType(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="TENANT">Tenant</option>
                    <option value="FAMILY_MEMBER">Family Member</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleConnectFlat}
                    disabled={selfLinking || !selectedFlatId}
                    className="w-full bg-brand-blue"
                  >
                    {selfLinking ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Home className="mr-1.5 size-4" />}
                    Connect Flat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <SectionHeading
          title={
            !user
              ? "Instant Visitor Request"
              : user.role === "RESIDENT"
                ? "Pre-authorize Visitor or Delivery"
                : "Register Gate Walk-in Visitor"
          }
        />
        <p className="mt-1 text-sm text-muted-foreground">
          {!user
            ? "No signup or login required. Fill details below and send entry request directly to the resident."
            : user.role === "RESIDENT"
              ? "Authorize guests or deliveries (Zomato, Swiggy, Amazon, courier). Gate security will verify and permit them upon arrival."
              : "Register walk-in visitors arriving at the gate. Request will be dispatched to resident."}
        </p>

        {formError && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        {draftRestored && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-blue/30 bg-info-soft px-3.5 py-2 text-xs text-brand-blue">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 shrink-0 text-brand-blue" />
              <span>Restored your previously entered form details.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="font-semibold underline hover:text-brand-blue/80 ml-2 shrink-0 cursor-pointer"
            >
              Clear form
            </button>
          </div>
        )}

        <div className="mt-6 space-y-5">
          {/* Visitor Type quick selector */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Visitor Category
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { type: "GUEST", label: "Guest / Friend", icon: <Users className="size-4" /> },
                { type: "DELIVERY", label: "Delivery (Food/App)", icon: <Package className="size-4" /> },
                { type: "COURIER", label: "Courier / Package", icon: <Truck className="size-4" /> },
                { type: "CAB_AUTO", label: "Cab / Auto", icon: <DoorOpen className="size-4" /> },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setVisitorType(item.type as VisitorType)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-colors ${
                    visitorType === item.type
                      ? "border-brand-blue bg-info-soft text-brand-blue"
                      : "border-border bg-background hover:border-brand-blue/30"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visitor personal details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="visitor-name">
                Visitor / Agent Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={visitorType === "DELIVERY" ? "e.g. Swiggy / Zomato Rider" : "Full name"}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="visitor-mobile">
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitor-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="visitor-purpose">
              Purpose of Visit <span className="text-destructive">*</span>
            </Label>
            <Input
              id="visitor-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={
                visitorType === "DELIVERY"
                  ? "e.g. Food Delivery / Groceries"
                  : "e.g. Visiting friend / Personal work"
              }
              className="mt-1"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="visitor-vehicle">Vehicle Number (Optional)</Label>
              <Input
                id="visitor-vehicle"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KA01AB1234"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="expected-time">Expected Time</Label>
              <Input
                id="expected-time"
                type="time"
                value={expectedTime}
                onChange={(e) => setExpectedTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Optional Visitor Photo */}
          <div className="pt-2">
            <VisitorPhotoUpload
              photoUrl={photoUrl}
              onPhotoChange={(url) => setPhotoUrl(url || "")}
              required={false}
              isPublic={!user}
              helperText="Optional: Upload visitor photo for quick identification and verification at gate."
            />
          </div>

          {/* Destination Selection (Only needed if NOT a resident with assigned flat) */}
          {user?.role === "RESIDENT" && residentProfile ? (
            <div className="rounded-xl border border-brand-blue/30 bg-info-soft p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                Pre-authorizing for your flat
              </span>
              <p className="mt-1 font-display text-base font-bold text-foreground">
                Flat {residentProfile.flatNumber} · {residentProfile.societyName}
              </p>
              <p className="text-xs text-muted-foreground">
                Entry will be pre-approved for gate security check-in.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Destination: Flat & Resident Selection
                </span>
                {structureLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-brand-blue" />
                    Loading buildings & flats...
                  </span>
                )}
              </div>

              {structureError && (
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <span>{structureError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchStructure()}
                    className="h-7 text-xs font-medium"
                  >
                    <RefreshCw className="mr-1 size-3" /> Retry Loading
                  </Button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Building</Label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    disabled={structureLoading || (currentPublicSociety?.buildings ?? []).length === 0}
                    className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    {!currentPublicSociety || (currentPublicSociety.buildings ?? []).length === 0 ? (
                      <option value="">
                        {structureLoading ? "Loading buildings..." : "No buildings available"}
                      </option>
                    ) : (
                      currentPublicSociety.buildings.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Flat Number</Label>
                  <select
                    value={selectedFlatId}
                    onChange={(e) => setSelectedFlatId(e.target.value)}
                    disabled={structureLoading || availablePublicFlats.length === 0}
                    className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    {availablePublicFlats.length === 0 ? (
                      <option value="">
                        {structureLoading ? "Loading flats..." : "No flats available"}
                      </option>
                    ) : (
                      availablePublicFlats.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          Flat {f.number}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Resident to Visit</Label>
                  <select
                    value={selectedResidentId}
                    onChange={(e) => setSelectedResidentId(e.target.value)}
                    disabled={structureLoading || availableResidents.length === 0}
                    className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold"
                  >
                    {availableResidents.length === 0 ? (
                      <option value="">
                        {structureLoading ? "Loading residents..." : "No residents listed"}
                      </option>
                    ) : (
                      availableResidents.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.fullName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-xl bg-brand-blue text-base font-semibold hover:bg-brand-blue/90 shadow-md"
          >
            {saving ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <DoorOpen className="mr-2 size-5" />
            )}
            {!user
              ? "Send Visit Request to Resident"
              : user.role === "RESIDENT"
                ? "Pre-authorize Entry for Gate"
                : "Register Walk-in Visitor"}
          </Button>
        </div>
      </form>
    </div>
  );

  // If user is authenticated, render within AppShell
  if (user) {
    return (
      <AppShell
        title={user.role === "RESIDENT" ? "Invite & Pre-authorizations" : "Walk-in Visitor Registration"}
        eyebrow="Visitors"
      >
        <PageIntro
          eyebrow="Gate Entry Management"
          title={user.role === "RESIDENT" ? "Invite guest or pre-authorize delivery" : "Gate visitor registration"}
          description={
            user.role === "RESIDENT"
              ? "Pre-approve deliveries and invite guests so gate security can verify and check them in instantly."
              : "Register walk-in visitors and dispatch instant requests to residents."
          }
        />
        <div className="mt-7">{formContent}</div>
      </AppShell>
    );
  }

  // Unauthenticated Public Guest Experience
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={societyOneLogo} alt="SocietyOne" className="size-9 rounded-lg object-cover" />
            <span className="font-display text-lg font-bold">
              Society<span className="text-brand-orange">One</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 size-4" /> Home
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-warning-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            <ShieldCheck className="size-3.5" /> No Account Required
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Instant Visitor Request
          </h1>
          <p className="mt-2 text-muted-foreground">
            Visiting a resident? Submit your details directly. The resident will approve and gate security will permit entry.
          </p>
        </div>

        {formContent}
      </main>
    </div>
  );
}