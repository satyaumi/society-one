import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Users,
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  UserCheck,
  ExternalLink,
  Check,
  X,
  Send,
  Layers,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Eye,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppShell, LoadingState, PageIntro } from "@/components/societyone";
import { platformService, societyRequestService } from "@/services";
import { requireRole } from "@/lib/auth/require-auth";
import type {
  AuditEvent,
  PlatformKPIs,
  PlatformSocietyDirectoryItem,
  SocietyCreationRequest,
  SocietyRequestStatus,
} from "@/types/domain";

export const Route = createFileRoute("/platform")({
  beforeLoad: () => requireRole(["PLATFORM_ADMIN"]),
  head: () => ({
    meta: [
      { title: "Platform Management | SocietyOne" },
      {
        name: "description",
        content: "Platform-level administration, society creation approvals, and multi-tenant management.",
      },
    ],
  }),
  component: PlatformManagementPage,
});

type ActiveTab = "requests" | "societies" | "audit";

function PlatformManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("requests");
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [requests, setRequests] = useState<SocietyCreationRequest[]>([]);
  const [societies, setSocieties] = useState<PlatformSocietyDirectoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Request Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [requestSearch, setRequestSearch] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<SocietyCreationRequest | null>(null);

  // Action Modals
  const [actionModal, setActionModal] = useState<{
    type: "REVIEW" | "CHANGES" | "REJECT" | "APPROVE" | null;
    request: SocietyCreationRequest | null;
  }>({ type: null, request: null });

  const [notesInput, setNotesInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Society Handover Modal
  const [handoverModal, setHandoverModal] = useState<{
    open: boolean;
    society: PlatformSocietyDirectoryItem | null;
  }>({ open: false, society: null });
  const [newAdminUserId, setNewAdminUserId] = useState<string>("");
  const [handoverReason, setHandoverReason] = useState<string>("");
  const [handoverLoading, setHandoverLoading] = useState(false);

  // Society Search
  const [societySearch, setSocietySearch] = useState<string>("");

  // Load all platform data
  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [kpiData, reqData, socData, auditData] = await Promise.all([
        platformService.getKpis().catch(() => null),
        societyRequestService.list().catch(() => []),
        platformService.getSocieties().catch(() => []),
        platformService.getAudit(40).catch(() => []),
      ]);

      setKpis(kpiData);
      setRequests(reqData);
      setSocieties(socData);
      setAuditLogs(auditData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;
      const q = requestSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.societyName.toLowerCase().includes(q) ||
        (r.referenceCode && r.referenceCode.toLowerCase().includes(q)) ||
        r.primaryContactName.toLowerCase().includes(q) ||
        r.primaryContactEmail.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, requestSearch]);

  // Filtered societies
  const filteredSocieties = useMemo(() => {
    return societies.filter((s) => {
      const q = societySearch.toLowerCase().trim();
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.adminFullName && s.adminFullName.toLowerCase().includes(q)) ||
        (s.adminEmail && s.adminEmail.toLowerCase().includes(q))
      );
    });
  }, [societies, societySearch]);

  // Status Badge Helper
  const renderStatusBadge = (status: SocietyRequestStatus) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">New Submission</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Under Review</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">Changes Requested</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Approved</Badge>;
      case "SOCIETY_CREATED":
        return <Badge className="bg-green-600/15 text-green-700 dark:text-green-300 border-green-600/30">Society Active</Badge>;
      case "ADMIN_ASSIGNED":
        return <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">Admin Assigned</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Perform review action
  async function handleReviewAction() {
    if (!actionModal.request || !actionModal.type) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const reqId = actionModal.request.id;

    try {
      if (actionModal.type === "REVIEW") {
        const updated = await societyRequestService.markUnderReview(reqId, notesInput);
        setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
        setSuccess(`Application ${updated.referenceCode || reqId} is now Under Review.`);
      } else if (actionModal.type === "CHANGES") {
        if (!notesInput.trim()) {
          setError("Please provide clear notes explaining the requested changes.");
          setActionLoading(false);
          return;
        }
        const updated = await societyRequestService.requestChanges(reqId, notesInput.trim());
        setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
        setSuccess(`Requested changes for ${updated.referenceCode || reqId}. Applicant has been notified.`);
      } else if (actionModal.type === "REJECT") {
        if (!notesInput.trim()) {
          setError("Please state a clear reason for rejecting this application.");
          setActionLoading(false);
          return;
        }
        const updated = await societyRequestService.reject(reqId, notesInput.trim());
        setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
        setSuccess(`Application ${updated.referenceCode || reqId} has been rejected.`);
      } else if (actionModal.type === "APPROVE") {
        const updated = await societyRequestService.approveAndCreate(reqId, {
          notes: notesInput.trim() || undefined,
        });
        setRequests((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
        setSuccess(`Successfully approved! Society "${updated.societyName}" created and applicant handed over administrative access.`);
        // Reload societies directory and KPIs
        void loadData(true);
      }

      setActionModal({ type: null, request: null });
      setNotesInput("");
      if (selectedRequest && selectedRequest.id === reqId) {
        setSelectedRequest(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute action.");
    } finally {
      setActionLoading(false);
    }
  }

  // Perform admin handover
  async function handleAdminHandover() {
    if (!handoverModal.society || !newAdminUserId) return;
    setHandoverLoading(true);
    setError(null);
    setSuccess(null);

    const socId = handoverModal.society.id;
    const targetUserId = Number(newAdminUserId);
    if (isNaN(targetUserId) || targetUserId <= 0) {
      setError("Please enter a valid numeric User ID.");
      setHandoverLoading(false);
      return;
    }

    try {
      await societyRequestService.handoverAdmin(socId, {
        newAdminUserId: targetUserId,
        reason: handoverReason.trim() || undefined,
      });
      setSuccess(`Admin handover successful for society ${handoverModal.society.name}.`);
      setHandoverModal({ open: false, society: null });
      setNewAdminUserId("");
      setHandoverReason("");
      void loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to handover admin access.");
    } finally {
      setHandoverLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Platform Management" eyebrow="Level 1 Platform Management">
        <LoadingState label="Connecting to platform management infrastructure..." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Platform Management" eyebrow="Level 1 Platform Management">
      <div className="space-y-6">
        {/* Page Intro & Controls */}
        <PageIntro
          eyebrow="Platform Administration"
          title="SocietyOne Platform Management"
          description="Centrally review society onboarding applications, manage multi-tenant society infrastructure, and oversee platform-wide governance."
          action={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData(true)}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          }
        />

        {/* Success / Error Banners */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-destructive hover:opacity-80">
              <X className="size-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium flex-1">{success}</div>
            <button onClick={() => setSuccess(null)} className="hover:opacity-80">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Platform KPI Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Societies</span>
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display">{kpis?.totalSocieties ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{kpis?.activeSocieties ?? 0} Active</div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Requests</span>
              <Clock className="size-4" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-amber-700 dark:text-amber-300">
              {kpis?.pendingRequests ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-amber-600/80">Requires review</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Approved Requests</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display">{kpis?.approvedRequests ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Ready / created</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Flats Hosted</span>
              <Layers className="size-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display">{kpis?.totalFlats ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Across all towers</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Residents</span>
              <Users className="size-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display">{kpis?.totalResidents ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Platform-wide</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Society Admins</span>
              <ShieldCheck className="size-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display">{kpis?.totalSocietyAdmins ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Assigned Admins</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="size-4" />
            Society Creation Requests
            {kpis && kpis.pendingRequests > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {kpis.pendingRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("societies")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "societies"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="size-4" />
            Society Directory ({societies.length})
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "audit"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" />
            Platform Audit Stream
          </button>
        </div>

        {/* TAB 1: Society Creation Requests */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All Requests", value: "ALL" },
                  { label: "New Submissions", value: "SUBMITTED" },
                  { label: "Under Review", value: "UNDER_REVIEW" },
                  { label: "Changes Requested", value: "CHANGES_REQUESTED" },
                  { label: "Approved / Active", value: "APPROVED" },
                  { label: "Rejected", value: "REJECTED" },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={statusFilter === tab.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(tab.value)}
                    className="text-xs"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by society, contact, city..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <Building2 className="mx-auto size-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-base font-semibold">No society applications found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusFilter !== "ALL"
                    ? `There are no requests matching filter "${statusFilter}".`
                    : "No society creation requests have been submitted yet."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{req.referenceCode || `REQ-${req.id}`}</span>
                          <h4 className="text-lg font-bold font-display">{req.societyName}</h4>
                          {renderStatusBadge(req.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" />
                            {req.city}, {req.state} ({req.postalCode})
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="size-3.5 text-primary" />
                            {req.totalFlats} Flats • {req.numberOfWings} Wings
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-primary" />
                            Submitted {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Recently"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/80 pt-1">
                          <span className="flex items-center gap-1">
                            <UserCheck className="size-3.5 text-muted-foreground" />
                            <strong>Applicant:</strong> {req.primaryContactName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5 text-muted-foreground" />
                            {req.primaryContactEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="size-3.5 text-muted-foreground" />
                            {req.primaryContactPhone}
                          </span>
                        </div>

                        {req.reviewNotes && (
                          <div className="mt-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground border-l-2 border-primary">
                            <strong>Platform Review Notes:</strong> {req.reviewNotes}
                          </div>
                        )}
                        {req.rejectionReason && (
                          <div className="mt-2 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300 border-l-2 border-rose-500">
                            <strong>Rejection Reason:</strong> {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(req)}
                          className="gap-1.5 text-xs"
                        >
                          <Eye className="size-3.5" /> Details
                        </Button>

                        {req.status === "SUBMITTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionModal({ type: "REVIEW", request: req });
                              setNotesInput("");
                            }}
                            className="gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          >
                            <Clock className="size-3.5" /> Start Review
                          </Button>
                        )}

                        {(req.status === "SUBMITTED" || req.status === "UNDER_REVIEW") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActionModal({ type: "CHANGES", request: req });
                                setNotesInput("");
                              }}
                              className="gap-1.5 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/50"
                            >
                              <Send className="size-3.5" /> Request Changes
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActionModal({ type: "REJECT", request: req });
                                setNotesInput("");
                              }}
                              className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            >
                              <X className="size-3.5" /> Reject
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                setActionModal({ type: "APPROVE", request: req });
                                setNotesInput("");
                              }}
                              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Check className="size-3.5" /> Approve & Create
                            </Button>
                          </>
                        )}

                        {req.status === "CHANGES_REQUESTED" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionModal({ type: "APPROVE", request: req });
                              setNotesInput("");
                            }}
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="size-3.5" /> Approve & Create
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Society Directory */}
        {activeTab === "societies" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Displaying all societies provisioned on the platform and their designated Society Admins.
              </p>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search society, city, admin..."
                  value={societySearch}
                  onChange={(e) => setSocietySearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {filteredSocieties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <Building2 className="mx-auto size-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-base font-semibold">No societies registered yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Societies will appear here as soon as pending creation requests are approved.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSocieties.map((soc) => (
                  <div
                    key={soc.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs text-primary font-semibold">SOC-#{soc.id}</span>
                          <h4 className="text-base font-bold font-display">{soc.name}</h4>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          {soc.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3.5 shrink-0 text-primary" />
                        {soc.address}, {soc.city}, {soc.state} - {soc.postalCode}
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center">
                        <div>
                          <div className="text-sm font-bold font-display">{soc.flatCount}</div>
                          <div className="text-[10px] text-muted-foreground">Flats</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold font-display">{soc.residentCount}</div>
                          <div className="text-[10px] text-muted-foreground">Residents</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold font-display">{soc.securityCount}</div>
                          <div className="text-[10px] text-muted-foreground">Security</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <ShieldCheck className="size-3.5 text-primary" /> Society Admin
                          </span>
                        </div>
                        <div className="font-medium text-foreground">{soc.adminFullName || "Unassigned"}</div>
                        {soc.adminEmail && <div className="text-muted-foreground truncate">{soc.adminEmail}</div>}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Added {soc.createdAt ? new Date(soc.createdAt).toLocaleDateString() : "Recently"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHandoverModal({ open: true, society: soc })}
                        className="gap-1 text-xs"
                      >
                        <KeyRound className="size-3" /> Reassign Admin
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Platform Audit Stream */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Real-time audit log of all platform governance actions, applications, status transitions, and administrative assignments.
            </p>

            {auditLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <FileText className="mx-auto size-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-base font-semibold">No platform audit records</h3>
                <p className="mt-1 text-sm text-muted-foreground">Audit events will be logged automatically as actions are taken.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {log.actor}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Target: {log.target} {log.detail && `• ${log.detail}`}
                      </div>
                    </div>
                    <div className="flex sm:flex-col sm:items-end justify-between text-muted-foreground text-[11px]">
                      <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{selectedRequest.referenceCode || `REQ-${selectedRequest.id}`}</span>
                  <h3 className="text-xl font-bold font-display">{selectedRequest.societyName}</h3>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Current Status</span>
                  <div className="mt-1">{renderStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Registration Number</span>
                  <div className="mt-1 font-mono font-medium">{selectedRequest.registrationNumber || "N/A"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Society Type</span>
                  <div className="mt-1 font-medium">{selectedRequest.societyType}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Management Method</span>
                  <div className="mt-1 font-medium">{selectedRequest.managementMethod || "Manual / Register"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3 text-xs">
                <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary" /> Primary Contact (Applicant)
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Name:</span> {selectedRequest.primaryContactName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {selectedRequest.primaryContactPhone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Login Email:</span> {selectedRequest.primaryContactEmail}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Official Society Email:</span> {selectedRequest.societyOfficialEmail || selectedRequest.primaryContactEmail}
                  </div>
                </div>
              </div>

              {selectedRequest.secondaryContactName && (
                <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3 text-xs">
                  <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="size-4 text-primary" /> Secondary Contact
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Name:</span> {selectedRequest.secondaryContactName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span> {selectedRequest.secondaryContactPhone || "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span> {selectedRequest.secondaryContactEmail || "N/A"}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-2 text-xs">
                <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" /> Location & Infrastructure
                </h5>
                <div>
                  <span className="text-muted-foreground">Full Address:</span> {selectedRequest.address}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">City:</span> {selectedRequest.city}
                  </div>
                  <div>
                    <span className="text-muted-foreground">State:</span> {selectedRequest.state}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pincode:</span> {selectedRequest.postalCode}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground">Total Flats:</span> <strong>{selectedRequest.totalFlats}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wings / Towers:</span> <strong>{selectedRequest.numberOfWings}</strong>
                  </div>
                </div>
              </div>

              {selectedRequest.documentUrl && (
                <div className="rounded-xl border border-border p-4 bg-muted/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">Registration Document</div>
                      <div className="text-muted-foreground">{selectedRequest.documentFilename || "Uploaded file"}</div>
                    </div>
                  </div>
                  <a
                    href={selectedRequest.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                  >
                    View Document <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Review/Changes/Reject/Approve Modal */}
        {actionModal.type && actionModal.request && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold font-display">
                  {actionModal.type === "REVIEW" && "Move Application to Under Review"}
                  {actionModal.type === "CHANGES" && "Request Changes from Applicant"}
                  {actionModal.type === "REJECT" && "Reject Society Application"}
                  {actionModal.type === "APPROVE" && "Approve & Create Society"}
                </h3>
                <button
                  onClick={() => setActionModal({ type: null, request: null })}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="text-xs text-muted-foreground">
                Target Society: <strong>{actionModal.request.societyName}</strong> ({actionModal.request.referenceCode || actionModal.request.id})
              </div>

              {actionModal.type === "APPROVE" ? (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                    <p className="font-semibold">Automatic Provisioning Workflow:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-emerald-700 dark:text-emerald-300">
                      <li>Creates active Society record with {actionModal.request.totalFlats} flats and structure.</li>
                      <li>Sets up applicant ({actionModal.request.primaryContactEmail}) as Society Admin.</li>
                      <li>Dispatches confirmation and handover email to the applicant.</li>
                    </ul>
                  </div>

                  <div>
                    <Label className="text-xs">Optional Approval Notes</Label>
                    <Input
                      placeholder="e.g., Verified registration certificates. Approved for full onboarding."
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">
                    {actionModal.type === "CHANGES" ? "Specify Required Changes *" : actionModal.type === "REJECT" ? "Rejection Reason *" : "Review Notes (Optional)"}
                  </Label>
                  <textarea
                    rows={4}
                    placeholder={
                      actionModal.type === "CHANGES"
                        ? "e.g., Please re-upload a clearer copy of the society registration certificate or provide the second secretary contact."
                        : actionModal.type === "REJECT"
                        ? "e.g., Duplicate registration request for existing registered society."
                        : "e.g., Initial documents validated, performing background check."
                    }
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal({ type: null, request: null })}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleReviewAction()}
                  disabled={actionLoading}
                  className={
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : actionModal.type === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : actionModal.type === "CHANGES"
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : ""
                  }
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" /> Processing...
                    </>
                  ) : (
                    "Confirm Action"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Handover Modal */}
        {handoverModal.open && handoverModal.society && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-lg font-bold font-display">Reassign Society Admin</h3>
                <button
                  onClick={() => setHandoverModal({ open: false, society: null })}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>Society: <strong>{handoverModal.society.name}</strong> (SOC-#{handoverModal.society.id})</div>
                <div>Current Admin: <strong>{handoverModal.society.adminFullName || "None"}</strong></div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">New Admin User ID *</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={newAdminUserId}
                    onChange={(e) => setNewAdminUserId(e.target.value)}
                    className="mt-1 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Enter the database ID of the user who should become the designated Society Admin.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Handover Reason / Notes (Optional)</Label>
                  <Input
                    placeholder="e.g. Committee election update or administrative transfer"
                    value={handoverReason}
                    onChange={(e) => setHandoverReason(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHandoverModal({ open: false, society: null })}
                  disabled={handoverLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleAdminHandover()}
                  disabled={handoverLoading || !newAdminUserId}
                >
                  {handoverLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" /> Reassigning...
                    </>
                  ) : (
                    "Reassign Admin"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
