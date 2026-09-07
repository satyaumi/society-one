import { CheckCircle2, DoorOpen, Home, Loader2, Phone, ShieldCheck, UserCheck, Car, Calendar, Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/media-url";
import type { VisitRequest } from "@/types/domain";

interface ViewAuthorizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: VisitRequest | null;
  onCheckIn?: (requestId: string) => Promise<void> | void;
  isCheckingIn?: boolean;
}

export function ViewAuthorizationModal({
  open,
  onOpenChange,
  request,
  onCheckIn,
  isCheckingIn = false,
}: ViewAuthorizationModalProps) {
  if (!request) return null;

  const photo = resolveMediaUrl(request.photoUrl || request.visitor.photoUrl);

  const formattedApprovalTime = formatDateTime(request.updatedAt || request.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header with verified badge */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white sm:rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Authorization Details
                </DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                  Verified Resident Gate Clearance
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-white text-emerald-800 font-semibold shadow-sm hover:bg-white text-xs px-2.5 py-1">
              Resident Approved
            </Badge>
          </div>

          {/* Quick Authorization Flow Breadcrumb */}
          <div className="mt-4 rounded-lg bg-black/20 p-3 text-xs font-medium text-white/90 backdrop-blur-sm flex flex-wrap items-center gap-1.5">
            <span className="text-emerald-200">Authorized:</span>
            <strong className="text-white">{request.resident.name}</strong>
            <span className="text-white/60">→</span>
            <span>{request.buildingName || "Building"}</span>
            <span className="text-white/60">/</span>
            <strong className="text-white">Flat {request.flat.number}</strong>
            <span className="text-white/60">→</span>
            <strong className="text-emerald-100 underline decoration-emerald-400">{request.visitor.name}</strong>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Visitor Identity Section (Photo + Core Info) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-muted shadow-inner">
              {photo ? (
                <img
                  src={photo}
                  alt={request.visitor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-info-soft font-display text-2xl font-bold text-brand-blue">
                  {request.visitor.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              {photo && (
                <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 p-0.5 text-white shadow">
                  <CheckCircle2 className="size-3" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="font-display text-xl font-bold text-foreground">
                  {request.visitor.name}
                </h3>
                <Badge variant="outline" className="capitalize text-xs font-medium">
                  {(request.visitorType || request.visitor.visitorType || "Guest").replace("_", " ").toLowerCase()}
                </Badge>
              </div>

              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3.5 text-brand-blue" />
                <a
                  href={`tel:${request.visitor.mobile}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {request.visitor.mobile}
                </a>
              </p>

              {request.vehicleNumber && (
                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                  <Car className="size-3.5 text-brand-blue" />
                  Vehicle: <strong className="font-mono text-foreground">{request.vehicleNumber}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Grid of Key Verification Attributes */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            {/* Approving Resident */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <UserCheck className="size-3.5 text-brand-blue" />
                <span>Authorizing Resident</span>
              </div>
              <p className="font-semibold text-sm text-foreground">{request.resident.name}</p>
              <p className="text-[11px] text-muted-foreground">Primary flat resident/owner</p>
            </div>

            {/* Flat & Building */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Home className="size-3.5 text-brand-blue" />
                <span>Building & Flat</span>
              </div>
              <p className="font-semibold text-sm text-foreground">
                {request.buildingName ? `${request.buildingName}, ` : ""}Flat {request.flat.number}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" /> {request.society.name}
              </p>
            </div>

            {/* Purpose */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <CheckCircle2 className="size-3.5 text-brand-blue" />
                <span>Purpose of Visit</span>
              </div>
              <p className="font-medium text-foreground text-sm">
                {request.purpose || "Personal Visit"}
              </p>
            </div>

            {/* Approval Timestamp */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Clock className="size-3.5 text-emerald-600" />
                <span>Approved Date & Time</span>
              </div>
              <p className="font-semibold text-sm text-foreground">{formattedApprovalTime}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Recorded in society audit log</p>
            </div>

            {/* Expected Arrival */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Calendar className="size-3.5 text-brand-blue" />
                <span>Scheduled / Expected Time</span>
              </div>
              <p className="font-medium text-foreground">
                {request.expectedDate} {request.expectedTime ? `· ${request.expectedTime}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <DialogFooter className="border-t border-border bg-muted/40 p-4 sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:w-auto w-full"
          >
            Close
          </Button>

          {onCheckIn && request.visitStatus === "WAITING_AT_GATE" && (
            <Button
              type="button"
              disabled={isCheckingIn}
              onClick={async () => {
                await onCheckIn(request.id);
                onOpenChange(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto w-full font-medium"
            >
              {isCheckingIn ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <DoorOpen className="mr-1.5 size-4" />
              )}
              Confirm Check-in
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return isoStr;
  }
}
