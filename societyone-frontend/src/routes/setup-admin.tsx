import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/authmethodtoggle";
import { AuthFormError } from "@/components/auth/authformError";
import { MobileField } from "@/components/auth/mobilefield";
import { PasswordField } from "@/components/auth/passwordfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserError } from "@/lib/auth/error-mapper";
import {
  passwordMeetsPolicy,
  sanitizeMobile,
  validateEmail,
  validateMobile,
  validateUsername,
} from "@/lib/auth/password-validators";
import { authService } from "@/services";
import type { SetupStatus } from "@/services";

export const Route = createFileRoute("/setup-admin")({
  head: () => ({
    meta: [
      { title: "Create society admin | SocietyOne" },
      { name: "description", content: "Bootstrap the first SocietyOne administrator account." },
    ],
  }),
  component: SetupAdminPage,
});

function SetupAdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Poll setup status on mount. If setup is not available, bounce to login.
  useEffect(() => {
    let mounted = true;
    setStatusLoading(true);
    setStatusError(null);
    authService
      .getSetupStatus()
      .then((s) => {
        if (!mounted) return;
        setStatus(s);
        if (!s.available) {
          // Admin already exists → this wizard is permanently closed.
          void navigate({ to: "/login" }, { replace: true });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setStatusError(toUserError(err));
      })
      .finally(() => {
        if (mounted) setStatusLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ---- Form state ----
  const [method, setMethod] = useState<AuthMethod>("email");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mobile = useMemo(
    () => sanitizeMobile(`${countryCode}${localNumber}`),
    [countryCode, localNumber],
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Full name is required.";
    const usernameError = validateUsername(username);
    if (usernameError) next.username = usernameError;
    if (method === "email") {
      const emailError = validateEmail(email);
      if (emailError) next.email = emailError;
    } else {
      const mobileError = validateMobile(countryCode, localNumber);
      if (mobileError) next.mobile = mobileError;
    }
    if (!passwordMeetsPolicy(password)) {
      next.password = "Password does not meet requirements.";
    }
    if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await authService.provisionFirstAdmin({
        fullName: fullName.trim(),
        username: username.trim(),
        email: method === "email" ? email.trim() : email.trim() || undefined,
        mobileNumber: method === "mobile" ? mobile : localNumber.trim() ? mobile : undefined,
        password,
        intendedRole: "ADMIN",
      });
      // provisionFirstAdmin auto-stores the JWT via authStore.setAuthenticated.
      // Send the new admin straight to their workspace.
      await navigate({ to: "/admin" }, { replace: true });
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setSaving(false);
    }
  }

  if (statusLoading) {
    return (
      <AuthLayout
        eyebrow="Setup"
        title="Checking system status"
        subtitle="One moment while we verify whether this society needs bootstrapping."
      >
        <div className="flex items-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="animate-spin" /> <span>Checking for existing administrators…</span>
        </div>
      </AuthLayout>
    );
  }

  if (statusError) {
    return (
      <AuthLayout
        eyebrow="Setup"
        title="Could not reach the server"
        subtitle="We could not check whether first-admin setup is available."
      >
        <AuthFormError message={statusError} />
        <div className="mt-5 flex justify-end">
          <Button
            className="bg-brand-blue"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!status?.available) {
    // setup-status fetch resolved but available=false → we're navigating to /login.
    return null;
  }

  return (
    <AuthLayout
      eyebrow="Society setup"
      title="Create the first administrator"
      subtitle="This account will manage the society, invite residents, and configure security staff. Once created, this wizard closes permanently."
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-blue/25 bg-info-soft px-4 py-3 text-sm leading-6 text-accent-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-blue" />
        <div>
          <p className="font-semibold text-foreground">Single-use setup wizard</p>
          <p className="text-muted-foreground">
            For security, this page is only available until the first ADMIN account is created.
            Afterwards, all additional admins must be invited by an existing administrator.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />

        <AuthMethodToggle
          value={method}
          onChange={setMethod}
          labels={{ email: "Email", mobile: "Mobile" }}
        />

        <div>
          <Label htmlFor="setup-name">
            <UserRound className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
            Full name
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="setup-name"
            className="mt-2"
            autoComplete="name"
            value={fullName}
            disabled={saving}
            onChange={(event) => setFullName(event.target.value)}
          />
          {fieldErrors.fullName && (
            <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="setup-username">
            Username<span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="setup-username"
            className="mt-2"
            autoComplete="username"
            value={username}
            disabled={saving}
            onChange={(event) => setUsername(event.target.value)}
          />
          {fieldErrors.username && (
            <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.username}</p>
          )}
        </div>

        {method === "email" ? (
          <div>
            <Label htmlFor="setup-email">
              <Mail className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Email
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="setup-email"
              className="mt-2"
              type="email"
              autoComplete="email"
              value={email}
              disabled={saving}
              onChange={(event) => setEmail(event.target.value)}
            />
            {fieldErrors.email && (
              <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.email}</p>
            )}
          </div>
        ) : (
          <MobileField
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            localNumber={localNumber}
            onLocalNumberChange={setLocalNumber}
            error={fieldErrors.mobile}
            disabled={saving}
          />
        )}

        <PasswordField
          id="setup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showStrength
          error={fieldErrors.password}
          disabled={saving}
        />
        <PasswordField
          id="setup-confirm"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={saving}
        />

        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {saving && <Loader2 className="animate-spin" />}
          <Lock className={saving ? "hidden" : ""} />
          {saving ? "Creating administrator..." : "Create administrator & sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
