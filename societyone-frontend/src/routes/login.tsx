import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldPlus } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/authmethodtoggle";
import { AuthFormError } from "@/components/auth/authformError";
import { GoogleButton } from "@/components/auth/googlebutton";
import { MobileField } from "@/components/auth/mobilefield";
import { PasswordField } from "@/components/auth/passwordfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { credentialsErrorMessage, toUserError } from "@/lib/auth/error-mapper";
import { parseIntendedRole } from "@/lib/auth/intended-role";
import { sanitizeMobile, validateEmail, validateMobile } from "@/lib/auth/password-validators";
import { ApiError } from "@/lib/auth/auth-api-client";
import { authService } from "@/services";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: parseIntendedRole(search.role),
  }),
  head: () => ({
    meta: [
      { title: "Log in | SocietyOne" },
      { name: "description", content: "Log in to your SocietyOne account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // ---- First-admin setup banner ----
  // Show the "bootstrap the society" CTA only when the backend reports ZERO admins.
  // After first admin is created, this banner disappears permanently until DB reset.
  const [setupAvailable, setSetupAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    authService
      .getSetupStatus()
      .then((s) => {
        if (mounted) setSetupAvailable(s.available);
      })
      .catch(() => {
        // Backend unreachable — don't show confusing banner.
        if (mounted) setSetupAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const identifier = useMemo(() => {
    if (method === "email") return email.trim();
    return sanitizeMobile(`${countryCode}${localNumber}`);
  }, [method, email, countryCode, localNumber]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    const identifierError =
      method === "email"
        ? validateEmail(email)
        : validateMobile(countryCode, localNumber);
    if (identifierError) {
      setFieldError(identifierError);
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    
    try {
      await authService.login({
        method,
        identifier,
        password,
        intendedRole: role,
      });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.code === "INVALID_CREDENTIALS")) {
        setError(credentialsErrorMessage(method));
      } else {
        setError(toUserError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await authService.loginWithGoogle();
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Log in to SocietyOne"
      subtitle="Use your email or mobile number to continue to your workspace."
    >
      {setupAvailable && (
        <Link
          to="/setup-admin"
          className="mb-6 flex items-start gap-3 rounded-xl border border-brand-blue/30 bg-info-soft px-4 py-3.5 text-left transition hover:border-brand-blue/60 hover:bg-brand-blue/10"
        >
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-blue text-white shadow-sm">
            <ShieldPlus className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              First time setting up SocietyOne?
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              No administrator exists yet. Create the first admin account to bootstrap your society.
            </p>
            <span className="mt-2 inline-flex items-center text-xs font-semibold text-brand-blue">
              Set up admin →
            </span>
          </div>
        </Link>
      )}

      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        <AuthMethodToggle value={method} onChange={setMethod} />

        {method === "email" ? (
          <div>
            <Label htmlFor="login-email">
              <Mail className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Email
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="login-email"
              className="mt-2"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
            />
            {fieldError && method === "email" && (
              <p className="mt-2 text-xs font-medium text-destructive">{fieldError}</p>
            )}
          </div>
        ) : (
          <MobileField
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            localNumber={localNumber}
            onLocalNumberChange={setLocalNumber}
            error={fieldError}
            disabled={loading}
          />
        )}

        <div>
          <div className="mb-2 flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-brand-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordField
            value={password}
            onChange={setPassword}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Signing in..." : "Log in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={onGoogle} loading={googleLoading} disabled={loading} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to SocietyOne?{" "}
        <Link
          to="/signup"
          search={{ role }}
          className="font-semibold text-brand-blue hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
