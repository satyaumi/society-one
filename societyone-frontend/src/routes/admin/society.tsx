import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormError } from "@/components/auth/authformError";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { requireAuth } from "@/lib/auth/require-auth";
import { toUserError } from "@/lib/auth/error-mapper";
import { authService, societyService } from "@/services";
import type { Building, Society, User } from "@/types/domain";
import type { SocietyInput as SocietyFormInput } from "@/services";

export const Route = createFileRoute("/admin/society")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Society structure | SocietyOne Admin" },
      { name: "description", content: "Admin view of buildings, floors, and flats." },
    ],
  }),
  component: AdminSocietyPage,
});

function formatSocietyAddress(society: Society) {
  const parts = [society.address, society.city, society.state, society.postalCode].filter(
    (part) => part && part.trim(),
  );
  return parts.join(", ");
}

function AdminSocietyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reloadSociety() {
    const soc = await societyService.getSociety();
    setSociety(soc);
    return soc;
  }

  useEffect(() => {
    let mounted = true;
    Promise.all([authService.getCurrentUser(), societyService.getSociety()])
      .then(([currentUser, soc]) => {
        if (!mounted) return;
        setUser(currentUser);
        setSociety(soc);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(toUserError(err, "Could not load society structure."));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const totalFlats =
    society?.buildings.reduce(
      (acc: number, b: Building) => acc + b.floors.reduce((a, f) => a + f.flats.length, 0),
      0,
    ) ?? 0;
  const totalResidents =
    society?.buildings.reduce(
      (acc: number, b: Building) =>
        acc +
        b.floors.reduce((a, f) => a + f.flats.reduce((r, flat) => r + flat.residentIds.length, 0), 0),
      0,
    ) ?? 0;

  if (loading) {
    return (
      <AppShell title="Society structure" eyebrow="Admin">
        <LoadingState label="Loading society structure..." />
      </AppShell>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <AppShell title="Society structure" eyebrow="Admin">
        <EmptyState
          title="Admin access required"
          description="Only society administrators can manage buildings, floors, and flats."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Society structure" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin · Society"
        title={society?.name ?? "Set up your society"}
        description={
          society
            ? `${formatSocietyAddress(society)} — create towers, floors, and flats. Changes are saved to the database.`
            : "Create the society first. Then add buildings, floors, and flats. This structure is stored in PostgreSQL."
        }
        action={
          <Button asChild variant="outline">
            <Link to="/admin/visitors">
              <Users /> Visitor activity
            </Link>
          </Button>
        }
      />
      <AuthFormError message={error} className="mt-6" />
      {notice ? (
        <p className="mt-4 rounded-xl border border-brand-blue/20 bg-info-soft px-4 py-3 text-sm text-brand-blue">
          {notice}
        </p>
      ) : null}
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {!society ? (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title="Create society" />
            <SocietyForm
              submitLabel="Create society"
              onSubmit={async (input) => {
                setError(null);
                setNotice(null);
                const created = await societyService.createSociety(input);
                setSociety(created);
                setNotice("Society saved. You can add buildings next.");
              }}
              onError={setError}
            />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeading title="Society details" />
              <SocietyForm
                initial={society}
                submitLabel="Save society"
                onSubmit={async (input) => {
                  setError(null);
                  setNotice(null);
                  const updated = await societyService.updateSociety(society.id, input);
                  setSociety(updated);
                  setNotice("Society details updated.");
                }}
                onError={setError}
              />
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeading title="Buildings" />
              <AddBuildingForm
                onSubmit={async (name) => {
                  setError(null);
                  setNotice(null);
                  await societyService.createBuilding(society.id, { name });
                  await reloadSociety();
                  setNotice(`${name} added.`);
                }}
                onError={setError}
              />
              {society.buildings.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No buildings yet. Add a tower such as Tower A.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {society.buildings.map((building) => (
                    <BuildingEditor
                      key={building.id}
                      building={building}
                      onChange={async () => {
                        setError(null);
                        await reloadSociety();
                      }}
                      onNotice={setNotice}
                      onError={setError}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        <div className="space-y-5">
          <div className="rounded-xl border border-brand-blue/15 bg-info-soft p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-blue">Summary</p>
            <h3 className="mt-3 font-display text-xl font-bold">{society?.name ?? "Not created yet"}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {society ? formatSocietyAddress(society) : "Save a society to start mapping towers and flats."}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Buildings</dt>
                <dd className="mt-1 font-display text-xl font-bold">{society?.buildings.length ?? 0}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Flats</dt>
                <dd className="mt-1 font-display text-xl font-bold">{totalFlats}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Residents linked</dt>
                <dd className="mt-1 font-display text-xl font-bold">{totalResidents}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1 font-display text-xl font-bold">{society?.status ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SocietyForm({
  initial,
  submitLabel,
  onSubmit,
  onError,
}: {
  initial?: Society;
  submitLabel: string;
  onSubmit: (input: SocietyFormInput) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const input: SocietyFormInput = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
      };
      if (contactPhone.trim()) input.contactPhone = contactPhone.trim();
      if (contactEmail.trim()) input.contactEmail = contactEmail.trim();
      await onSubmit(input);
    } catch (err) {
      onError(toUserError(err, "Could not save the society."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field id="society-name" label="Society name" value={name} onChange={setName} required className="sm:col-span-2" />
      <Field id="society-address" label="Street address" value={address} onChange={setAddress} required className="sm:col-span-2" />
      <Field id="society-city" label="City" value={city} onChange={setCity} required />
      <Field id="society-state" label="State" value={state} onChange={setState} required />
      <Field id="society-postal" label="Postal code" value={postalCode} onChange={setPostalCode} required />
      <Field id="society-phone" label="Contact phone" value={contactPhone} onChange={setContactPhone} />
      <Field
        id="society-email"
        label="Contact email"
        value={contactEmail}
        onChange={setContactEmail}
        type="email"
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <Button type="submit" className="bg-brand-blue" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function AddBuildingForm({
  onSubmit,
  onError,
}: {
  onSubmit: (name: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim());
      setName("");
    } catch (err) {
      onError(toUserError(err, "Could not add the building."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Tower A"
        required
        aria-label="Building name"
      />
      <Button type="submit" disabled={saving} className="bg-brand-blue sm:w-auto">
        {saving ? "Adding..." : "Add building"}
      </Button>
    </form>
  );
}

function BuildingEditor({
  building,
  onChange,
  onNotice,
  onError,
}: {
  building: Building;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [floorNumber, setFloorNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const inactive = building.status === "INACTIVE";

  async function addFloor(event: React.FormEvent) {
    event.preventDefault();
    const number = Number(floorNumber);
    if (!Number.isInteger(number)) return;
    setSaving(true);
    try {
      await societyService.createFloor(building.id, { number });
      setFloorNumber("");
      onNotice(`Floor ${number} added to ${building.name}.`);
      await onChange();
    } catch (err) {
      onError(toUserError(err, "Could not add the floor."));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    setSaving(true);
    try {
      await societyService.updateBuilding(building.id, { name: building.name, status: "INACTIVE" });
      onNotice(`${building.name} deactivated.`);
      await onChange();
    } catch (err) {
      onError(toUserError(err, "Could not deactivate the building."));
    } finally {
      setSaving(false);
    }
  }

  async function reactivate() {
    setSaving(true);
    try {
      await societyService.updateBuilding(building.id, { name: building.name, status: "ACTIVE" });
      onNotice(`${building.name} is active again.`);
      await onChange();
    } catch (err) {
      onError(toUserError(err, "Could not reactivate the building."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="group rounded-xl border border-border bg-background p-4 open:bg-secondary/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-info-soft text-brand-blue">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="font-semibold">
              {building.name}
              {inactive ? <span className="ml-2 text-xs font-medium text-muted-foreground">Inactive</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {building.floors.length} floor{building.floors.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {inactive ? (
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void reactivate()}>
              Reactivate
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void deactivate()}>
              Deactivate
            </Button>
          )}
        </div>
        <form onSubmit={addFloor} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="number"
            min={0}
            max={200}
            value={floorNumber}
            onChange={(event) => setFloorNumber(event.target.value)}
            placeholder="Floor number"
            required
            aria-label={`Floor number for ${building.name}`}
          />
          <Button type="submit" size="sm" disabled={saving || inactive}>
            {saving ? "Adding..." : "Add floor"}
          </Button>
        </form>
        {building.floors.map((floor) => (
          <FloorEditor
            key={floor.id}
            buildingName={building.name}
            floor={floor}
            disabled={inactive || floor.status === "INACTIVE"}
            onChange={onChange}
            onNotice={onNotice}
            onError={onError}
          />
        ))}
      </div>
    </details>
  );
}

function FloorEditor({
  buildingName,
  floor,
  disabled,
  onChange,
  onNotice,
  onError,
}: {
  buildingName: string;
  floor: Building["floors"][number];
  disabled: boolean;
  onChange: () => Promise<void>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [flatNumber, setFlatNumber] = useState("");
  const [saving, setSaving] = useState(false);

  async function addFlat(event: React.FormEvent) {
    event.preventDefault();
    if (!flatNumber.trim()) return;
    setSaving(true);
    try {
      await societyService.createFlat(floor.id, { number: flatNumber.trim() });
      onNotice(`${flatNumber.trim()} added on floor ${floor.number}.`);
      setFlatNumber("");
      await onChange();
    } catch (err) {
      onError(toUserError(err, "Could not add the flat."));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateFlat(id: string, number: string) {
    setSaving(true);
    try {
      await societyService.updateFlat(id, { number, status: "INACTIVE" });
      onNotice(`Flat ${number} deactivated.`);
      await onChange();
    } catch (err) {
      onError(toUserError(err, "Could not deactivate the flat."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          Floor {floor.number}
          {floor.status === "INACTIVE" ? " · Inactive" : ""}
        </span>
        <span>
          {floor.flats.length} flat{floor.flats.length === 1 ? "" : "s"}
        </span>
      </div>
      <form onSubmit={addFlat} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={flatNumber}
          onChange={(event) => setFlatNumber(event.target.value)}
          placeholder={`${buildingName.replace(/\s+/g, "").slice(0, 1) || "A"}101`}
          required
          disabled={disabled}
          aria-label={`Flat number on floor ${floor.number}`}
        />
        <Button type="submit" size="sm" disabled={saving || disabled}>
          {saving ? "Adding..." : "Add flat"}
        </Button>
      </form>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {floor.flats.map((flat) => (
          <div key={flat.id} className="flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-2 text-sm">
            <Home className="size-3.5 text-brand-blue" />
            <span className="font-semibold">{flat.number}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {flat.status === "INACTIVE"
                ? "Inactive"
                : `${flat.residentIds.length} resident${flat.residentIds.length === 1 ? "" : "s"}`}
            </span>
            {flat.status !== "INACTIVE" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                disabled={saving}
                onClick={() => void deactivateFlat(flat.id, flat.number)}
              >
                Deactivate
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2"
      />
    </div>
  );
}
