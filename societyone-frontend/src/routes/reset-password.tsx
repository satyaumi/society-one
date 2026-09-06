import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthFormError } from "@/components/auth/authformError";
import { OtpInput, ResendOtpButton } from "@/components/auth/otpinput";
import { PasswordField } from "@/components/auth/passwordfield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserError } from "@/lib/auth/error-mapper";
import { passwordMeetsPolicy } from "@/lib/auth/password-validators";
import { authService } from "@/services";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    identifier: typeof search.identifier === "string" ? search.identifier : "",
  }),
  head: () => ({
    meta: [
      { title: "Reset password | SocietyOne" },
      { name: "description", content: "Choose a new SocietyOne password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { identifier: identifierFromSearch } = Route.useSearch();
  const [identifier, setIdentifier] = useState(identifierFromSearch);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onResend() {
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number to receive an OTP.");
      return;
    }
    setError(null);
    setResendMessage(null);
    setResending(true);
    try {
      await authService.resendOtp({
        identifier: identifier.trim(),
        purpose: "PASSWORD_RESET",
      });
      setResendMessage("OTP sent successfully to your email.");
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setResending(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResendMessage(null);
    const next: Record<string, string> = {};
    if (!identifier.trim()) next.identifier = "Email or mobile number is required.";
    if (otp.replace(/\D/g, "").length < 6) next.otp = "Enter the 6-digit code.";
    if (!passwordMeetsPolicy(password)) next.password = "Password does not meet requirements.";
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await authService.resetPassword({
        identifier: identifier.trim(),
        otp: otp.replace(/\D/g, ""),
        newPassword: password,
      });
      setSuccess(true);
      window.setTimeout(() => {
        void navigate({ to: "/login", search: { role: undefined } });
      }, 1200);
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Reset password"
      subtitle="Enter the code sent to your account and choose a new password."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        {resendMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {resendMessage}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Password updated. Redirecting you to log in.
          </div>
        )}
        <div>
          <Label htmlFor="reset-identifier">Email or mobile number<span className="ml-1 text-destructive">*</span></Label>
          <Input
            id="reset-identifier"
            className="mt-2"
            value={identifier}
            disabled={loading || success}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          {fieldErrors.identifier && (
            <p className="mt-2 text-xs font-medium text-destructive">{fieldErrors.identifier}</p>
          )}
        </div>
        <div>
          <OtpInput value={otp} onChange={setOtp} error={fieldErrors.otp} disabled={loading || success} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Didn't receive the code?</span>
            <ResendOtpButton
              onResend={onResend}
              isSending={resending}
              disabled={loading || success || !identifier.trim()}
            />
          </div>
        </div>
        <PasswordField
          id="reset-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showStrength
          error={fieldErrors.password}
          disabled={loading || success}
        />
        <PasswordField
          id="reset-confirm"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={loading || success}
        />
        <Button
          type="submit"
          disabled={loading || success}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Updating password..." : "Reset password"}
        </Button>
        <Link
          to="/login"
          search={{ role: undefined }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}

