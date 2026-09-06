import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Power,
  PowerOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppShell,
  LoadingState,
  PageIntro,
} from "@/components/societyone";

import {
  securityStaffService,
  type SecurityStaff,
  type SecurityStaffStatus,
} from "@/services";

import { requireAuth } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/admin/security-staff")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Security Staff | SocietyOne" },
      {
        name: "description",
        content: "Manage security staff for the society.",
      },
    ],
  }),
  component: SecurityStaffPage,
});

function SecurityStaffPage() {
  const [staff, setStaff] = useState<SecurityStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
  });

  async function loadStaff() {
    try {
      setLoading(true);
      setError("");

      const data = await securityStaffService.list();
      setStaff(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load security staff.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setCreating(true);

      const created = await securityStaffService.create(form);

      setForm({
        username: "",
        fullName: "",
        email: "",
        mobileNumber: "",
        password: "",
      });

      setShowForm(false);
      setSuccess(`Security staff "${created.fullName}" created successfully.`);
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create security staff.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(member: SecurityStaff) {
    const newStatus: SecurityStaffStatus =
      member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setError("");
    setSuccess("");
    setUpdatingId(member.id);

    try {
      await securityStaffService.updateStatus(member.id, newStatus);
      setSuccess(
        `Staff member "${member.fullName}" marked as ${newStatus.toLowerCase()}.`,
      );
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update staff status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AppShell title="Security Staff" eyebrow="Admin">
      <PageIntro
        eyebrow="Security"
        title="Security staff management"
        description="Create and manage gate security personnel accounts assigned to your society."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void loadStaff()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>

            <Button
              className="bg-brand-blue hover:bg-brand-blue/90"
              onClick={() => {
                setShowForm((value) => !value);
                setError("");
                setSuccess("");
              }}
            >
              <Plus />
              Add security staff
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
            <ShieldCheck className="size-5 text-brand-blue" />
            <div>
              <h2 className="font-semibold">Create security account</h2>
              <p className="text-sm text-muted-foreground">
                The account will automatically receive the SECURITY role and have access to gate operations.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <Field
              label="Full name"
              value={form.fullName}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  fullName: value,
                }))
              }
              placeholder="e.g. Ramesh Singh"
              required
            />

            <Field
              label="Username"
              value={form.username}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  username: value,
                }))
              }
              placeholder="e.g. ramesh_gate1"
              required
            />

            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  email: value,
                }))
              }
              placeholder="e.g. ramesh@example.com"
              required
            />

            <Field
              label="Mobile number"
              value={form.mobileNumber}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  mobileNumber: value,
                }))
              }
              placeholder="e.g. +91 98765 43210"
              required
            />

            <div className="md:col-span-2">
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    password: value,
                  }))
                }
                placeholder="Minimum 8 characters"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Password should be at least 8 characters long and contain letters and numbers.
              </p>
            </div>

            <div className="flex items-end gap-2 md:col-span-2">
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create account"
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

      <section className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h2 className="font-semibold">Security staff members</h2>
          <p className="text-sm text-muted-foreground">
            {staff.length} staff account{staff.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <LoadingState label="Loading security staff..." />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No security staff accounts found. Click "Add security staff" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Society</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium">
                      {member.fullName}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {member.username}
                    </td>

                    <td className="px-5 py-4">
                      {member.email}
                    </td>

                    <td className="px-5 py-4">
                      {member.mobileNumber}
                    </td>

                    <td className="px-5 py-4">
                      {member.societyName}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          member.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant={member.status === "ACTIVE" ? "outline" : "default"}
                        className={
                          member.status === "ACTIVE"
                            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
                        onClick={() => void handleToggleStatus(member)}
                        disabled={updatingId === member.id}
                      >
                        {updatingId === member.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : member.status === "ACTIVE" ? (
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
      />
    </label>
  );
}