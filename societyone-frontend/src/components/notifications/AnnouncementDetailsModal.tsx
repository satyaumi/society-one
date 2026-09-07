import type { Announcement } from "@/types/domain";
import {
  Calendar,
  Clock,
  Info,
  Megaphone,
  PartyPopper,
  Pin,
  ShieldAlert,
  Sparkles,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AnnouncementDetailsModalProps {
  announcement: Announcement | null;
  onClose: () => void;
}

export function getAnnouncementMeta(type: string) {
  switch (type) {
    case "FESTIVAL":
      return {
        label: "Festival",
        icon: <PartyPopper className="size-4 text-amber-500" />,
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "EVENT":
      return {
        label: "Event",
        icon: <Sparkles className="size-4 text-purple-500" />,
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "MAINTENANCE":
      return {
        label: "Maintenance",
        icon: <Wrench className="size-4 text-blue-500" />,
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "SECURITY_ALERT":
      return {
        label: "Security Alert",
        icon: <ShieldAlert className="size-4 text-rose-500" />,
        color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    case "IMPORTANT_NOTICE":
      return {
        label: "Important Notice",
        icon: <Info className="size-4 text-orange-500" />,
        color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      };
    case "DELIVERY":
      return {
        label: "Delivery / Update",
        icon: <Truck className="size-4 text-emerald-500" />,
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "GENERAL_NOTICE":
    default:
      return {
        label: "General Notice",
        icon: <Megaphone className="size-4 text-sky-500" />,
        color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      };
  }
}

export function getAudienceLabel(audience: string) {
  switch (audience) {
    case "ALL_MEMBERS":
      return "All Members";
    case "RESIDENTS":
      return "Residents Only";
    case "SECURITY":
      return "Security Staff";
    case "PUBLIC":
      return "Public & All Members";
    default:
      return audience;
  }
}

export function getAnnouncementImage(ann: {
  imageUrl?: string;
  type?: string;
  title?: string;
  purpose?: string;
}): string {
  if (ann.imageUrl && ann.imageUrl.trim()) {
    return ann.imageUrl.trim();
  }
  const text = `${ann.title || ""} ${ann.purpose || ""}`.toLowerCase();
  if (
    text.includes("ganesh") ||
    text.includes("chaturthi") ||
    text.includes("vinayaka") ||
    text.includes("modak") ||
    text.includes("festival") ||
    ann.type === "FESTIVAL"
  ) {
    return "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?w=900&auto=format&fit=crop&q=80";
  }
  if (text.includes("diwali") || text.includes("deepavali") || text.includes("light")) {
    return "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("water") ||
    text.includes("tank") ||
    text.includes("plumb") ||
    text.includes("pipe") ||
    text.includes("pump")
  ) {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("lift") ||
    text.includes("elevator") ||
    text.includes("power") ||
    text.includes("generator") ||
    ann.type === "MAINTENANCE"
  ) {
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("security") ||
    text.includes("guard") ||
    text.includes("gate") ||
    text.includes("briefing") ||
    ann.type === "SECURITY_ALERT"
  ) {
    return "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=900&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("sport") ||
    text.includes("cricket") ||
    text.includes("badminton") ||
    text.includes("fitness") ||
    text.includes("yoga")
  ) {
    return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("cultural") ||
    text.includes("art") ||
    text.includes("dance") ||
    text.includes("annual") ||
    ann.type === "EVENT"
  ) {
    return "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80";
}

export function AnnouncementDetailsModal({
  announcement,
  onClose,
}: AnnouncementDetailsModalProps) {
  if (!announcement) return null;

  const meta = getAnnouncementMeta(announcement.type);
  const audienceLabel = getAudienceLabel(announcement.audience);
  const imageUrl = getAnnouncementImage(announcement);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Type & Audience badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
            >
              {meta.icon}
              {meta.label}
            </span>

            <Badge variant="outline" className="border-border text-xs">
              {audienceLabel}
            </Badge>

            {announcement.pinned && (
              <Badge
                variant="secondary"
                className="gap-1 bg-brand-blue/10 text-brand-blue text-xs font-semibold"
              >
                <Pin className="size-3" /> Pinned
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Hero Event Photo */}
        {imageUrl && (
          <div className="relative mt-4 overflow-hidden rounded-xl border border-border/70 shadow-xs">
            <img
              src={imageUrl}
              alt={announcement.title}
              className="h-48 sm:h-60 w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        )}

        {/* Title */}
        <h2
          id="announcement-modal-title"
          className="mt-4 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {announcement.title}
        </h2>

        {/* Event Date & Time (if present) */}
        {(announcement.eventDate || announcement.eventTime) && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-sm text-foreground">
            {announcement.eventDate && (
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="size-4 text-brand-blue" />
                <span>{announcement.eventDate}</span>
              </div>
            )}
            {announcement.eventTime && (
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="size-4 text-brand-orange" />
                <span>{announcement.eventTime}</span>
              </div>
            )}
            {announcement.purpose && (
              <div className="w-full text-xs text-muted-foreground pt-1 border-t border-border/50">
                <span className="font-semibold text-foreground/80">Purpose: </span>
                {announcement.purpose}
              </div>
            )}
          </div>
        )}

        {/* Message body */}
        <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {announcement.message}
          </p>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <div>
            <span>Published: </span>
            <span className="font-medium text-foreground">
              {new Date(announcement.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {announcement.createdByName && (
              <span className="ml-1">by {announcement.createdByName}</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="ml-auto"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
