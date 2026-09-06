import { type FormEvent, useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Power,
  PowerOff,
  Search,
  Home,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  LoadingState,
  PageIntro,
} from "@/components/societyone";

import {
  residentService,
  societyService,
  type Resident,
  type ResidentProvisionInput,
  type ResidentStatus,
  type ResidentType,
  type UnassignedResident,
} from "@/services";
import type { Society } from "@/types/domain";

import { requireAuth } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/admin/residents")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Resident Management | SocietyOne Admin" },
      {
        name: "description",
        content: "Manage and provision resident accounts for flats in your society.",
      },
    ],
  }),
  component: AdminResidentsPage,
});

function AdminResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<{
    username: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    password: string;
    flatId: string;
    residentType: ResidentType;
  }>({
    username: "",
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    flatId: "",
    residentType: "OWNER",
  });

  const [unassignedResidents, setUnassignedResidents] = useState<UnassignedResident[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | number | null>(null);
  const [assignForm, setAssignForm] = useState<{
    flatId: string;
    residentType: ResidentType;
  }>({
    flatId: "",
    residentType: "OWNER",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [resList, soc, unassigned] = await Promise.all([
        residentService.list(),
        societyService.getSociety(),
        residentService.listUnassigned().catch(() => []),
      ]);
      setResidents(resList);
      setSociety(soc);
      setUnassignedResidents(unassigned);

      if (soc && !form.flatId) {
        const firstFlat = soc.buildings?.[0]?.floors?.[0]?.flats?.[0];
        if (firstFlat) {
          setForm((f) => ({ ...f, flatId: firstFlat.id }));
          setAssignForm((f) => ({ ...f, flatId: firstFlat.id }));
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load residents.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignUnassigned(userId: string | number) {
    if (!assignForm.flatId) {
      setError("Please select a flat to assign this resident.");
      return;
    }
    try {
      setCreating(true);
      setError("");
      setSuccess("");
      await residentService.createResident({
        userId: String(userId),
        flatId: assignForm.flatId,
        residentType: assignForm.residentType,
      });
      setSuccess("Resident assigned to flat successfully!");
      setAssigningUserId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign resident.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.flatId) {
      setError("Please select a flat for this resident.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setCreating(true);

      const input: ResidentProvisionInput = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        mobileNumber: form.mobileNumber.trim(),
        password: form.password,
        flatId: form.flatId,
        residentType: form.residentType,
      };

      const created = await residentService.provisionResident(input);

      setForm({
        username: "",
        fullName: "",
        email: "",
        mobileNumber: "",
        password: "",
        flatId: form.flatId,
        residentType: "OWNER",
      });

      setShowForm(false);
      setSuccess(
        `Resident account "${created.username}" provisioned to Flat ${created.flatNumber} successfully.`,
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to provision resident.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(item: Resident) {
    const newStatus: ResidentStatus =
      item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setError("");
    setSuccess("");
    setUpdatingId(item.id);

    try {
      await residentService.updateStatus(item.id, newStatus);
      setSuccess(
        `Resident "${item.username || item.flatNumber}" marked as ${newStatus.toLowerCase()}.`,
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update resident status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // Flatten all available flats from society
  const allFlats = useMemo(() => {
    if (!society) return [];
    return (society.buildings ?? []).flatMap((building) =>
      (building.floors ?? []).flatMap((floor) =>
        (floor.flats ?? []).map((flat) => ({
          id: flat.id,
          number: flat.number,
          buildingName: building.name,
          floorNumber: floor.number,
        })),
      ),
    );
  }, [society]);

  const filteredResidents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) => {
      const u = r.username?.toLowerCase() || "";
      const f = r.flatNumber?.toLowerCase() || "";
      const b = r.buildingName?.toLowerCase() || "";
      const m = r.mobileNumber?.toLowerCase() || "";
      const e = r.email?.toLowerCase() || "";
      return (
        u.includes(q) ||
        f.includes(q) ||
        b.includes(q) ||
        m.includes(q) ||
        e.includes(q)
      );
    });
  }, [residents, search]);

  return (
    <AppShell title="Residents" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin · People"
        title="Resident management"
        description="Provision, view, and manage resident accounts assigned to residential flats."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue/90"
              onClick={() => {
                setShowForm((v) => !v);
                setError("");
                setSuccess("");
              }}
            >
              <Plus /> Provision resident
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {showForm && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Home className="size-5 text-brand-blue" />
            <div>
              <h2 className="font-semibold text-foreground">
                Provision resident account
              </h2>
              <p className="text-sm text-muted-foreground">
                Assign a user to a flat unit with the RESIDENT role.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="flatId">Flat / Unit</Label>
              <select
                id="flatId"
                value={form.flatId}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, flatId: e.target.value }))
                }
                required
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                {allFlats.length === 0 ? (
                  <option value="">No flats configured in society</option>
                ) : (
                  allFlats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      Flat {flat.number} ({flat.buildingName}, Floor {flat.floorNumber})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="residentType">Resident type</Label>
              <select
                id="residentType"
                value={form.residentType}
                onChange={(e) =>
                  setForm((cur) => ({
                    ...cur,
                    residentType: e.target.value as ResidentType,
                  }))
                }
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
                <option value="FAMILY_MEMBER">Family member</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, fullName: e.target.value }))
                }
                placeholder="e.g. Rajesh Kumar"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, username: e.target.value }))
                }
                placeholder="e.g. rajesh_kumar"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="mobileNumber">Mobile number</Label>
              <Input
                id="mobileNumber"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, mobileNumber: e.target.value }))
                }
                placeholder="+91 99887 77665"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, email: e.target.value }))
                }
                placeholder="e.g. rajesh@example.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">Initial password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((cur) => ({ ...cur, password: e.target.value }))
                }
                placeholder="Minimum 8 characters"
                required
                className="mt-1.5"
              />
            </div>

            <div className="flex items-end gap-2 sm:col-span-2 pt-2">
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  "Provision resident"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {unassignedResidents.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <Users className="size-5 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">
                    Unassigned Registered Residents
                  </h2>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {unassignedResidents.length} Pending Flat
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These residents have created an account but need to be linked to a building and flat.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            {unassignedResidents.map((user) => (
              <div
                key={user.userId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {user.fullName || user.username}
                    <span className="ml-2 text-xs text-muted-foreground">(@{user.username})</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {user.email && <span>Email: {user.email}</span>}
                    {user.mobileNumber && <span>Mobile: {user.mobileNumber}</span>}
                  </div>
                </div>

                {assigningUserId === user.userId ? (
                  <div className="flex flex-wrap items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
                    <select
                      value={assignForm.flatId}
                      onChange={(e) =>
                        setAssignForm((f) => ({ ...f, flatId: e.target.value }))
                      }
                      className="h-8 text-xs rounded border border-input bg-background px-2"
                    >
                      <option value="">Select Flat...</option>
                      {allFlats.map((flat) => (
                        <option key={flat.id} value={flat.id}>
                          Flat {flat.number} ({flat.buildingName}, Fl {flat.floorNumber})
                        </option>
                      ))}
                    </select>

                    <select
                      value={assignForm.residentType}
                      onChange={(e) =>
                        setAssignForm((f) => ({
                          ...f,
                          residentType: e.target.value as ResidentType,
                        }))
                      }
                      className="h-8 text-xs rounded border border-input bg-background px-2"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="TENANT">Tenant</option>
                      <option value="FAMILY_MEMBER">Family member</option>
                    </select>

                    <Button
                      size="sm"
                      className="h-8 text-xs bg-brand-blue hover:bg-brand-blue/90"
                      disabled={creating || !assignForm.flatId}
                      onClick={() => void handleAssignUnassigned(user.userId)}
                    >
                      {creating ? <Loader2 className="size-3 animate-spin" /> : "Confirm"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setAssigningUserId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-brand-blue/50 text-brand-blue hover:bg-brand-blue/10 self-start sm:self-auto"
                    onClick={() => {
                      setAssigningUserId(user.userId);
                      if (allFlats.length > 0 && !assignForm.flatId) {
                        setAssignForm((f) => ({ ...f, flatId: allFlats[0].id }));
                      }
                    }}
                  >
                    Assign Flat
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="font-semibold text-foreground">Assigned residents</h2>
            <p className="text-sm text-muted-foreground">
              {residents.length} resident account{residents.length === 1 ? "" : "s"} across units
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resident or flat..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <LoadingState label="Loading residents..." />
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search
              ? "No residents match your search."
              : "No resident profiles found. Click 'Provision resident' to add one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Flat</th>
                  <th className="px-5 py-3 font-medium">Building</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-foreground">
                      Flat {item.flatNumber}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {item.buildingName}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {item.username}
                    </td>
                    <td className="px-5 py-4">
                      {item.mobileNumber}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {item.email || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {item.residentType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant={item.status === "ACTIVE" ? "outline" : "default"}
                        className={
                          item.status === "ACTIVE"
                            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
                        onClick={() => void handleToggleStatus(item)}
                        disabled={updatingId === item.id}
                      >
                        {updatingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : item.status === "ACTIVE" ? (
                          <>
                            <PowerOff className="mr-1.5 size-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="mr-1.5 size-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
