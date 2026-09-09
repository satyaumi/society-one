import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Loader2,
  Mail,
  Megaphone,
  Pin,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { notificationService, platformService, realtimeEvents } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-store";
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementType,
  CreateAnnouncementInput,
  PlatformSocietyDirectoryItem,
} from "@/types/domain";
import {
  AnnouncementDetailsModal,
  getAnnouncementMeta,
  getAudienceLabel,
  getAnnouncementImage,
} from "@/components/notifications/AnnouncementDetailsModal";
import { cn } from "@/lib/utils";

export const PHOTO_PRESETS = [
  {
    label: "🐘 Ganesh Chaturthi",
    url: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?w=900&auto=format&fit=crop&q=80",
    desc: "Ganesh festival celebration poster",
  },
  {
    label: "🪔 Diwali Festival",
    url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900&auto=format&fit=crop&q=80",
    desc: "Deepavali lights & celebration",
  },
  {
    label: "🔧 Water / Maintenance",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80",
    desc: "Plumbing, tank & utility repair",
  },
  {
    label: "⚡ Lift & Electrical",
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&auto=format&fit=crop&q=80",
    desc: "Elevator or generator service",
  },
  {
    label: "🛡️ Security Briefing",
    url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=900&auto=format&fit=crop&q=80",
    desc: "Gate protocol & guard alert",
  },
  {
    label: "🏃 Sports & Fitness",
    url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&auto=format&fit=crop&q=80",
    desc: "Cricket, badminton & fitness",
  },
  {
    label: "🎭 Cultural Fest",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80",
    desc: "Music, stage event & food stalls",
  },
  {
    label: "🏛️ General Notice",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
    desc: "Society AGM & administrative notice",
  },
];

export const Route = createFileRoute("/admin/announcements")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Announcements | SocietyOne Admin" },
      { name: "description", content: "Create and manage society notices and announcements." },
    ],
  }),
  component: AdminAnnouncementsPage,
});

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string }[] = [
  { value: "GENERAL_NOTICE", label: "General Notice" },
  { value: "EVENT", label: "Event" },
  { value: "FESTIVAL", label: "Festival Celebration" },
  { value: "IMPORTANT_NOTICE", label: "Important Notice" },
  { value: "MAINTENANCE", label: "Maintenance Work" },
  { value: "SECURITY_ALERT", label: "Security Alert" },
  { value: "DELIVERY", label: "Delivery / Parcel Update" },
  { value: "OTHER", label: "Other" },
];

const AUDIENCES: { value: AnnouncementAudience; label: string; desc: string; platformOnly?: boolean }[] = [
  {
    value: "ALL_MEMBERS",
    label: "All Societies & Members (Broadcast)",
    desc: "Broadcasted across all society portals to all Society Admins, Residents, and Security staff",
  },
  {
    value: "SOCIETY_ADMINS",
    label: "Society Admins Only (Platform-level)",
    desc: "Delivered to every registered Society Administrator inbox across the entire platform (Platform Management only)",
    platformOnly: true,
  },
  {
    value: "PUBLIC",
    label: "Public Landing Page (Visible to Everyone Worldwide)",
    desc: "Published on the public landing page for outside visitors AND visible to all residents & admins on their dashboards",
  },
  {
    value: "RESIDENTS",
    label: "Residents Only",
    desc: "Visible only to verified flat residents of the society",
  },
  {
    value: "SECURITY",
    label: "Security Staff",
    desc: "Visible only to on-duty and gate security personnel",
  },
];

function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [viewingItem, setViewingItem] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Individual Society Admin Notice Modal (for Platform Admin / Boss)
  const [adminNoticeModal, setAdminNoticeModal] = useState<{
    open: boolean;
    societies: PlatformSocietyDirectoryItem[];
    selectedSocietyId: number | null;
    category: string;
    subject: string;
    message: string;
    sendEmail: boolean;
    loading: boolean;
    error: string | null;
  }>({
    open: false,
    societies: [],
    selectedSocietyId: null,
    category: "DUES_PENDING",
    subject: "",
    message: "",
    sendEmail: true,
    loading: false,
    error: null,
  });

  // Filters
  const [filterAudience, setFilterAudience] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    title: "",
    message: "",
    type: "GENERAL_NOTICE",
    audience: "ALL_MEMBERS",
    eventDate: "",
    eventTime: "",
    purpose: "",
    imageUrl: "",
    active: true,
    pinned: false,
  });

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await notificationService.listAdminAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load admin announcements:", err);
      setError("Failed to load announcements. Please check your admin privileges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();

    const unsubscribe = realtimeEvents.subscribe((event) => {
      if (event.type === "announcement:changed") {
        void loadAnnouncements();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      message: "",
      type: "GENERAL_NOTICE",
      audience: "ALL_MEMBERS",
      eventDate: "",
      eventTime: "",
      purpose: "",
      imageUrl: "",
      active: true,
      pinned: false,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      message: item.message,
      type: item.type,
      audience: item.audience,
      eventDate: item.eventDate || "",
      eventTime: item.eventTime || "",
      purpose: item.purpose || "",
      imageUrl: item.imageUrl || "",
      active: item.active,
      pinned: item.pinned,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Please fill in both the title and message.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload: CreateAnnouncementInput = {
        ...formData,
        title: formData.title.trim(),
        message: formData.message.trim(),
        eventDate: formData.eventDate?.trim() || undefined,
        eventTime: formData.eventTime?.trim() || undefined,
        purpose: formData.purpose?.trim() || undefined,
        imageUrl: formData.imageUrl?.trim() || undefined,
      };

      if (editingItem) {
        await notificationService.updateAnnouncement(editingItem.id, payload);
        setSuccess(`Announcement "${payload.title}" updated successfully.`);
      } else {
        await notificationService.createAnnouncement(payload);
        setSuccess(`Announcement "${payload.title}" published successfully.`);
      }

      setShowModal(false);
      void loadAnnouncements();
    } catch (err: any) {
      console.error("Save announcement failed:", err);
      setError(err?.message || "Failed to save announcement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      const updated = await notificationService.toggleActiveAnnouncement(item.id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, active: updated.active } : a)),
      );
      setSuccess(`Notice "${item.title}" is now ${updated.active ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      console.error("Toggle active failed:", err);
      setError(err?.message || "Failed to toggle announcement status.");
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
      return;
    }
    try {
      await notificationService.deleteAnnouncement(item.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
      setSuccess(`Announcement "${item.title}" deleted.`);
    } catch (err: any) {
      console.error("Delete failed:", err);
      setError(err?.message || "Failed to delete announcement.");
    }
  };

  const openAdminNoticeModal = async () => {
    let socList = adminNoticeModal.societies;
    if (socList.length === 0) {
      try {
        socList = await platformService.getSocieties();
      } catch (err) {
        console.error("Failed to load societies for notice dispatch:", err);
      }
    }
    const firstSoc = socList[0];
    const socName = firstSoc?.name || "the society";
    setAdminNoticeModal({
      open: true,
      societies: socList,
      selectedSocietyId: firstSoc ? firstSoc.id : null,
      category: "DUES_PENDING",
      subject: `Notice: Outstanding Maintenance & Dues Pending - ${socName}`,
      message: `Dear Society Administrator,\n\nThis is an official notice regarding pending platform dues and maintenance reconciliation for ${socName}.\n\nPlease review your account ledger and ensure all pending payments are completed at the earliest.\n\nRegards,\nPlatform Management`,
      sendEmail: true,
      loading: false,
      error: null,
    });
  };

  const handleSendAdminNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminNoticeModal.selectedSocietyId || !adminNoticeModal.subject.trim() || !adminNoticeModal.message.trim()) {
      setAdminNoticeModal((prev) => ({
        ...prev,
        error: "Please select a society and provide both subject and message content.",
      }));
      return;
    }

    setAdminNoticeModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await platformService.sendMessageToAdmin({
        societyId: adminNoticeModal.selectedSocietyId,
        subject: adminNoticeModal.subject.trim(),
        message: adminNoticeModal.message.trim(),
        category: adminNoticeModal.category,
        sendEmail: adminNoticeModal.sendEmail,
      });

      const soc = adminNoticeModal.societies.find((s) => s.id === adminNoticeModal.selectedSocietyId);
      setSuccess(`Direct administrative notice dispatched to ${soc?.name || "Society"} Admin successfully.`);
      setAdminNoticeModal((prev) => ({ ...prev, open: false, loading: false }));
    } catch (err: any) {
      setAdminNoticeModal((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Failed to dispatch notice to society administrator.",
      }));
    }
  };

  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      if (filterAudience !== "ALL" && item.audience !== filterAudience) {
        return false;
      }
      if (filterStatus === "ACTIVE" && !item.active) return false;
      if (filterStatus === "INACTIVE" && item.active) return false;
      return true;
    });
  }, [announcements, filterAudience, filterStatus]);

  return (
    <AppShell title="Announcements & Notices" eyebrow={isPlatformAdmin ? "Platform Management" : "Society Admin"}>
      <PageIntro
        eyebrow={isPlatformAdmin ? "Platform Communications" : "Communications"}
        title={isPlatformAdmin ? "Platform & Society Announcements" : "Society Announcements"}
        description={
          isPlatformAdmin
            ? "Broadcast announcements across all society portals, to all society admins and residents, publish to public landing page, or dispatch direct notices to individual admins."
            : "Broadcast important notices, festivals, maintenance updates, and public news to residents and security staff."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadAnnouncements()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh
            </Button>
            {isPlatformAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                onClick={() => void openAdminNoticeModal()}
                title="Send individual administrative notice or dues reminder to a specific society admin"
              >
                <Send className="size-4" /> Notice to Society Admin
              </Button>
            )}
            <Button
              size="sm"
              className="bg-brand-blue hover:bg-brand-blue/90"
              onClick={openCreateModal}
            >
              <Plus className="size-4 mr-1.5" /> Create Announcement
            </Button>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 ml-auto"
            onClick={() => setError("")}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{success}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 ml-auto"
            onClick={() => setSuccess("")}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      {/* Filter Row */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Audience:</span>
          {["ALL", "ALL_MEMBERS", "RESIDENTS", "SECURITY", "PUBLIC"].map((aud) => (
            <Button
              key={aud}
              variant={filterAudience === aud ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterAudience(aud)}
            >
              {aud === "ALL" ? "All Audiences" : getAudienceLabel(aud)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Status:</span>
          {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
            <Button
              key={st}
              variant={filterStatus === st ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setFilterStatus(st)}
            >
              {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Inactive"}
            </Button>
          ))}
        </div>
      </div>

      {/* Announcements Table / List */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading announcements..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No announcements found"
            description="Create your first notice or festival update to display on dashboards and notification centers."
            icon={<Megaphone className="size-6" />}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Title & Details</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Audience</th>
                    <th className="py-3.5 px-4">Event Date / Time</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Reads</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((item) => {
                    const meta = getAnnouncementMeta(item.type);
                    const audienceLabel = getAudienceLabel(item.audience);

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-muted/20",
                          !item.active && "opacity-60 bg-muted/10"
                        )}
                      >
                        {/* Title & Preview with Poster Thumbnail */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-3">
                            <img
                              src={getAnnouncementImage(item)}
                              alt={item.title}
                              className="size-12 rounded-xl object-cover border border-border shrink-0 shadow-2xs"
                              loading="lazy"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {item.pinned && (
                                  <Pin className="size-3 text-brand-blue shrink-0" />
                                )}
                                <p className="font-semibold text-foreground line-clamp-1">
                                  {item.title}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                              meta.color
                            )}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                        </td>

                        {/* Audience */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={item.audience === "PUBLIC" ? "default" : "outline"}
                            className={cn(
                              "text-xs",
                              item.audience === "PUBLIC" && "bg-emerald-600 hover:bg-emerald-600"
                            )}
                          >
                            {audienceLabel}
                          </Badge>
                        </td>

                        {/* Event Date / Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          {item.eventDate ? (
                            <div className="font-medium text-foreground">
                              <span>{item.eventDate}</span>
                              {item.eventTime && (
                                <span className="ml-1 text-muted-foreground">
                                  · {item.eventTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={item.active ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              item.active ? "bg-success text-white" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {item.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Read Count */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {item.readCount ?? 0}
                          </span>{" "}
                          reads
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="View details"
                              onClick={() => setViewingItem(item)}
                            >
                              <Eye className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit notice"
                              onClick={() => openEditModal(item)}
                            >
                              <Edit2 className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "size-8",
                                item.active
                                  ? "text-emerald-600 hover:text-rose-600 hover:bg-rose-500/10"
                                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              )}
                              title={item.active ? "Deactivate notice" : "Activate notice"}
                              onClick={() => void handleToggleActive(item)}
                            >
                              {item.active ? (
                                <Power className="size-4" />
                              ) : (
                                <PowerOff className="size-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete permanently"
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">
                {editingItem ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setShowModal(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ganesh Chaturthi Celebration"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              {/* Message / Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Message / Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Details of the announcement, guidelines, venue, etc."
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              {/* Type and Audience Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Announcement Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as AnnouncementType,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Who Can See This? (Audience) *
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        audience: e.target.value as AnnouncementAudience,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    {AUDIENCES.filter((a) => !a.platformOnly || isPlatformAdmin).map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audience Helper text */}
              <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                <span className="font-semibold">Visibility note: </span>
                {AUDIENCES.find((a) => a.value === formData.audience)?.desc}
              </p>

              {/* Date, Time & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Event Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.eventDate || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, eventDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Event Time (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7:00 PM"
                    value={formData.eventTime || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, eventTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Purpose / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clubhouse"
                    value={formData.purpose || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purpose: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Announcement Poster / Reference Picture */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    Event Poster / Reference Photo (Optional)
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear photo
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or pick a preset below"
                  value={formData.imageUrl || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />

                {/* Quick Preset Buttons */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    Click a preset to auto-apply a high-quality event photo:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: preset.url }))}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                          formData.imageUrl === preset.url
                            ? "border-emerald-600 bg-emerald-600 text-white font-semibold shadow-xs"
                            : "border-border/80 bg-background hover:bg-muted text-foreground/80"
                        }`}
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Image Preview */}
                {formData.imageUrl && (
                  <div className="relative mt-2 overflow-hidden rounded-xl border border-border/80 shadow-xs max-h-48">
                    <img
                      src={formData.imageUrl}
                      alt="Poster Preview"
                      className="w-full h-44 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                      Live Preview on Dashboards
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles: Pinned & Active */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.pinned}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pinned: e.target.checked }))
                    }
                    className="rounded border-border size-4 accent-brand-blue"
                  />
                  <span>Pin to top</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="rounded border-border size-4 accent-brand-blue"
                  />
                  <span>Active & visible immediately</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-blue hover:bg-brand-blue/90"
                >
                  {submitting ? "Saving..." : editingItem ? "Update Announcement" : "Publish Announcement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingItem && (
        <AnnouncementDetailsModal
          announcement={viewingItem}
          onClose={() => setViewingItem(null)}
        />
      )}

      {/* Individual Society Admin Notice Modal (Platform Admin only) */}
      {adminNoticeModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setAdminNoticeModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Notice to Society Admin
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dispatch an administrative notice, dues alert, or maintenance reminder
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setAdminNoticeModal((prev) => ({ ...prev, open: false }))}
              >
                <X className="size-4" />
              </Button>
            </div>

            {adminNoticeModal.error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="font-medium flex-1">{adminNoticeModal.error}</div>
              </div>
            )}

            <form onSubmit={(e) => void handleSendAdminNotice(e)} className="space-y-4 text-xs">
              {/* Target Society Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Target Society & Admin *
                </label>
                <select
                  value={adminNoticeModal.selectedSocietyId ?? ""}
                  onChange={(e) => {
                    const socId = Number(e.target.value);
                    const soc = adminNoticeModal.societies.find((s) => s.id === socId);
                    const socName = soc?.name || "the society";
                    setAdminNoticeModal((prev) => {
                      let newSub = prev.subject;
                      let newMsg = prev.message;
                      if (prev.category === "DUES_PENDING") {
                        newSub = `Notice: Outstanding Maintenance & Dues Pending - ${socName}`;
                        newMsg = `Dear Society Administrator,\n\nThis is an official notice regarding pending platform dues and maintenance reconciliation for ${socName}.\n\nPlease review your account ledger and ensure all pending payments are completed at the earliest.\n\nRegards,\nPlatform Management`;
                      } else if (prev.category === "MAINTENANCE_PENDING") {
                        newSub = `Urgent: Maintenance Review & Pending Action Required - ${socName}`;
                        newMsg = `Dear Society Administrator,\n\nWe noticed that pending maintenance reports and facility tasks for ${socName} are awaiting administrative review and sign-off.\n\nPlease log in to your society portal and address the pending items at the earliest.\n\nRegards,\nPlatform Management`;
                      }
                      return { ...prev, selectedSocietyId: socId, subject: newSub, message: newMsg };
                    });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {adminNoticeModal.societies.length === 0 && (
                    <option value="">No societies found</option>
                  )}
                  {adminNoticeModal.societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Admin: {s.adminFullName || "Unassigned"}{s.adminEmail ? ` - ${s.adminEmail}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Notification Category *
                </label>
                <select
                  value={adminNoticeModal.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const soc = adminNoticeModal.societies.find((s) => s.id === adminNoticeModal.selectedSocietyId);
                    const socName = soc?.name || "your society";
                    setAdminNoticeModal((prev) => {
                      let newSub = prev.subject;
                      let newMsg = prev.message;
                      if (cat === "DUES_PENDING") {
                        newSub = `Notice: Outstanding Maintenance & Dues Pending - ${socName}`;
                        newMsg = `Dear Society Administrator,\n\nThis is an official notice regarding pending platform dues and maintenance reconciliation for ${socName}.\n\nPlease review your account ledger and ensure all pending payments are completed at the earliest.\n\nRegards,\nPlatform Management`;
                      } else if (cat === "MAINTENANCE_PENDING") {
                        newSub = `Urgent: Maintenance Review & Pending Action Required - ${socName}`;
                        newMsg = `Dear Society Administrator,\n\nWe noticed that pending maintenance reports and facility tasks for ${socName} are awaiting administrative review and sign-off.\n\nPlease log in to your society portal and address the pending items at the earliest.\n\nRegards,\nPlatform Management`;
                      }
                      return { ...prev, category: cat, subject: newSub, message: newMsg };
                    });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="DUES_PENDING">⚠️ Outstanding Dues & Maintenance Pending</option>
                  <option value="MAINTENANCE_PENDING">🔧 Maintenance Service & Inspection Notice</option>
                  <option value="GENERAL_MESSAGE">📢 General Advisory / Official Notice</option>
                  <option value="PAYMENT_UPDATE">💳 Billing / Subscription / Payment Update</option>
                  <option value="SECURITY_ALERT">🚨 Security Alert / Incident Briefing</option>
                  <option value="PLATFORM_UPDATE">📋 Platform Update / Compliance Notice</option>
                </select>
              </div>

              {/* Quick Template Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground">Quick Templates:</span>
                <button
                  type="button"
                  onClick={() => {
                    const soc = adminNoticeModal.societies.find((s) => s.id === adminNoticeModal.selectedSocietyId);
                    const socName = soc?.name || "your society";
                    setAdminNoticeModal((prev) => ({
                      ...prev,
                      category: "DUES_PENDING",
                      subject: `Notice: Outstanding Maintenance & Dues Pending - ${socName}`,
                      message: `Dear Society Administrator,\n\nThis is an official notice regarding pending platform dues and maintenance reconciliation for ${socName}.\n\nPlease review your account ledger and ensure all pending payments are completed at the earliest.\n\nRegards,\nPlatform Management`,
                    }));
                  }}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  ⚠️ Dues Pending
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const soc = adminNoticeModal.societies.find((s) => s.id === adminNoticeModal.selectedSocietyId);
                    const socName = soc?.name || "your society";
                    setAdminNoticeModal((prev) => ({
                      ...prev,
                      category: "MAINTENANCE_PENDING",
                      subject: `Urgent: Maintenance Review & Pending Action Required - ${socName}`,
                      message: `Dear Society Administrator,\n\nWe noticed that pending maintenance reports and facility tasks for ${socName} are awaiting administrative review and sign-off.\n\nPlease log in to your society portal and address the pending items at the earliest.\n\nRegards,\nPlatform Management`,
                    }));
                  }}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                >
                  🔧 Maintenance Pending
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notice: Outstanding Dues & Maintenance Pending"
                  value={adminNoticeModal.subject}
                  onChange={(e) => setAdminNoticeModal((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write your direct administrative communication..."
                  value={adminNoticeModal.message}
                  onChange={(e) => setAdminNoticeModal((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Email Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={adminNoticeModal.sendEmail}
                  onChange={(e) => setAdminNoticeModal((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                  className="rounded border-border size-4 accent-primary"
                />
                <span className="text-xs font-medium">
                  Also dispatch high-priority email notification to Admin's registered email
                </span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdminNoticeModal((prev) => ({ ...prev, open: false }))}
                  disabled={adminNoticeModal.loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={adminNoticeModal.loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  {adminNoticeModal.loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" /> Dispatch Notice
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
