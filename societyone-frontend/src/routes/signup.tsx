import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldPlus, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/authmethodtoggle";
import { AuthFormError } from "@/components/auth/authformError";
import { MobileField } from "@/components/auth/mobilefield";
import { PasswordField } from "@/components/auth/passwordfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserError } from "@/lib/auth/error-mapper";
import { isPublicSelfServeRole, parseIntendedRole } from "@/lib/auth/intended-role";
import {
  passwordMeetsPolicy,
  sanitizeMobile,
  validateEmail,
  validateMobile,
  validateUsername,
} from "@/lib/auth/password-validators";
import { authService } from "@/services";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: parseIntendedRole(search.role),
  }),
  head: () => ({
    meta: [
      { title: "Create account | SocietyOne" },
      { name: "description", content: "Create a SocietyOne resident or visitor account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const publicRole = isPublicSelfServeRole(role) ? role : undefined;
  const [method, setMethod] = useState<AuthMethod>("email");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ---- First-admin setup banner ----
  const [setupAvailable, setSetupAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    authService
      .getSetupStatus()
      .then((s) => {
        if (mounted) setSetupAvailable(s.available);
      })
      .catch(() => {
        if (mounted) setSetupAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    if (role === "ADMIN" || role === "SECURITY") {
      setError("Security and admin accounts are created by your society, not from this page.");
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.signup({
        fullName: fullName.trim(),
        username: username.trim(),
        email: method === "email" ? email.trim() : email.trim() || undefined,
        mobileNumber: method === "mobile" ? mobile : localNumber.trim() ? mobile : undefined,
        password,
        intendedRole: publicRole,
      });
      if ("needsVerification" in result) {
        const identifier = method === "email" ? email.trim() : mobile;
        await navigate({
          to: "/verify-otp",
          search: { identifier, purpose: "SIGNUP" },
        });
        return;
      }
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Create your SocietyOne account"
      subtitle="Resident and visitor registration is open. Security and admin access is issued by your society."
    >
      {setupAvailable && (
        <Link
          to="/setup-admin"
          className="mb-5 flex items-start gap-3 rounded-xl border border-brand-blue/30 bg-info-soft px-4 py-3.5 text-left transition hover:border-brand-blue/60 hover:bg-brand-blue/10"
        >
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-blue text-white shadow-sm">
            <ShieldPlus className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              First time? Set up the society administrator
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              No administrator exists yet. Use the admin setup wizard to create the first admin account.
            </p>
            <span className="mt-2 inline-flex items-center text-xs font-semibold text-brand-blue">
              Open admin setup →
            </span>
          </div>
        </Link>
      )}

      {role === "VISITOR" && (
        <div className="mb-5 rounded-xl border border-brand-orange/30 bg-warning-soft p-4 text-sm leading-6 text-accent-foreground">
          <p className="font-semibold">Visitors do not require an account.</p>
          <p className="mt-1 text-xs">You can submit a visit request directly without signing up.</p>
          <Button asChild size="sm" variant="outline" className="mt-3 border-brand-orange/40 font-semibold">
            <Link to="/invite">Submit Visitor Request →</Link>
          </Button>
        </div>
      )}

      {(role === "ADMIN" || role === "SECURITY") && (
        <div className="mb-5 rounded-xl border border-brand-orange/30 bg-warning-soft px-4 py-3 text-sm leading-6 text-accent-foreground">
          {role === "ADMIN" ? "Admin" : "Security"} accounts cannot be self-registered. Sign in if you already have an invitation, or contact your society administrator.
        </div>
      )}

      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        <AuthMethodToggle
          value={method}
          onChange={setMethod}
          labels={{ email: "Email", mobile: "Mobile" }}
        />

        <div>
          <Label htmlFor="signup-name">
            <UserRound className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
            Full name
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="signup-name"
            className="mt-2"
            autoComplete="name"
            value={fullName}
            disabled={loading}
            onChange={(event) => setFullName(event.target.value)}
          />
          {fieldErrors.fullName && (
            <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="signup-username">Username<span className="ml-1 text-destructive">*</span></Label>
          <Input
            id="signup-username"
            className="mt-2"
            autoComplete="username"
            value={username}
            disabled={loading}
            onChange={(event) => setUsername(event.target.value)}
          />
          {fieldErrors.username && (
            <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.username}</p>
          )}
        </div>

        {method === "email" ? (
          <div>
            <Label htmlFor="signup-email">
              <Mail className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Email
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="signup-email"
              className="mt-2"
              type="email"
              autoComplete="email"
              value={email}
              disabled={loading}
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
            disabled={loading}
          />
        )}

        <PasswordField
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showStrength
          error={fieldErrors.password}
          disabled={loading}
        />
        <PasswordField
          id="signup-confirm"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={loading}
        />

        <Button
          type="submit"
          disabled={loading || role === "ADMIN" || role === "SECURITY"}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" search={{ role }} className="font-semibold text-brand-blue hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
