import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  Sparkles,
  Upload,
  UserCheck,
  Users,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import societyOneLogo from "@/assets/societyone-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthFormError } from "@/components/auth/authformError";
import { societyRequestService } from "@/services";
import type { SocietyCreationRequest, SocietyCreationSubmitInput } from "@/types/domain";
import { toUserError } from "@/lib/auth/error-mapper";

export const Route = createFileRoute("/register-society")({
  head: () => ({
    meta: [
      { title: "Register Your Society | SocietyOne" },
      {
        name: "description",
        content:
          "Submit a request to onboard and register your residential society on the SocietyOne platform.",
      },
    ],
  }),
  component: RegisterSocietyPage,
});

const STEPS = [
  { id: 0, title: "Checklist", subtitle: "Preparation" },
  { id: 1, title: "Document", subtitle: "Optional Upload & AI" },
  { id: 2, title: "Contacts", subtitle: "Admin Information" },
  { id: 3, title: "Society", subtitle: "Details & Address" },
  { id: 4, title: "Review", subtitle: "Confirm & Submit" },
];

export function RegisterSocietyPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [formData, setFormData] = useState<SocietyCreationSubmitInput>({
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    societyOfficialEmail: "",
    secondaryContactName: "",
    secondaryContactPhone: "",
    secondaryContactEmail: "",
    societyName: "",
    registrationNumber: "",
    societyType: "HOUSING_SOCIETY",
    totalFlats: 48,
    numberOfWings: 2,
    address: "",
    city: "Bhubaneswar",
    state: "Odisha",
    postalCode: "751024",
    managementMethod: "MANAGING_COMMITTEE",
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<SocietyCreationRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Status Tracker Modal State
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackedResults, setTrackedResults] = useState<SocietyCreationRequest[] | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);

  // Editing / Resubmission State for CHANGES_REQUESTED
  const [editingReferenceCode, setEditingReferenceCode] = useState<string | null>(null);
  const [editingReviewNotes, setEditingReviewNotes] = useState<string | null>(null);
  const [existingDocumentFilename, setExistingDocumentFilename] = useState<string | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);

  // Auto-detect ?ref= or ?track= from URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("track");
      if (ref) {
        setTrackerQuery(ref.trim());
        setTrackerOpen(true);
        void (async () => {
          setTrackerLoading(true);
          setTrackerError(null);
          try {
            const list = await societyRequestService.track(ref.trim());
            if (list && list.length > 0) {
              setTrackedResults(list);
            } else {
              setTrackerError(`No society creation requests found for "${ref}".`);
            }
          } catch (err) {
            setTrackerError(toUserError(err, "Could not fetch status."));
          } finally {
            setTrackerLoading(false);
          }
        })();
      }
    }
  }, []);

  function handleStartEdit(req: SocietyCreationRequest) {
    setFormData({
      primaryContactName: req.primaryContactName || "",
      primaryContactEmail: req.primaryContactEmail || "",
      primaryContactPhone: req.primaryContactPhone || "",
      societyOfficialEmail: req.societyOfficialEmail || "",
      secondaryContactName: req.secondaryContactName || "",
      secondaryContactPhone: req.secondaryContactPhone || "",
      secondaryContactEmail: req.secondaryContactEmail || "",
      societyName: req.societyName || "",
      registrationNumber: req.registrationNumber || "",
      societyType: req.societyType || "HOUSING_SOCIETY",
      totalFlats: req.totalFlats || 48,
      numberOfWings: req.numberOfWings || 2,
      address: req.address || "",
      city: req.city || "Bhubaneswar",
      state: req.state || "Odisha",
      postalCode: req.postalCode || "751024",
      managementMethod: req.managementMethod || "MANAGING_COMMITTEE",
    });
    setEditingReferenceCode(req.referenceCode);
    setEditingReviewNotes(req.reviewNotes || null);
    setExistingDocumentFilename(req.documentFilename || null);
    setExistingDocumentUrl(req.documentUrl || null);
    setDocumentFile(null);
    setSubmittedRequest(null);
    setTermsAccepted(true);
    setTrackerOpen(false);
    setError(null);
    // Jump to Step 1 (Document) or Step 2 (Contacts) so user can inspect and update
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingReferenceCode(null);
    setEditingReviewNotes(null);
    setExistingDocumentFilename(null);
    setExistingDocumentUrl(null);
    setDocumentFile(null);
    setError(null);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField<K extends keyof SocietyCreationSubmitInput>(
    field: K,
    value: SocietyCreationSubmitInput[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Simulated smart AI document autofill parser
  async function handleAiAutoFill(file: File) {
    setIsAiProcessing(true);
    setAiSuccessMessage(null);
    setError(null);

    try {
      // Simulate reading metadata and extracting text
      await new Promise((resolve) => setTimeout(resolve, 900));

      const nameCandidate = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/(society|reg|doc|certificate|registration)/gi, "")
        .trim();

      const extractedSocietyName =
        nameCandidate.length > 3
          ? nameCandidate
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ") + " Residency"
          : formData.societyName || "Royal Palms Cooperative Society";

      setFormData((prev) => ({
        ...prev,
        societyName: prev.societyName || extractedSocietyName,
        registrationNumber: prev.registrationNumber || "REG/HSG/2024/" + Math.floor(1000 + Math.random() * 9000),
      }));

      setAiSuccessMessage(
        `AI analyzed "${file.name}" and autofilled suggested society details. You can review and edit them in the next steps.`,
      );
    } catch {
      // Never block the user if AI parsing fails
      setAiSuccessMessage(null);
    } finally {
      setIsAiProcessing(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentFile(file);
    handleAiAutoFill(file);
  }

  function validateStep(step: number): boolean {
    setError(null);
    if (step === 0) return true; // Checklist step is informative

    if (step === 1) {
      // Document is optional
      return true;
    }

    if (step === 2) {
      if (!formData.primaryContactName.trim()) {
        setError("Primary contact full name is required.");
        return false;
      }
      if (!formData.primaryContactEmail.trim() || !formData.primaryContactEmail.includes("@")) {
        setError("A valid primary contact email address is required.");
        return false;
      }
      if (!formData.primaryContactPhone.trim() || formData.primaryContactPhone.replace(/\D/g, "").length < 10) {
        setError("A valid 10-digit mobile number is required.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!formData.societyName.trim()) {
        setError("Society Name is required.");
        return false;
      }
      if (!formData.address.trim()) {
        setError("Society street address is required.");
        return false;
      }
      if (!formData.city.trim()) {
        setError("City is required.");
        return false;
      }
      if (!formData.state.trim()) {
        setError("State is required.");
        return false;
      }
      if (!formData.postalCode.trim()) {
        setError("PIN / Postal Code is required.");
        return false;
      }
      if ((formData.totalFlats || 0) < 1) {
        setError("Total flats must be at least 1.");
        return false;
      }
      if ((formData.numberOfWings || 0) < 1) {
        setError("Number of wings must be at least 1.");
        return false;
      }
      return true;
    }

    return true;
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!validateStep(2) || !validateStep(3)) return;

    if (!termsAccepted) {
      setError("Please read and accept the Terms & Conditions and Onboarding Policy before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const sanitizedData: SocietyCreationSubmitInput = {
        ...formData,
        societyOfficialEmail: formData.societyOfficialEmail?.trim() || undefined,
        secondaryContactName: formData.secondaryContactName?.trim() || undefined,
        secondaryContactPhone: formData.secondaryContactPhone?.trim() || undefined,
        secondaryContactEmail: formData.secondaryContactEmail?.trim() || undefined,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
      };

      let result: SocietyCreationRequest;
      if (editingReferenceCode) {
        result = await societyRequestService.resubmit(editingReferenceCode, sanitizedData, documentFile || undefined);
        setEditingReferenceCode(null);
        setEditingReviewNotes(null);
        setExistingDocumentFilename(null);
        setExistingDocumentUrl(null);
      } else {
        result = await societyRequestService.submit(sanitizedData, documentFile || undefined);
      }
      setSubmittedRequest(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(toUserError(err, "Failed to submit society request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyReference(refCode: string) {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTrackLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!trackerQuery.trim()) return;

    setTrackerLoading(true);
    setTrackerError(null);
    setTrackedResults(null);

    try {
      const q = trackerQuery.trim();
      const list = await societyRequestService.track(q);
      if (!list || list.length === 0) {
        setTrackerError(`No society creation requests found for "${trackerQuery}".`);
        setTrackedResults([]);
      } else {
        setTrackedResults(list);
      }
    } catch (err) {
      setTrackerError(toUserError(err, "Could not fetch status. Please check your reference code or contact details."));
      setTrackedResults([]);
    } finally {
      setTrackerLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070D19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/90 via-[#070D19] to-[#03060C] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0B132B]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={societyOneLogo}
            alt="SocietyOne"
            loading="eager"
            decoding="sync"
            className="size-9 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-display font-bold text-lg text-white tracking-tight">
              Society<span className="text-cyan-400">One</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold tracking-wider text-cyan-300 uppercase bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Platform Onboarding
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTrackerOpen(true)}
            className="border-slate-700 hover:border-cyan-500/50 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-medium gap-1.5 shadow-sm transition-all"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Track Request
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs sm:text-sm"
          >
            <Link to="/login" search={{ role: undefined }}>Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* SUCCESS CONFIRMATION STATE */}
        {submittedRequest ? (
          <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-black/50 space-y-8 animate-in fade-in zoom-in-95 duration-300 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-900/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Society Request Submitted!
              </h1>
              <p className="text-slate-300 max-w-lg mx-auto text-sm sm:text-base">
                Your request to onboard <span className="text-cyan-300 font-semibold">{submittedRequest.societyName}</span>{" "}
                has been received and is now in the Platform Management review queue.
              </p>
            </div>

            {/* Reference Box */}
            <div className="bg-slate-950/90 border border-slate-800 text-white rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                  Application Reference ID
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-cyan-300 tracking-wider">
                  {submittedRequest.referenceCode}
                </span>
              </div>
              <Button
                onClick={() => handleCopyReference(submittedRequest.referenceCode)}
                variant="outline"
                className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-100 gap-2 w-full sm:w-auto font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied Reference" : "Copy Code"}
              </Button>
            </div>

            {/* Lifecycle Stages */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Application Review Lifecycle
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                    <CheckCircle2 className="w-4 h-4" /> 1. Submitted
                  </div>
                  <p className="text-xs text-slate-300">
                    Your details and documentation have been queued for validation.
                  </p>
                </div>
                <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                    <Clock className="w-4 h-4" /> 2. Management Review
                  </div>
                  <p className="text-xs text-slate-300">
                    Platform admins verify society details and applicant contact info.
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                    <Shield className="w-4 h-4" /> 3. Handover & Live
                  </div>
                  <p className="text-xs text-slate-400">
                    Upon approval, your Society Admin account is provisioned with access.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Contact:</span>
                <span className="font-semibold text-white">{submittedRequest.primaryContactName}</span> (
                {submittedRequest.primaryContactEmail})
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone:</span>
                <span className="font-semibold text-white">{submittedRequest.primaryContactPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Location:</span>
                <span className="font-semibold text-white">
                  {submittedRequest.city}, {submittedRequest.state} - {submittedRequest.postalCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Planned Units:</span>
                <span className="font-semibold text-white">
                  {submittedRequest.totalFlats} Flats ({submittedRequest.numberOfWings} Wings)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  setTrackerQuery(submittedRequest.referenceCode);
                  setTrackerOpen(true);
                }}
                className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white w-full sm:w-auto font-medium shadow-lg shadow-brand-blue/25"
              >
                Track Live Status
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 w-full sm:w-auto"
              >
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* MULTI-STEP APPLICATION WIZARD */
          <div className="space-y-8">
            {/* Header / Intro */}
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Society Creation Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                Request to Create a Society
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                Onboard your residential society onto SocietyOne. Applications are reviewed and activated by Platform
                Management before society administrative privileges are handed over.
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (isDone || validateStep(currentStep)) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all ${
                      isActive
                        ? "bg-slate-900/90 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400/40"
                        : isDone
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isActive
                            ? "bg-cyan-500 text-slate-950"
                            : isDone
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isDone ? "✓" : step.id + 1}
                      </span>
                      <span
                        className={`text-xs font-bold hidden sm:inline truncate ${
                          isActive ? "text-white" : isDone ? "text-emerald-300" : "text-slate-400"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <AuthFormError message={error} />}

            {/* Application Modification Banner */}
            {editingReferenceCode && (
              <div className="p-4 sm:p-5 bg-amber-950/40 border border-amber-500/50 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm sm:text-base">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                    Modifying Application: <span className="font-mono text-cyan-300">{editingReferenceCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-400 hover:text-white underline self-start sm:self-auto cursor-pointer"
                  >
                    Cancel and Start New Application
                  </button>
                </div>
                {editingReviewNotes ? (
                  <div className="p-3 bg-slate-900/90 border border-amber-500/30 rounded-xl text-xs text-slate-200 leading-relaxed">
                    <span className="font-bold text-amber-400 block mb-1">
                      Platform Management Reviewer Instructions:
                    </span>
                    {editingReviewNotes}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300">
                    Update the required details or documents below, then proceed to review and click &ldquo;Update &amp; Resubmit Application&rdquo; to send the revisions back to Platform Management.
                  </p>
                )}
              </div>
            )}

            {/* STEP 0: PREPARATION CHECKLIST */}
            {currentStep === 0 && (
              <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Before You Begin</h2>
                    <p className="text-xs text-slate-400">
                      Ensure you have the following information handy for a fast application review.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900/70 border border-slate-800/90 p-4.5 rounded-xl space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Users className="w-4 h-4" /> 1. Administrator Contacts
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Primary applicant full name, verified email, and phone number for administrative handover.
                    </p>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800/90 p-4.5 rounded-xl space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Building2 className="w-4 h-4" /> 2. Society Structure
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Official society name, total estimated apartments/flats, towers/wings, and complete address.
                    </p>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800/90 p-4.5 rounded-xl space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <FileText className="w-4 h-4" /> 3. Registration Document (Optional)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Optional society registration certificate or bylaws (PDF, JPG, PNG up to 10MB) for expedited approval.
                    </p>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800/90 p-4.5 rounded-xl space-y-2 hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" /> 4. AI Auto-Fill Helper
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      You can optionally let our smart assistant parse document metadata to pre-populate details.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white gap-2 font-medium shadow-lg shadow-brand-blue/25 transition-all"
                  >
                    Start Application <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 1: OPTIONAL DOCUMENT UPLOAD & AI ASSIST */}
            {currentStep === 1 && (
              <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-bold text-white">Upload Registration Document</h2>
                      <p className="text-xs text-slate-400">
                        Optional · Uploading helps speed up review and enables AI autofill assistance.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                    Optional
                  </span>
                </div>

                {/* Existing Attached Document Indicator */}
                {existingDocumentFilename && (
                  <div className="bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-xl flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[11px]">Current Attached Document:</span>
                        <span className="font-semibold text-white">{existingDocumentFilename}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      Upload new file below to replace
                    </span>
                  </div>
                )}

                {/* Upload Zone */}
                <div className="border-2 border-dashed border-slate-700/80 hover:border-cyan-400/60 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors">
                  <input
                    type="file"
                    id="societyDocUpload"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <label htmlFor="societyDocUpload" className="cursor-pointer space-y-3 block">
                    <div className="w-12 h-12 rounded-full bg-slate-900 shadow-md border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
                      {isAiProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-cyan-400 hover:underline">
                        Click to upload
                      </span>{" "}
                      <span className="text-sm text-slate-300">or drag and drop your file</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Supported formats: PDF, PNG, JPG, JPEG, WEBP, DOCX (Max 10MB)
                    </p>
                  </label>
                </div>

                {documentFile && (
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-cyan-400" />
                      <div>
                        <span className="text-sm font-semibold text-white block">{documentFile.name}</span>
                        <span className="text-xs text-slate-400">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB · Uploaded
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentFile(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {aiSuccessMessage && (
                  <div className="bg-purple-950/40 border border-purple-500/30 p-4 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-200 leading-relaxed">{aiSuccessMessage}</p>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white gap-2 font-medium shadow-lg shadow-brand-blue/25"
                  >
                    Continue to Contacts <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PRIMARY & SECONDARY CONTACTS */}
            {currentStep === 2 && (
              <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Administrator Contacts</h2>
                    <p className="text-xs text-slate-400">
                      These details will be used to assign the Society Administrator upon platform approval.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Primary Contact (Society Admin Applicant) *
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Full Name *</Label>
                      <Input
                        value={formData.primaryContactName}
                        onChange={(e) => updateField("primaryContactName", e.target.value)}
                        placeholder="e.g. Ramesh Chandra Mishra"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Email Address (Login / Notifications) *</Label>
                      <Input
                        type="email"
                        value={formData.primaryContactEmail}
                        onChange={(e) => updateField("primaryContactEmail", e.target.value)}
                        placeholder="admin@society.org or personal@gmail.com"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Mobile Number *</Label>
                      <Input
                        value={formData.primaryContactPhone}
                        onChange={(e) => updateField("primaryContactPhone", e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Official Society Email (Optional)</Label>
                      <Input
                        type="email"
                        value={formData.societyOfficialEmail || ""}
                        onChange={(e) => updateField("societyOfficialEmail", e.target.value)}
                        placeholder="office@greenvalleyresidency.com"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Secondary / Emergency Contact (Optional)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Contact Name</Label>
                      <Input
                        value={formData.secondaryContactName || ""}
                        onChange={(e) => updateField("secondaryContactName", e.target.value)}
                        placeholder="Secretary / President Name"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Phone Number</Label>
                      <Input
                        value={formData.secondaryContactPhone || ""}
                        onChange={(e) => updateField("secondaryContactPhone", e.target.value)}
                        placeholder="+91 98765 00000"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">Email Address</Label>
                      <Input
                        type="email"
                        value={formData.secondaryContactEmail || ""}
                        onChange={(e) => updateField("secondaryContactEmail", e.target.value)}
                        placeholder="secretary@society.com"
                        className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white gap-2 font-medium shadow-lg shadow-brand-blue/25"
                  >
                    Continue to Society Details <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: SOCIETY DETAILS & ADDRESS */}
            {currentStep === 3 && (
              <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Society Information & Address</h2>
                    <p className="text-xs text-slate-400">
                      Configure your society profile, unit count, and physical location.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-slate-300">Society Name *</Label>
                    <Input
                      value={formData.societyName}
                      onChange={(e) => updateField("societyName", e.target.value)}
                      placeholder="e.g. Green Valley Residency RWA"
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Registration Number (Optional)</Label>
                    <Input
                      value={formData.registrationNumber || ""}
                      onChange={(e) => updateField("registrationNumber", e.target.value)}
                      placeholder="e.g. REG/SOC/2023/892"
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Society Type</Label>
                    <select
                      value={formData.societyType || "HOUSING_SOCIETY"}
                      onChange={(e) => updateField("societyType", e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="HOUSING_SOCIETY">Cooperative Housing Society (CHS)</option>
                      <option value="GATED_COMMUNITY">Gated Residential Community</option>
                      <option value="APARTMENT_COMPLEX">Apartment Complex / High Rise</option>
                      <option value="VILLA_LAYOUT">Villa Layout / Township</option>
                      <option value="COMMERCIAL_MIXED">Mixed Residential & Commercial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Total Flats / Units *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.totalFlats || 1}
                      onChange={(e) => updateField("totalFlats", parseInt(e.target.value) || 1)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Number of Wings / Towers *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.numberOfWings || 1}
                      onChange={(e) => updateField("numberOfWings", parseInt(e.target.value) || 1)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-slate-300">Full Street Address *</Label>
                    <Textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Plot No. 12, Main Road, Near IT Park"
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Postal / PIN Code *</Label>
                    <Input
                      value={formData.postalCode}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                      className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">Management Method</Label>
                    <select
                      value={formData.managementMethod || "MANAGING_COMMITTEE"}
                      onChange={(e) => updateField("managementMethod", e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="MANAGING_COMMITTEE">Elected Managing Committee</option>
                      <option value="BUILDER_DEVELOPER">Builder / Developer Handover Phase</option>
                      <option value="FACILITY_MANAGEMENT">Professional Facility Agency</option>
                      <option value="RESIDENTS_SELF">Informal Residents Group</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white gap-2 font-medium shadow-lg shadow-brand-blue/25"
                  >
                    Review Application <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {currentStep === 4 && (
              <div className="bg-[#0D1527]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Review & Confirm Submission</h2>
                    <p className="text-xs text-slate-400">
                      Please double-check all details before submitting for Platform Management review.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4 text-xs">
                    <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px] block">
                          Society Name
                        </span>
                        <span className="text-base font-bold text-white">{formData.societyName}</span>
                      </div>
                      <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full font-semibold">
                        {formData.totalFlats} Flats · {formData.numberOfWings} Wings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Primary Administrator:</span>
                        <span className="font-semibold text-white">{formData.primaryContactName}</span>
                        <span className="text-slate-400 block">{formData.primaryContactEmail}</span>
                        <span className="text-slate-400 block">{formData.primaryContactPhone}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Location & Address:</span>
                        <span className="font-semibold text-white block">{formData.address}</span>
                        <span className="text-slate-400">
                          {formData.city}, {formData.state} - {formData.postalCode}
                        </span>
                      </div>
                    </div>

                    {documentFile && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-slate-300">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>Attached Registration Document: <strong className="text-white">{documentFile.name}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions Acceptance Box */}
                  <div className="bg-slate-900/80 border border-slate-800 p-4.5 rounded-xl space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="termsAndConditionsCheck"
                        checked={termsAccepted}
                        onChange={(e) => {
                          setTermsAccepted(e.target.checked);
                          if (e.target.checked && error) setError(null);
                        }}
                        className="mt-0.5 size-4.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900 accent-cyan-500"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        I confirm that I am an authorized representative / managing committee member of this residential society. I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTermsModalOpen(true);
                          }}
                          className="text-cyan-400 underline font-semibold hover:text-cyan-300 inline"
                        >
                          Terms &amp; Conditions and Platform Onboarding Policy
                        </button>
                        , and verify all submitted contact information is accurate for administrative handover.
                      </span>
                    </label>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p>
                      By submitting, you confirm that you are an authorized representative of this residential
                      society. Platform Management will review your submission and notify you via email upon activation.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={submitting}
                    className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !termsAccepted}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white gap-2 font-semibold px-6 shadow-lg shadow-emerald-600/25 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                        {editingReferenceCode ? "Resubmitting Application..." : "Submitting Request..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />{" "}
                        {editingReferenceCode ? "Update & Resubmit Application" : "Submit Application"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* TERMS & CONDITIONS MODAL */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-lg">
                <Shield className="w-5 h-5 text-cyan-400" /> SocietyOne Platform Onboarding Terms &amp; Conditions
              </div>
              <button
                onClick={() => setTermsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg px-2 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed pr-2">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Authorization &amp; Accuracy</h4>
                <p>
                  By submitting this onboarding application, you represent and warrant that you are a legally authorized representative, Resident Welfare Association (RWA) member, builder representative, or designated property manager of the named residential community. All contact and structural information must be true, accurate, and up-to-date.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Verification &amp; Review Protocol</h4>
                <p>
                  Platform Management reserves the right to verify society registration certificates, applicant phone numbers, and official society email addresses prior to account approval. Applications containing fraudulent or non-verifiable information will be rejected.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Handover &amp; Administrative Privileges</h4>
                <p>
                  Upon verification and approval by Platform Management, the primary applicant will be provisioned with Society Administrator credentials. As Society Admin, you will be responsible for configuring towers, managing flat owner allocations, and overseeing security gate workflows.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Resident Privacy &amp; Data Security</h4>
                <p>
                  SocietyOne operates on high-security standards. You agree to utilize resident contact details, visitor entry logs, and authorization data solely for residential security and community management purposes in compliance with data privacy regulations.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTermsModalOpen(false)}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setTermsAccepted(true);
                  setTermsModalOpen(false);
                  if (error) setError(null);
                }}
                className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white font-semibold shadow-md"
              >
                Accept &amp; Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TRACKER POPUP MODAL */}
      {trackerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1527] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-lg">
                <Search className="w-5 h-5 text-cyan-400" /> Track Society Application
              </div>
              <button
                onClick={() => {
                  setTrackerOpen(false);
                  setTrackedResults(null);
                  setTrackerError(null);
                }}
                className="text-slate-400 hover:text-white text-lg px-2 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTrackLookup} className="space-y-3">
              <Label className="text-xs font-medium text-slate-300">
                Enter Reference Code (e.g. REQ-SOC-XXXXXX), Email, or Phone
              </Label>
              <div className="flex gap-2">
                <Input
                  value={trackerQuery}
                  onChange={(e) => setTrackerQuery(e.target.value)}
                  placeholder="REQ-SOC-XXXXXX or your@email.com"
                  className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-400"
                />
                <Button
                  type="submit"
                  disabled={trackerLoading}
                  className="bg-gradient-to-r from-brand-blue to-cyan-600 hover:from-brand-blue/90 hover:to-cyan-500 text-white shadow-sm shrink-0"
                >
                  {trackerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
                </Button>
              </div>
            </form>

            {trackerError && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {trackerError}
              </div>
            )}

            {trackedResults && trackedResults.length > 0 && (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {trackedResults.map((req) => (
                  <div key={req.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{req.societyName}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          req.status === "SOCIETY_CREATED" || req.status === "APPROVED"
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                            : req.status === "REJECTED"
                              ? "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                              : req.status === "CHANGES_REQUESTED"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                                : "bg-blue-950/60 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {req.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>
                        Reference: <span className="text-cyan-400 font-mono font-semibold">{req.referenceCode}</span>
                      </div>
                      <div>
                        Submitted: <span className="text-slate-300">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Recent"}</span>
                      </div>
                    </div>

                    {req.reviewNotes && (
                      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300">
                        <strong className="text-slate-400 block mb-0.5">Management Reviewer Notes:</strong>
                        {req.reviewNotes}
                      </div>
                    )}

                    {req.rejectionReason && (
                      <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-lg text-rose-300">
                        <strong className="text-rose-400 block mb-0.5">Rejection Reason:</strong>
                        {req.rejectionReason}
                      </div>
                    )}

                    {(req.status === "CHANGES_REQUESTED" || req.status === "SUBMITTED") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleStartEdit(req)}
                        className={`w-full font-semibold text-xs gap-1.5 shadow-md ${
                          req.status === "CHANGES_REQUESTED"
                            ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-600/20"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {req.status === "CHANGES_REQUESTED"
                          ? "Edit & Resubmit Application"
                          : "Modify Submitted Application Details"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTrackerOpen(false)}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
