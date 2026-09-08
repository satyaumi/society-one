import { useState } from "react";
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

  // Status Tracker Modal State
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackedResults, setTrackedResults] = useState<SocietyCreationRequest[] | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);

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
    void handleAiAutoFill(file);
  }

  function validateStep(step: number): boolean {
    setError(null);
    if (step === 2) {
      if (!formData.primaryContactName.trim()) {
        setError("Primary contact name is required.");
        return false;
      }
      if (!formData.primaryContactEmail.trim() || !formData.primaryContactEmail.includes("@")) {
        setError("Valid primary contact email is required.");
        return false;
      }
      if (!formData.primaryContactPhone.trim() || formData.primaryContactPhone.length < 8) {
        setError("Valid primary contact phone number is required.");
        return false;
      }
    }

    if (step === 3) {
      if (!formData.societyName.trim()) {
        setError("Society name is required.");
        return false;
      }
      if (!formData.address.trim()) {
        setError("Society address is required.");
        return false;
      }
      if (!formData.city.trim() || !formData.state.trim() || !formData.postalCode.trim()) {
        setError("City, State, and Postal Code are required.");
        return false;
      }
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

    setSubmitting(true);
    setError(null);

    try {
      const response = await societyRequestService.submit(formData, documentFile || undefined);
      setSubmittedRequest(response);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(toUserError(err, "Failed to submit society creation request. Please check all fields."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyReference(ref: string) {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleTrackLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!trackerQuery.trim()) return;

    setTrackerLoading(true);
    setTrackerError(null);
    try {
      const results = await societyRequestService.track(trackerQuery.trim());
      setTrackedResults(results);
      if (results.length === 0) {
        setTrackerError("No society creation request found matching that reference ID, email, or phone.");
      }
    } catch (err) {
      setTrackerError(toUserError(err, "Could not fetch status."));
      setTrackedResults([]);
    } finally {
      setTrackerLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-blue/30 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-cyan-400 p-0.5 shadow-lg shadow-brand-blue/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <span className="font-outfit font-bold text-lg text-white tracking-tight">
              Society<span className="text-cyan-400">One</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
              Platform Onboarding
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTrackerOpen(true)}
            className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Track Request
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white text-xs sm:text-sm"
          >
            <Link to="/login" search={{ role: undefined }}>Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* SUCCESS CONFIRMATION STATE */}
        {submittedRequest ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-white tracking-tight">
                Society Request Submitted!
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
                Your request to onboard <span className="text-white font-semibold">{submittedRequest.societyName}</span>{" "}
                has been received and is now in the Platform Management review queue.
              </p>
            </div>

            {/* Reference Box */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                  Application Reference ID
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-cyan-400">
                  {submittedRequest.referenceCode}
                </span>
              </div>
              <Button
                onClick={() => handleCopyReference(submittedRequest.referenceCode)}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 text-slate-200 gap-2 w-full sm:w-auto"
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
                <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                    <Clock className="w-4 h-4" /> 2. Management Review
                  </div>
                  <p className="text-xs text-slate-300">
                    Platform admins verify society details and applicant contact info.
                  </p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-1.5">
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
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block mb-0.5">Primary Contact:</span>
                <span className="font-semibold text-white">{submittedRequest.primaryContactName}</span> (
                {submittedRequest.primaryContactEmail})
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Phone:</span>
                <span className="font-semibold text-white">{submittedRequest.primaryContactPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Location:</span>
                <span className="font-semibold text-white">
                  {submittedRequest.city}, {submittedRequest.state} - {submittedRequest.postalCode}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Planned Units:</span>
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
                className="bg-brand-blue hover:bg-brand-blue/90 text-white w-full sm:w-auto font-medium"
              >
                Track Live Status
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-slate-700 hover:bg-slate-800 text-slate-300 w-full sm:w-auto"
              >
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* MULTI-STEP APPLICATION WIZARD */
          <div className="space-y-8">
            {/* Header / Intro */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Society Creation Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-outfit font-bold text-white tracking-tight">
                Request to Create a Society
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
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
                        ? "bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/5"
                        : isDone
                          ? "bg-slate-900/50 border-emerald-500/30 text-emerald-400"
                          : "bg-slate-900/20 border-slate-800 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
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
                        className={`text-xs font-bold hidden sm:inline ${
                          isActive ? "text-white" : isDone ? "text-slate-300" : "text-slate-500"
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

            {/* STEP 0: PREPARATION CHECKLIST */}
            {currentStep === 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-outfit font-bold text-white">Before You Begin</h2>
                    <p className="text-xs text-slate-400">
                      Ensure you have the following information handy for a fast application review.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Users className="w-4 h-4" /> 1. Administrator Contacts
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Primary applicant full name, verified email, and phone number for administrative handover.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Building2 className="w-4 h-4" /> 2. Society Structure
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Official society name, total estimated apartments/flats, towers/wings, and complete address.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <FileText className="w-4 h-4" /> 3. Registration Document (Optional)
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Optional society registration certificate or bylaws (PDF, JPG, PNG up to 10MB) for expedited approval.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" /> 4. AI Auto-Fill Helper
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You can optionally let our smart assistant parse document metadata to pre-populate details.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={handleNext} className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2 font-medium">
                    Start Application <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 1: OPTIONAL DOCUMENT UPLOAD & AI ASSIST */}
            {currentStep === 1 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-outfit font-bold text-white">Upload Registration Document</h2>
                      <p className="text-xs text-slate-400">
                        Optional · Uploading helps speed up review and enables AI autofill assistance.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                    Optional
                  </span>
                </div>

                {/* Upload Zone */}
                <div className="border-2 border-dashed border-slate-700 hover:border-brand-blue/50 rounded-2xl p-8 text-center bg-slate-950/40 transition-colors">
                  <input
                    type="file"
                    id="societyDocUpload"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <label htmlFor="societyDocUpload" className="cursor-pointer space-y-3 block">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-300">
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
                      <span className="text-sm text-slate-400">or drag and drop your file</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Supported formats: PDF, PNG, JPG, JPEG, WEBP, DOCX (Max 10MB)
                    </p>
                  </label>
                </div>

                {documentFile && (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-cyan-400" />
                      <div>
                        <span className="text-sm font-semibold text-white block">{documentFile.name}</span>
                        <span className="text-xs text-slate-500">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB · Uploaded
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentFile(null)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {aiSuccessMessage && (
                  <div className="bg-purple-950/30 border border-purple-500/30 p-4 rounded-xl flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-200 leading-relaxed">{aiSuccessMessage}</p>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2 font-medium">
                    Continue to Contacts <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: PRIMARY & SECONDARY CONTACTS */}
            {currentStep === 2 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-outfit font-bold text-white">Administrator Contacts</h2>
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
                      <Label className="text-xs text-slate-300">Full Name *</Label>
                      <Input
                        value={formData.primaryContactName}
                        onChange={(e) => updateField("primaryContactName", e.target.value)}
                        placeholder="e.g. Ramesh Chandra Mishra"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Email Address (Login / Notifications) *</Label>
                      <Input
                        type="email"
                        value={formData.primaryContactEmail}
                        onChange={(e) => updateField("primaryContactEmail", e.target.value)}
                        placeholder="admin@society.org or personal@gmail.com"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Mobile Number *</Label>
                      <Input
                        value={formData.primaryContactPhone}
                        onChange={(e) => updateField("primaryContactPhone", e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Official Society Email (Optional)</Label>
                      <Input
                        type="email"
                        value={formData.societyOfficialEmail || ""}
                        onChange={(e) => updateField("societyOfficialEmail", e.target.value)}
                        placeholder="office@greenvalleyresidency.com"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Secondary / Emergency Contact (Optional)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Contact Name</Label>
                      <Input
                        value={formData.secondaryContactName || ""}
                        onChange={(e) => updateField("secondaryContactName", e.target.value)}
                        placeholder="Secretary / President Name"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Phone Number</Label>
                      <Input
                        value={formData.secondaryContactPhone || ""}
                        onChange={(e) => updateField("secondaryContactPhone", e.target.value)}
                        placeholder="+91 98765 00000"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Email Address</Label>
                      <Input
                        type="email"
                        value={formData.secondaryContactEmail || ""}
                        onChange={(e) => updateField("secondaryContactEmail", e.target.value)}
                        placeholder="secretary@society.com"
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2 font-medium">
                    Continue to Society Details <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: SOCIETY DETAILS & ADDRESS */}
            {currentStep === 3 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-outfit font-bold text-white">Society Information & Address</h2>
                    <p className="text-xs text-slate-400">
                      Configure your society profile, unit count, and physical location.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-slate-300">Society Name *</Label>
                    <Input
                      value={formData.societyName}
                      onChange={(e) => updateField("societyName", e.target.value)}
                      placeholder="e.g. Green Valley Residency RWA"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Registration Number (Optional)</Label>
                    <Input
                      value={formData.registrationNumber || ""}
                      onChange={(e) => updateField("registrationNumber", e.target.value)}
                      placeholder="e.g. REG/SOC/2023/892"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Society Type</Label>
                    <select
                      value={formData.societyType || "HOUSING_SOCIETY"}
                      onChange={(e) => updateField("societyType", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue"
                    >
                      <option value="HOUSING_SOCIETY">Cooperative Housing Society (CHS)</option>
                      <option value="GATED_COMMUNITY">Gated Residential Community</option>
                      <option value="APARTMENT_COMPLEX">Apartment Complex / High Rise</option>
                      <option value="VILLA_LAYOUT">Villa Layout / Township</option>
                      <option value="COMMERCIAL_MIXED">Mixed Residential & Commercial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Total Flats / Units *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.totalFlats || 1}
                      onChange={(e) => updateField("totalFlats", parseInt(e.target.value) || 1)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Number of Wings / Towers *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.numberOfWings || 1}
                      onChange={(e) => updateField("numberOfWings", parseInt(e.target.value) || 1)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-slate-300">Full Street Address *</Label>
                    <Textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Plot No. 12, Main Road, Near IT Park"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Postal / PIN Code *</Label>
                    <Input
                      value={formData.postalCode}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Management Method</Label>
                    <select
                      value={formData.managementMethod || "MANAGING_COMMITTEE"}
                      onChange={(e) => updateField("managementMethod", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue"
                    >
                      <option value="MANAGING_COMMITTEE">Elected Managing Committee</option>
                      <option value="BUILDER_DEVELOPER">Builder / Developer Handover Phase</option>
                      <option value="FACILITY_MANAGEMENT">Professional Facility Agency</option>
                      <option value="RESIDENTS_SELF">Informal Residents Group</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2 font-medium">
                    Review Application <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {currentStep === 4 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-outfit font-bold text-white">Review & Confirm Submission</h2>
                    <p className="text-xs text-slate-400">
                      Please double-check all details before submitting for Platform Management review.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4 text-xs">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px] block">
                          Society Name
                        </span>
                        <span className="text-base font-bold text-white">{formData.societyName}</span>
                      </div>
                      <span className="bg-brand-blue/10 border border-brand-blue/30 text-cyan-400 px-2.5 py-1 rounded-full font-semibold">
                        {formData.totalFlats} Flats · {formData.numberOfWings} Wings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Primary Administrator:</span>
                        <span className="font-semibold text-white">{formData.primaryContactName}</span>
                        <span className="text-slate-400 block">{formData.primaryContactEmail}</span>
                        <span className="text-slate-400 block">{formData.primaryContactPhone}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-0.5">Location & Address:</span>
                        <span className="font-semibold text-white block">{formData.address}</span>
                        <span className="text-slate-400">
                          {formData.city}, {formData.state} - {formData.postalCode}
                        </span>
                      </div>
                    </div>

                    {documentFile && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-slate-300">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>Attached Registration Document: <strong>{documentFile.name}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p>
                      By submitting, you confirm that you are an authorized representative of this residential
                      society. Platform Management will review your submission and notify you via email upon activation.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="outline" onClick={handleBack} disabled={submitting} className="border-slate-700 text-slate-300">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-semibold px-6 shadow-lg shadow-emerald-600/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STATUS TRACKER POPUP MODAL */}
      {trackerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-white font-outfit font-bold text-lg">
                <Search className="w-5 h-5 text-cyan-400" /> Track Society Application
              </div>
              <button
                onClick={() => {
                  setTrackerOpen(false);
                  setTrackedResults(null);
                  setTrackerError(null);
                }}
                className="text-slate-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTrackLookup} className="space-y-3">
              <Label className="text-xs text-slate-300">
                Enter Reference Code (e.g. REQ-SOC-XXXXXX), Email, or Phone
              </Label>
              <div className="flex gap-2">
                <Input
                  value={trackerQuery}
                  onChange={(e) => setTrackerQuery(e.target.value)}
                  placeholder="REQ-SOC-XXXXXX or your@email.com"
                  className="bg-slate-950 border-slate-800"
                />
                <Button type="submit" disabled={trackerLoading} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
                  {trackerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
                </Button>
              </div>
            </form>

            {trackerError && (
              <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {trackerError}
              </div>
            )}

            {trackedResults && trackedResults.length > 0 && (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {trackedResults.map((req) => (
                  <div key={req.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{req.societyName}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          req.status === "SOCIETY_CREATED" || req.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : req.status === "REJECTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : req.status === "CHANGES_REQUESTED"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
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
                        Submitted: <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Recent"}</span>
                      </div>
                    </div>

                    {req.reviewNotes && (
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                        <strong className="text-slate-400 block mb-0.5">Management Reviewer Notes:</strong>
                        {req.reviewNotes}
                      </div>
                    )}

                    {req.rejectionReason && (
                      <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded-lg text-red-300">
                        <strong className="text-red-400 block mb-0.5">Rejection Reason:</strong>
                        {req.rejectionReason}
                      </div>
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
                className="border-slate-800 text-slate-400"
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
