import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Home,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  Camera,
  Trash2,
  UploadCloud,
  FileText,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import societyOneLogo from "@/assets/societyone-logo.png";
import { ShareModal } from "@/components/share/ShareModal";
import { visitorService } from "@/services";
import type {
  EligibleRecipient,
  PublicSociety,
  VisitorType,
  VisitRequest,
} from "@/types/domain";

export const Route = createFileRoute("/online-visit")({
  head: () => ({
    meta: [
      { title: "Online Visitor Registration | SocietyOne" },
      {
        name: "description",
        content: "Register an upcoming online visit in advance to any resident or society management member.",
      },
    ],
  }),
  component: OnlineVisitPage,
});

const VISITOR_TYPES: { type: VisitorType; label: string; icon: string }[] = [
  { type: "GUEST", label: "Guest / Family / Friend", icon: "👥" },
  { type: "DELIVERY", label: "Delivery / Courier", icon: "📦" },
  { type: "TECHNICIAN", label: "Technician / Repair", icon: "🔧" },
  { type: "VENDOR_CONTRACTOR", label: "Vendor / Contractor", icon: "🏗️" },
  { type: "CAB_AUTO", label: "Cab / Transport", icon: "🚗" },
  { type: "DOMESTIC_WORKER", label: "Service Staff / Helper", icon: "🧹" },
  { type: "OTHER", label: "Other Official Visit", icon: "📋" },
];

function OnlineVisitPage() {
  const navigate = useNavigate();

  // Data states
  const [societies, setSocieties] = useState<PublicSociety[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<EligibleRecipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<EligibleRecipient | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("GUEST");
  const [purpose, setPurpose] = useState("");
  const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedTime, setExpectedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [numberOfVisitors, setNumberOfVisitors] = useState<number>(1);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Optional photo state
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Filter and search for recipients
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"ALL" | "RESIDENT" | "ADMIN">("ALL");

  // UI state
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<VisitRequest | null>(null);

  // Load societies on mount
  useEffect(() => {
    let mounted = true;
    setLoadingSocieties(true);
    visitorService
      .listPublicSocieties()
      .then((socList) => {
        if (!mounted) return;
        setSocieties(socList);
        if (socList.length > 0) {
          setSelectedSocietyId(socList[0].id);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setFormError("Could not load societies. Please check your internet connection.");
      })
      .finally(() => {
        if (mounted) setLoadingSocieties(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Load eligible recipients when selectedSocietyId changes
  useEffect(() => {
    if (!selectedSocietyId) {
      setRecipients([]);
      setSelectedRecipient(null);
      return;
    }

    let mounted = true;
    setLoadingRecipients(true);
    setSelectedRecipient(null);

    visitorService
      .listEligibleRecipients(selectedSocietyId)
      .then((data) => {
        if (!mounted) return;
        setRecipients(data);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to load eligible recipients:", err);
      })
      .finally(() => {
        if (mounted) setLoadingRecipients(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSocietyId]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (recipientFilter === "RESIDENT" && r.role !== "RESIDENT") return false;
      if (recipientFilter === "ADMIN" && r.role !== "ADMIN") return false;

      if (!recipientSearch.trim()) return true;

      const q = recipientSearch.toLowerCase();
      const nameMatch = r.fullName.toLowerCase().includes(q);
      const flatMatch = r.flatNumber ? r.flatNumber.toLowerCase().includes(q) : false;
      const bldMatch = r.buildingName ? r.buildingName.toLowerCase().includes(q) : false;
      const desigMatch = r.designation ? r.designation.toLowerCase().includes(q) : false;

      return nameMatch || flatMatch || bldMatch || desigMatch;
    });
  }, [recipients, recipientFilter, recipientSearch]);

  // Handle Photo selection
  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: 5MB & JPG/PNG/WebP
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Identification photo must be under 5MB.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type.toLowerCase())) {
      setFormError("Please choose a valid JPG, PNG, or WebP photo.");
      return;
    }

    setFormError(null);
    setPhotoFile(file);
    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);

    // Auto-upload photo
    setPhotoUploading(true);
    try {
      const url = await visitorService.uploadPublicVisitorPhoto(file);
      setPhotoUrl(url);
    } catch (err) {
      console.warn("Photo upload warning:", err);
      // Photo is optional, so we keep the preview or let the user retry
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(undefined);
  }

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedSocietyId) {
      setFormError("Please select a society.");
      return;
    }

    if (!selectedRecipient) {
      setFormError("Please select the resident or society administrator you are visiting.");
      return;
    }

    if (!fullName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, "");
    if (cleanMobile.length < 7 || cleanMobile.length > 15) {
      setFormError("Please enter a valid mobile phone number.");
      return;
    }

    if (!purpose.trim()) {
      setFormError("Please specify the purpose of your visit.");
      return;
    }

    if (!expectedDate) {
      setFormError("Please select an expected visit date.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await visitorService.createOnlineVisit({
        societyId: selectedSocietyId,
        recipientId: selectedRecipient.id,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || undefined,
        visitorType,
        purpose: purpose.trim(),
        expectedDate,
        expectedTime: expectedTime || undefined,
        numberOfVisitors: numberOfVisitors || 1,
        vehicleNumber: vehicleNumber.trim() || undefined,
        photoUrl: photoUrl || undefined,
        notes: notes.trim() || undefined,
      });

      setSubmittedRequest(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit online visit request. Please try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSocietyObj = societies.find((s) => s.id === selectedSocietyId);

  // If successfully submitted, show Confirmation View
  if (submittedRequest) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={societyOneLogo} alt="SocietyOne" className="size-9 rounded-xl object-cover shadow-sm" />
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Society<span className="text-brand-orange">One</span>
              </span>
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <Home className="mr-1.5 size-4" />
                Home
              </Link>
            </Button>
          </div>
        </header>

        {/* Confirmation Container */}
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/30 bg-card p-6 shadow-2xl backdrop-blur-sm sm:p-10">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-3.5" />
                Online Visit Registered
              </span>

              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Visit Request Sent Successfully!
              </h1>

              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Your online visit request has been recorded in the society database. The host has been notified to review and approve your entry.
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="mt-8 space-y-3.5 rounded-2xl border border-border/70 bg-muted/30 p-5 text-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Reference ID</span>
                <span className="font-mono text-sm font-bold text-foreground">#{submittedRequest.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Visitor Name:</span>
                <span className="font-semibold text-foreground">{submittedRequest.visitor.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Host / Recipient:</span>
                <span className="font-semibold text-foreground">
                  {submittedRequest.resident.name}
                  {submittedRequest.flat?.number ? ` (Flat ${submittedRequest.flat.number})` : " (Society Management)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Society:</span>
                <span className="font-semibold text-foreground">{submittedRequest.society.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected Date & Time:</span>
                <span className="font-semibold text-foreground">
                  {submittedRequest.expectedDate} {submittedRequest.expectedTime ? `at ${submittedRequest.expectedTime}` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Purpose:</span>
                <span className="font-semibold text-foreground">{submittedRequest.purpose || "Visit"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Photo Attached:</span>
                <span className="font-semibold text-foreground">
                  {submittedRequest.photoUrl ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Yes (Verified)</span>
                  ) : (
                    <span className="text-muted-foreground">None (Photo was optional)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="size-3.5" /> Pending Host Review
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => {
                  setSubmittedRequest(null);
                  setPurpose("");
                  setNotes("");
                  setPhotoPreview(null);
                  setPhotoUrl(undefined);
                }}
                className="gap-2 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <RefreshCw className="size-4" />
                Register Another Visit
              </Button>

              <ShareModal
                triggerVariant="outline"
                triggerSize="default"
                shareText="I just registered an advance online visit on SocietyOne! You can pre-schedule your visit or check out SocietyOne here:"
              />

              <Button asChild variant="outline">
                <Link to="/">
                  <Home className="mr-1.5 size-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={societyOneLogo} alt="SocietyOne" className="size-9 rounded-xl object-cover shadow-sm" />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Society<span className="text-brand-orange">One</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShareModal
              triggerVariant="outline"
              triggerSize="sm"
              triggerClassName="h-9 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0"
              shareText="Schedule an advance online visit on SocietyOne without standing in gate queues:"
            />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              <Link to="/invite">
                Instant Visit (At Gate)
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0">
              <Link to="/">
                <ArrowLeft className="mr-1.5 size-3.5 sm:size-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Registration Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Hero Banner */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-info-soft px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue mb-3">
            <Globe className="size-3.5" />
            Public Online Registration • No Account Required
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Online Visitor Registration
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base leading-relaxed">
            Schedule your visit ahead of time. Select the residential flat or society administrator you wish to visit, enter your details, and submit for direct host approval.
          </p>
        </div>

        {/* Global Error Alert */}
        {formError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to submit request</p>
              <p className="text-xs text-destructive/90 mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 1: Society & Recipient Selection */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Select Society & Host to Visit</h2>
                <p className="text-xs text-muted-foreground">Choose the society and the person (Resident or Administration) you are visiting.</p>
              </div>
            </div>

            {/* Society Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Residential Society <span className="text-destructive">*</span>
              </Label>
              {loadingSocieties ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-brand-blue" />
                  Loading available societies...
                </div>
              ) : (
                <select
                  value={selectedSocietyId ?? ""}
                  onChange={(e) => setSelectedSocietyId(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.address ? `— ${s.address}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Recipient Filter & Search */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Person to Visit <span className="text-destructive">*</span>
                </Label>

                {/* Filter Pills */}
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("ALL")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      recipientFilter === "ALL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("RESIDENT")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      recipientFilter === "RESIDENT" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Residents (Flats)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientFilter("ADMIN")}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      recipientFilter === "ADMIN" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Society Management
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by resident name, flat number (e.g. 101), or admin..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Recipient List Box */}
              {loadingRecipients ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-8 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-brand-blue" />
                  Loading eligible residents and administrators...
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  No eligible hosts found matching your search.
                </div>
              ) : (
                <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredRecipients.map((r) => {
                    const isSelected = selectedRecipient?.id === r.id;
                    const isAdmin = r.role === "ADMIN";

                    return (
                      <div
                        key={`${r.role}-${r.id}`}
                        onClick={() => setSelectedRecipient(r)}
                        className={`group relative cursor-pointer rounded-2xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-brand-blue bg-info-soft/40 shadow-sm ring-2 ring-brand-blue/30"
                            : "border-border/70 bg-card hover:border-brand-blue/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold shadow-sm ${
                              isAdmin
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : "bg-brand-blue/10 text-brand-blue"
                            }`}
                          >
                            {isAdmin ? <Shield className="size-4" /> : <User className="size-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-blue">
                                {r.fullName}
                              </p>
                              {isSelected && <CheckCircle2 className="size-4 shrink-0 text-brand-blue" />}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {isAdmin ? (
                                <span className="inline-block rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                  Management / Admin
                                </span>
                              ) : (
                                <span className="inline-block rounded-md bg-brand-blue/10 px-2 py-0.5 text-[11px] font-bold text-brand-blue">
                                  Flat {r.flatNumber || "Assigned"} {r.buildingName ? `• ${r.buildingName}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected Host Preview Banner */}
              {selectedRecipient && (
                <div className="flex items-center justify-between rounded-xl border border-brand-blue/30 bg-info-soft/30 px-4 py-2.5 text-xs text-brand-blue">
                  <span className="font-medium">
                    Visiting: <strong className="font-bold text-foreground">{selectedRecipient.fullName}</strong>{" "}
                    ({selectedRecipient.role === "ADMIN" ? "Society Administration" : `Flat ${selectedRecipient.flatNumber || ""}`})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    className="font-semibold text-destructive hover:underline ml-2"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* STEP 2: Visitor Details */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Your Visitor Information</h2>
                <p className="text-xs text-muted-foreground">Enter your contact details so the host and security can verify your entry.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="visitorName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="visitorName"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visitorMobile" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mobile Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="visitorMobile"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="visitorEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address <span className="text-xs text-brand-blue font-normal">(For Welcome & Approval Alerts)</span>
                </Label>
                <Input
                  id="visitorEmail"
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Receive an instant registration welcome email and notification when approved.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visitor Category
                </Label>
                <select
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  {VISITOR_TYPES.map((vt) => (
                    <option key={vt.type} value={vt.type}>
                      {vt.icon} {vt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="numVisitors" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Number of Visitors
                </Label>
                <Input
                  id="numVisitors"
                  type="number"
                  min="1"
                  max="50"
                  value={numberOfVisitors}
                  onChange={(e) => setNumberOfVisitors(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehicleNum" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vehicle / Car Number <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="vehicleNum"
                  type="text"
                  placeholder="e.g. MH 02 AB 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* STEP 3: Optional Photo Upload (Flow A & Flow B) */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Identification Photo <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Upload an optional face photo to speed up verification at the security gate. You may submit without a photo.
                </p>
              </div>
            </div>

            {/* Photo Preview / Upload Area */}
            {photoPreview ? (
              <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm">
                  <img src={photoPreview} alt="Visitor Preview" className="h-full w-full object-cover" />
                  {photoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Loader2 className="size-6 animate-spin text-brand-blue" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Photo Ready</p>
                  <p className="text-xs text-muted-foreground">
                    {photoUploading ? "Uploading to secure storage..." : "Attached to your online visit request"}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition shadow-sm">
                      <UploadCloud className="size-3.5" />
                      Replace
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center transition hover:border-brand-blue/50 hover:bg-info-soft/20">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue mb-2">
                  <Camera className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-brand-blue hover:underline">Click to upload photo</span> (Optional)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports JPG, PNG, WebP up to 5MB
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </label>
            )}
          </section>

          {/* STEP 4: Schedule & Purpose */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Visit Schedule & Purpose</h2>
                <p className="text-xs text-muted-foreground">Specify the expected date, time, and reason for your visit.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expected Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expTime" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expected Time
                </Label>
                <Input
                  id="expTime"
                  type="time"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visitPurpose" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Purpose of Visit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitPurpose"
                type="text"
                placeholder="e.g. Birthday celebration / Meeting / Delivery / Package drop"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="additionalNotes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Additional Notes / Message for Host <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <textarea
                id="additionalNotes"
                rows={2}
                placeholder="Any special remarks or details for the host..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </section>

          {/* Submit Action */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button asChild variant="ghost" size="lg">
              <Link to="/">Cancel</Link>
            </Button>

            <Button
              type="submit"
              disabled={submitting || photoUploading}
              size="lg"
              className="gap-2 bg-brand-orange px-8 font-semibold text-white shadow-lg hover:bg-brand-orange/90 hover:shadow-xl transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting Online Request...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Submit Online Visit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
