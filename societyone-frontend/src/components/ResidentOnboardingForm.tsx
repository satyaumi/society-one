import { useState, useEffect, type FormEvent } from "react";
import {
  Home,
  User,
  Users,
  Building as BuildingIcon,
  Phone,
  Car,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  residentService,
  societyService,
} from "@/services";
import type {
  ResidentOnboardingRequest,
  ResidentOnboardingSubmitInput,
  Society,
  Building,
} from "@/types/domain";

interface ResidentOnboardingFormProps {
  initialData?: ResidentOnboardingRequest | null;
  defaultFullName?: string;
  onSuccess: (updated: ResidentOnboardingRequest) => void;
  onCancel?: () => void;
}

export function ResidentOnboardingForm({
  initialData,
  defaultFullName,
  onSuccess,
  onCancel,
}: ResidentOnboardingFormProps) {
  const [society, setSociety] = useState<Society | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ResidentOnboardingSubmitInput>({
    fullName: initialData?.fullName || defaultFullName || "",
    residentType: initialData?.residentType || "OWNER",
    flatTypePreference: initialData?.flatTypePreference || "2BHK",
    familyMemberCount: initialData?.familyMemberCount || 1,
    preferredBuildingId: initialData?.preferredBuildingId || undefined,
    preferredFlatNumber: initialData?.preferredFlatNumber || "",
    emergencyContactName: initialData?.emergencyContactName || "",
    emergencyContactPhone: initialData?.emergencyContactPhone || "",
    vehicleNumber: initialData?.vehicleNumber || "",
  });

  useEffect(() => {
    societyService
      .getSociety()
      .then((soc) => {
        setSociety(soc);
        if (soc && !form.preferredBuildingId && soc.buildings?.length) {
          setForm((prev: ResidentOnboardingSubmitInput) => ({
            ...prev,
            preferredBuildingId: Number(soc.buildings[0].id),
          }));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Please enter the name of Owner/Tenant.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await residentService.submitOnboarding({
        ...form,
        societyId: society?.id ? Number(society.id) : undefined,
        familyMemberCount: Number(form.familyMemberCount) || 1,
      });
      onSuccess(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit onboarding details.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-blue/30 bg-card p-6 shadow-xl dark:border-brand-blue/20">
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
            <Home className="size-3.5" />
            Resident Onboarding
          </div>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            Complete Your Resident Details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your residential details for Admin review and apartment/flat allocation.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {initialData?.status === "CHANGES_REQUESTED" && initialData.adminNotes && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="size-4 shrink-0" />
            Admin Requested Updates:
          </div>
          <p className="mt-1 text-xs leading-relaxed">{initialData.adminNotes}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Name of Owner / Tenant */}
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-fullname" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Name of Owner / Tenant <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="onboarding-fullname"
              className="pl-9"
              placeholder="e.g. Rahul Kumar"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Resident Type & Flat Type Preference */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resident Type <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, residentType: "OWNER" })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  form.residentType === "OWNER"
                    ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, residentType: "TENANT" })}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  form.residentType === "TENANT"
                    ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Tenant
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flat-preference" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Flat Type Preference
            </Label>
            <select
              id="flat-preference"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.flatTypePreference || "2BHK"}
              onChange={(e) => setForm({ ...form, flatTypePreference: e.target.value })}
            >
              <option value="1BHK">1 BHK</option>
              <option value="2BHK">2 BHK</option>
              <option value="3BHK">3 BHK</option>
              <option value="4BHK">4 BHK</option>
              <option value="STUDIO">Studio</option>
              <option value="PENTHOUSE">Penthouse</option>
            </select>
          </div>
        </div>

        {/* Number of family members */}
        <div className="space-y-1.5">
          <Label htmlFor="family-members" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Number of Family Members <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="family-members"
              type="number"
              min={1}
              max={25}
              className="pl-9"
              value={form.familyMemberCount || 1}
              onChange={(e) =>
                setForm({ ...form, familyMemberCount: Math.max(1, parseInt(e.target.value) || 1) })
              }
              required
            />
          </div>
        </div>

        {/* Preferred Building & Preferred Flat (Optional) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pref-building" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preferred Building (Optional)
            </Label>
            <div className="relative">
              <BuildingIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                id="pref-building"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.preferredBuildingId ? String(form.preferredBuildingId) : ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferredBuildingId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Any Building</option>
                {society?.buildings?.map((b: Building) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pref-flat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preferred Flat No. (Optional)
            </Label>
            <Input
              id="pref-flat"
              placeholder="e.g. D1 or 204"
              value={form.preferredFlatNumber || ""}
              onChange={(e) => setForm({ ...form, preferredFlatNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Emergency Contact & Vehicle */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="emergency-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Emergency Contact Phone (Optional)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="emergency-phone"
                className="pl-9"
                placeholder="e.g. 9876543210"
                value={form.emergencyContactPhone || ""}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary Vehicle No. (Optional)
            </Label>
            <div className="relative">
              <Car className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="vehicle-number"
                className="pl-9"
                placeholder="e.g. KA-05-MB-1234"
                value={form.vehicleNumber || ""}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Important Allocation Rule Notice */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Info className="size-3.5 text-brand-blue" />
            Important Note on Flat Allocation
          </div>
          <p className="mt-1 leading-relaxed">
            Expressed building and flat choices are <strong>preferences only</strong> and do not guarantee or reserve a flat. Society Admin will review availability and make the official allocation.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="bg-brand-blue font-semibold hover:bg-brand-blue/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Submit for Admin Review
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
