import {
  Building2,
  CheckCircle2,
  Coins,
  Home,
  Layers,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import type { ResidentOnboardingRequest } from "@/types/domain";

interface ApartmentAllocationCardProps {
  allocation: ResidentOnboardingRequest;
}

export function ApartmentAllocationCard({ allocation }: ApartmentAllocationCardProps) {
  const buildingName = allocation.allocatedBuildingName || allocation.preferredBuildingName || "Main Complex";
  const flatNumber = allocation.allocatedFlatNumber || allocation.preferredFlatNumber || "—";
  const floorNumber = allocation.allocatedFloorNumber !== undefined && allocation.allocatedFloorNumber !== null
    ? `Floor ${allocation.allocatedFloorNumber}`
    : "—";
  const flatType = allocation.confirmedFlatType || allocation.flatTypePreference || "2BHK";
  const residentType = allocation.residentType === "OWNER" ? "Owner" : "Tenant";
  const familyCount = allocation.familyMemberCount || 1;
  const maintenance = allocation.maintenanceInfo || "Standard Society Maintenance";
  const parking = allocation.parkingStatus || "Assigned by Management";
  const formattedDate = allocation.allocatedAt
    ? new Date(allocation.allocatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently Allocated";

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 p-6 shadow-md dark:border-emerald-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Home className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-foreground">
                Apartment Allocation
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                Apartment Allocated
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Official residential assignment approved by Society Administration
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Allocated on
          </span>
          <p className="text-xs font-semibold text-foreground">{formattedDate}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 text-brand-blue" />
            <span>Building</span>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-foreground truncate">
            {buildingName}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Home className="size-3.5 text-brand-blue" />
            <span>Flat Number</span>
          </div>
          <p className="mt-1 font-display text-base font-bold text-foreground">
            Flat {flatNumber}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="size-3.5 text-brand-blue" />
            <span>Floor</span>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-foreground">
            {floorNumber}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-brand-blue" />
            <span>Flat Type</span>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-foreground">
            {flatType}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border/60 pt-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <UserCheck className="size-3 text-brand-orange" />
            <span>Resident Role</span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{residentType}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Users className="size-3 text-brand-orange" />
            <span>Family Members</span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground">
            {familyCount} {familyCount === 1 ? "Member" : "Members"}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Coins className="size-3 text-brand-orange" />
            <span>Maintenance</span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{maintenance}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <MapPin className="size-3 text-brand-orange" />
            <span>Parking Slot</span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{parking}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          Admin has reviewed your details and officially assigned this apartment/flat to you.
        </span>
      </div>
    </div>
  );
}
