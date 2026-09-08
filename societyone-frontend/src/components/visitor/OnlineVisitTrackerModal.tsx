import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  RefreshCw,
  Loader2,
  Activity,
} from "lucide-react";
import { visitorService } from "@/services";
import type { VisitRequest } from "@/types/domain";

interface OnlineVisitTrackerModalProps {
  initialRequestId?: number | string;
  initialMobile?: string;
  triggerButton?: React.ReactNode;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OnlineVisitTrackerModal({
  initialRequestId,
  initialMobile,
  triggerButton,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: OnlineVisitTrackerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [searchMode, setSearchMode] = useState<"id" | "mobile" | "email">("id");
  const [requestIdInput, setRequestIdInput] = useState(initialRequestId ? String(initialRequestId) : "");
  const [mobileInput, setMobileInput] = useState(initialMobile || "");
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VisitRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-search if initialRequestId or initialMobile provided
  useEffect(() => {
    if (open && initialRequestId) {
      setRequestIdInput(String(initialRequestId));
      setSearchMode("id");
      void handleSearch(String(initialRequestId), undefined, undefined);
    } else if (open && initialMobile) {
      setMobileInput(initialMobile);
      setSearchMode("mobile");
      void handleSearch(undefined, initialMobile, undefined);
    }
  }, [open, initialRequestId, initialMobile]);

  // Live polling if autoRefresh is active and selectedRequest is in pending/expected state
  useEffect(() => {
    if (!open || !autoRefresh || !selectedRequest) return;
    if (
      selectedRequest.requestStatus !== "PENDING_RESIDENT" &&
      selectedRequest.visitStatus !== "EXPECTED" &&
      selectedRequest.visitStatus !== "WAITING_AT_GATE"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await visitorService.getOnlineVisitStatus(selectedRequest.id);
        setSelectedRequest(updated);
      } catch {
        // Silently ignore polling transient network errors
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [open, autoRefresh, selectedRequest]);

  async function handleSearch(overrideId?: string, overrideMobile?: string, overrideEmail?: string) {
    const idToSearch = overrideId !== undefined ? overrideId : requestIdInput.trim();
    const mobileToSearch = overrideMobile !== undefined ? overrideMobile : mobileInput.trim();
    const emailToSearch = overrideEmail !== undefined ? overrideEmail : emailInput.trim();

    setError(null);
    setLoading(true);

    try {
      let list: VisitRequest[] = [];

      if (searchMode === "id" || idToSearch) {
        const cleanId = idToSearch.replace("#", "").trim();
        if (!cleanId || isNaN(Number(cleanId))) {
          setError("Please enter a valid numeric Request Reference ID.");
          setLoading(false);
          return;
        }
        const single = await visitorService.getOnlineVisitStatus(Number(cleanId));
        list = single ? [single] : [];
      } else if (searchMode === "mobile" || mobileToSearch) {
        if (!mobileToSearch || mobileToSearch.length < 5) {
          setError("Please enter a valid mobile number.");
          setLoading(false);
          return;
        }
        list = await visitorService.trackOnlineVisits({ mobileNumber: mobileToSearch });
      } else if (searchMode === "email" || emailToSearch) {
        if (!emailToSearch || !emailToSearch.includes("@")) {
          setError("Please enter a valid email address.");
          setLoading(false);
          return;
        }
        list = await visitorService.trackOnlineVisits({ email: emailToSearch });
      }

      setResults(list);
      if (list.length === 0) {
        setError("No online visit requests found matching your query. Please check your reference ID or mobile number.");
        setSelectedRequest(null);
      } else {
        setSelectedRequest(list[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve online visit status.";
      setError(msg);
      setResults([]);
      setSelectedRequest(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentRequest() {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const updated = await visitorService.getOnlineVisitStatus(selectedRequest.id);
      setSelectedRequest(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh status.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isApproved = selectedRequest?.requestStatus === "APPROVED_BY_RESIDENT";
  const isRejected =
    selectedRequest?.requestStatus === "REJECTED_BY_RESIDENT" ||
    selectedRequest?.requestStatus === "DENIED_BY_RESIDENT" ||
    selectedRequest?.requestStatus === "CANCELLED";
  const isCheckedIn = selectedRequest?.visitStatus === "CHECKED_IN";
  const isCheckedOut = selectedRequest?.visitStatus === "CHECKED_OUT";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={`gap-1.5 font-medium transition-all duration-200 hover:-translate-y-0.5 ${triggerClassName || ""}`}
          >
            <Activity className="size-4 text-brand-blue" />
            <span>Track Visit</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-2xl rounded-3xl border-border bg-card p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
              <Activity className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg sm:text-xl font-bold text-foreground">
                Track Online Visit Status
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                View real-time activity and approval progress for your advance online visitor registration.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Filter Controls */}
        <div className="mt-4 space-y-3">
          {/* Mode Selector Tabs */}
          <div className="flex items-center rounded-xl bg-muted/50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setSearchMode("id");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                searchMode === "id"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Request ID
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("mobile");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                searchMode === "mobile"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mobile Number
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("email");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${
                searchMode === "email"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Visitor Email
            </button>
          </div>

          {/* Search Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch();
            }}
            className="flex items-center gap-2"
          >
            {searchMode === "id" && (
              <Input
                type="text"
                placeholder="Enter Reference # (e.g. 20)"
                value={requestIdInput}
                onChange={(e) => setRequestIdInput(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            )}
            {searchMode === "mobile" && (
              <Input
                type="tel"
                placeholder="Enter Visitor Mobile (e.g. 9876543210)"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            )}
            {searchMode === "email" && (
              <Input
                type="email"
                placeholder="Enter Visitor Email (e.g. visitor@gmail.com)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="h-10 text-sm font-medium"
              />
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 shrink-0 gap-1.5 bg-brand-blue text-white hover:bg-brand-blue/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span>Track</span>
            </Button>
          </form>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Multi-result selector if searched by mobile/email */}
        {results.length > 1 && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Visit Request ({results.length} found):
            </Label>
            <div className="flex flex-wrap gap-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRequest(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    selectedRequest?.id === r.id
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  #{r.id} • {r.society?.name || "Society"} ({r.expectedDate})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Request Detail & Live Timeline */}
        {selectedRequest && (
          <div className="mt-5 space-y-5">
            {/* Top Status Header Card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    Request #{selectedRequest.id}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedRequest.society?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void refreshCurrentRequest()}
                    disabled={loading}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Host & Destination Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Visitor Name:</span>
                  <p className="font-semibold text-foreground">{selectedRequest.visitor?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Host / Recipient:</span>
                  <p className="font-semibold text-foreground">
                    {selectedRequest.resident?.name} ({selectedRequest.flat?.number ? `Flat ${selectedRequest.flat.number}` : "Office / Admin"})
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <p className="font-semibold text-foreground">
                    {selectedRequest.expectedDate} {selectedRequest.expectedTime ? `at ${selectedRequest.expectedTime}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Purpose:</span>
                  <p className="font-semibold text-foreground">{selectedRequest.purpose || "Personal Visit"}</p>
                </div>
              </div>
            </div>

            {/* Real-time Progress Stepper / Activity Flow */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Activity & Clearance Workflow
              </h4>

              <div className="space-y-3">
                {/* STAGE 1: Online Registration Submission */}
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                    ✓
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">1. Registration Form Submitted</p>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Your online registration was recorded in the society database and routed to {selectedRequest.resident?.name}.
                    </p>
                  </div>
                </div>

                {/* STAGE 2: Host Review (Resident / Admin) */}
                <div
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    isApproved
                      ? "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : isRejected
                      ? "border-destructive/30 bg-destructive/10"
                      : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20"
                  }`}
                >
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg font-bold text-xs shadow-xs ${
                      isApproved
                        ? "bg-emerald-600 text-white"
                        : isRejected
                        ? "bg-destructive text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {isApproved ? "✓" : isRejected ? "✕" : "2"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">
                        2. Host Review ({selectedRequest.resident?.name})
                      </p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isApproved
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isRejected
                            ? "text-destructive"
                            : "text-amber-600 dark:text-amber-400 animate-pulse"
                        }`}
                      >
                        {isApproved ? "Approved by Host" : isRejected ? "Declined by Host" : "Pending Approval"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isApproved
                        ? `The host has approved your visit. Pre-clearance has been transmitted to gate security.`
                        : isRejected
                        ? `The host was unable to approve this visit request.`
                        : `Waiting for ${selectedRequest.resident?.name} to approve your visit. A confirmation email will also be sent to your inbox upon approval.`}
                    </p>
                  </div>
                </div>

                {/* STAGE 3: Security Gate Clearance */}
                <div
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                    isCheckedIn || isCheckedOut
                      ? "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : isApproved
                      ? "border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20"
                      : "border-border/60 bg-muted/10 opacity-70"
                  }`}
                >
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg font-bold text-xs shadow-xs ${
                      isCheckedIn || isCheckedOut
                        ? "bg-emerald-600 text-white"
                        : isApproved
                        ? "bg-brand-blue text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCheckedIn || isCheckedOut ? "✓" : "3"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">3. Security Gate Clearance</p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isCheckedIn
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isCheckedOut
                            ? "text-muted-foreground"
                            : isApproved
                            ? "text-brand-blue"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isCheckedIn
                          ? "Admitted Inside"
                          : isCheckedOut
                          ? "Visit Concluded"
                          : isApproved
                          ? "Ready at Gate"
                          : "Awaiting Host Approval"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isCheckedIn
                        ? "Security has verified your pass and admitted you into the society."
                        : isCheckedOut
                        ? "Visit concluded and departure recorded."
                        : isApproved
                        ? `When you arrive at the gate, provide your Mobile Number (${selectedRequest.visitor?.mobile || ""}) or Request #${selectedRequest.id} to the security officer for instant check-in.`
                        : "Gate security will activate fast-pass admission once the host approves."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Live Auto-polling helper */}
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-3.5 py-2.5 text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-input text-brand-blue focus:ring-brand-blue"
                />
                <span>Auto-refresh status every 8 seconds</span>
              </label>

              {autoRefresh && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Syncing
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
