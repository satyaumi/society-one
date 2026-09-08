import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldPlus, UserRound } from "lucide-react";
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
  const [method, setMethod] = useState<"username_or_email" | "mobile">("username_or_email");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
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
    if (method === "username_or_email") return usernameOrEmail.trim();
    return sanitizeMobile(`${countryCode}${localNumber}`);
  }, [method, usernameOrEmail, countryCode, localNumber]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    if (method === "username_or_email") {
      const trimmed = usernameOrEmail.trim();
      if (!trimmed) {
        setFieldError("Please enter your username or email address.");
        return;
      }
      if (trimmed.includes("@")) {
        const emailErr = validateEmail(trimmed);
        if (emailErr) {
          setFieldError(emailErr);
          return;
        }
      } else if (trimmed.length < 3) {
        setFieldError("Username must be at least 3 characters.");
        return;
      }
    } else {
      const mobileErr = validateMobile(countryCode, localNumber);
      if (mobileErr) {
        setFieldError(mobileErr);
        return;
      }
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    
    try {
      const res = await authService.login({
        method,
        identifier,
        password,
        intendedRole: role,
      });
      if (res.user.role === "PLATFORM_ADMIN") {
        await navigate({ to: "/platform" });
      } else {
        await navigate({ to: "/dashboard" });
      }
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
      const res = await authService.loginWithGoogle();
      if (res.user.role === "PLATFORM_ADMIN") {
        await navigate({ to: "/platform" });
      } else {
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  const isPlatformAdminMode = role === "PLATFORM_ADMIN";

  return (
    <AuthLayout
      eyebrow={isPlatformAdminMode ? "Restricted Operational Area" : "Account"}
      title={isPlatformAdminMode ? "Platform Management Sign In" : "Log in to SocietyOne"}
      subtitle={
        isPlatformAdminMode
          ? "Restricted access for authorized platform management and super administrators."
          : "Enter your username or email, otherwise your mobile number, to continue to your workspace."
      }
    >
      {isPlatformAdminMode && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-blue/30 bg-blue-50/80 dark:bg-blue-950/40 p-4 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
          <ShieldPlus className="size-5 text-brand-blue shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Authorized Management Authentication</p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300">
              Only verified platform administrators with elevated permissions may access the SocietyOne Management Portal.
            </p>
          </div>
        </div>
      )}

      {setupAvailable && !isPlatformAdminMode && (
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

      {role === "VISITOR" && (
        <div className="mb-6 rounded-xl border border-brand-orange/30 bg-warning-soft p-4 text-sm leading-6 text-accent-foreground">
          <p className="font-semibold">Visitors do not need an account.</p>
          <p className="mt-1 text-xs">You can submit an instant visit request directly without logging in.</p>
          <Button asChild size="sm" variant="outline" className="mt-3 border-brand-orange/40 font-semibold">
            <Link to="/invite">Submit Instant Visitor Request →</Link>
          </Button>
        </div>
      )}

      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        <AuthMethodToggle<"username_or_email" | "mobile">
          value={method}
          onChange={(newMethod) => {
            setMethod(newMethod);
            setFieldError(null);
          }}
          labels={{
            username_or_email: "Username / Email",
            mobile: "Mobile Number",
          }}
        />

        {method === "username_or_email" ? (
          <div>
            <Label htmlFor="login-username-or-email">
              <UserRound className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Username or Email
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="login-username-or-email"
              className="mt-2"
              type="text"
              autoComplete="username"
              placeholder="Enter username or email address"
              value={usernameOrEmail}
              disabled={loading}
              onChange={(event) => {
                setUsernameOrEmail(event.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
            {fieldError && method === "username_or_email" && (
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
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90 font-semibold"
        >
          {loading && <Loader2 className="animate-spin mr-2" />}
          {loading ? "Verifying credentials..." : isPlatformAdminMode ? "Sign In to Management" : "Log in"}
        </Button>
      </form>

      {!isPlatformAdminMode && (
        <>
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
        </>
      )}

      {isPlatformAdminMode && (
        <div className="mt-8 pt-4 border-t border-border text-center">
          <Link
            to="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Public Website
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
