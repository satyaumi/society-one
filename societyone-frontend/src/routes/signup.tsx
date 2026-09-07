import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldPlus, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/authmethodtoggle";
import { AuthFormError } from "@/components/auth/authformError";
import { MobileField } from "@/components/auth/mobilefield";
import { OtpInput, ResendOtpButton } from "@/components/auth/otpinput";
import { PasswordField } from "@/components/auth/passwordfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/auth/auth-api-client";
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

type EmailSignupStep = "ENTER_EMAIL" | "VERIFY_OTP" | "COMPLETE_DETAILS";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: parseIntendedRole(search.role),
  }),
  head: () => ({
    meta: [
      { title: "Create account | SocietyOne" },
      { name: "description", content: "Create a SocietyOne resident account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { role } = Route.useSearch();
  const publicRole = isPublicSelfServeRole(role) ? role : undefined;

  const [method, setMethod] = useState<AuthMethod>("email");
  const [emailStep, setEmailStep] = useState<EmailSignupStep>("ENTER_EMAIL");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP Verification state
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Status & errors
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

  function handleMethodChange(next: AuthMethod) {
    setMethod(next);
    setError(null);
    setFieldErrors({});
    setOtpError(null);
    setResendMessage(null);
  }

  // ---- Email Step 1: Send OTP ----
  async function onSendEmailOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendOtp({
        identifier: email.trim(),
        purpose: "SIGNUP_EMAIL",
      });
      setEmailStep("VERIFY_OTP");
      if (res?.devOtp) {
        setOtp(res.devOtp);
        setResendMessage(`Verification code sent! (Sandbox Code: ${res.devOtp})`);
      } else {
        setResendMessage("Verification code sent to your email.");
      }
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Email Step 2: Verify OTP ----
  async function onVerifyEmailOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOtpError(null);
    setResendMessage(null);

    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length < 6) {
      setOtpError("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyOtp({
        identifier: email.trim(),
        otp: cleanOtp,
        purpose: "SIGNUP_EMAIL",
      });

      if ("token" in res) {
        await navigate({ to: "/dashboard" });
        return;
      }

      if ("verificationToken" in res && res.verificationToken) {
        setVerificationToken(res.verificationToken);
        setEmailStep("COMPLETE_DETAILS");
        return;
      }

      // Fallback if verification succeeded without token in response
      setEmailStep("COMPLETE_DETAILS");
    } catch (err) {
      if (err instanceof ApiError && err.code === "OTP_EXPIRED") {
        setOtpError("OTP expired. Click resend to receive a fresh code.");
      } else if (err instanceof ApiError && err.code === "OTP_INVALID") {
        setOtpError("Invalid OTP. Double check the code sent to your email.");
      } else {
        setError(toUserError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Resend OTP handler ----
  async function onResendOtp() {
    setError(null);
    setOtpError(null);
    setResendMessage(null);
    setResending(true);
    try {
      const res = await authService.sendOtp({
        identifier: email.trim(),
        purpose: "SIGNUP_EMAIL",
      });
      if (res?.devOtp) {
        setOtp(res.devOtp);
        setResendMessage(`A new verification code has been sent! (Sandbox Code: ${res.devOtp})`);
      } else {
        setResendMessage("A new verification code has been sent to your email.");
      }
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setResending(false);
    }
  }

  // ---- Final Validation & Account Creation ----
  function validateDetails(): boolean {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Full name is required.";
    const usernameError = validateUsername(username);
    if (usernameError) next.username = usernameError;

    if (method === "mobile") {
      const mobileError = validateMobile(countryCode, localNumber);
      if (mobileError) next.mobile = mobileError;
    } else if (localNumber.trim()) {
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

  async function onFinalSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (role === "ADMIN" || role === "SECURITY") {
      setError("Security and admin accounts are created by your society, not from this page.");
      return;
    }
    if (!validateDetails()) return;

    setLoading(true);
    try {
      await authService.signup({
        fullName: fullName.trim(),
        username: username.trim(),
        email: method === "email" ? email.trim() : undefined,
        verificationToken: method === "email" ? verificationToken || undefined : undefined,
        mobileNumber: method === "mobile" ? mobile : localNumber.trim() ? mobile : undefined,
        password,
        intendedRole: publicRole,
      });

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
      subtitle="Resident registration is open. Security and admin access is issued by your society."
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

      <AuthFormError message={error} />

      {/* Only show method toggle during initial step */}
      {emailStep === "ENTER_EMAIL" && (
        <div className="mb-5">
          <AuthMethodToggle
            value={method}
            onChange={handleMethodChange}
            labels={{ email: "Email", mobile: "Mobile" }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOW 1: EMAIL SIGNUP (Enter Email -> Verify OTP -> Complete) */}
      {/* ======================================================== */}
      {method === "email" && emailStep === "ENTER_EMAIL" && (
        <form className="space-y-5" onSubmit={onSendEmailOtp}>
          <div>
            <Label htmlFor="signup-email">
              <Mail className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Email Address
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="signup-email"
              className="mt-2"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
            />
            {fieldErrors.email && (
              <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.email}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              We will send a 6-digit verification code to verify this email address.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || role === "ADMIN" || role === "SECURITY"}
            className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Sending verification code..." : "Send Verification Code"}
          </Button>
        </form>
      )}

      {method === "email" && emailStep === "VERIFY_OTP" && (
        <form className="space-y-6" onSubmit={onVerifyEmailOtp}>
          <div className="rounded-xl border border-brand-blue/20 bg-info-soft p-4 text-sm text-foreground">
            <p className="font-semibold text-brand-blue">Verification Code Sent</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please enter the 6-digit verification code sent to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>

          {resendMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {resendMessage}
            </div>
          )}

          <OtpInput
            value={otp}
            onChange={setOtp}
            error={otpError}
            autoFocus
            disabled={loading}
          />

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Verifying..." : "Verify Code & Continue"}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setEmailStep("ENTER_EMAIL");
                setOtp("");
                setOtpError(null);
                setResendMessage(null);
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Change email
            </button>
            <ResendOtpButton
              onResend={onResendOtp}
              isSending={resending}
              disabled={!email}
            />
          </div>
        </form>
      )}

      {method === "email" && emailStep === "COMPLETE_DETAILS" && (
        <form className="space-y-5" onSubmit={onFinalSubmit}>
          {/* Verified email banner */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs sm:text-sm">
                Verified: <strong className="font-semibold">{email}</strong>
              </span>
            </div>
            <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Verified
            </span>
          </div>

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
              autoFocus
            />
            {fieldErrors.fullName && (
              <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="signup-username">
              Username<span className="ml-1 text-destructive">*</span>
            </Label>
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

          <div>
            <Label>Mobile Number (Optional)</Label>
            <div className="mt-2">
              <MobileField
                countryCode={countryCode}
                onCountryCodeChange={setCountryCode}
                localNumber={localNumber}
                onLocalNumberChange={setLocalNumber}
                error={fieldErrors.mobile}
                disabled={loading}
              />
            </div>
          </div>

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
      )}

      {/* ======================================================== */}
      {/* FLOW 2: MOBILE SIGNUP (No OTP - Direct Account Creation) */}
      {/* ======================================================== */}
      {method === "mobile" && (
        <form className="space-y-5" onSubmit={onFinalSubmit}>
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
              autoFocus
            />
            {fieldErrors.fullName && (
              <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="signup-username">
              Username<span className="ml-1 text-destructive">*</span>
            </Label>
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

          <MobileField
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            localNumber={localNumber}
            onLocalNumberChange={setLocalNumber}
            error={fieldErrors.mobile}
            disabled={loading}
          />

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
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" search={{ role }} className="font-semibold text-brand-blue hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
