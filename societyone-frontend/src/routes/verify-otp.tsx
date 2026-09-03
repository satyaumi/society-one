import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthFormError } from "@/components/auth/authformError";
import { OtpInput, ResendOtpButton } from "@/components/auth/otpinput";
import { Button } from "@/components/ui/button";
import { toUserError } from "@/lib/auth/error-mapper";
import { ApiError } from "@/lib/auth/auth-api-client";
import { authService } from "@/services";

const PURPOSES = ["SIGNUP", "PASSWORD_RESET", "LOGIN"] as const;
type OtpPurpose = (typeof PURPOSES)[number];

function parsePurpose(value: unknown): OtpPurpose {
  if (typeof value === "string" && (PURPOSES as readonly string[]).includes(value)) {
    return value as OtpPurpose;
  }
  return "SIGNUP";
}

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => ({
    identifier: typeof search.identifier === "string" ? search.identifier : "",
    purpose: parsePurpose(search.purpose),
  }),
  head: () => ({
    meta: [
      { title: "Verify code | SocietyOne" },
      { name: "description", content: "Verify your SocietyOne account with a one-time code." },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const navigate = useNavigate();
  const { identifier, purpose } = Route.useSearch();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const displayIdentifier = useMemo(() => identifier || "your account", [identifier]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOtpError(null);
    if (!identifier) {
      setError("Missing account identifier. Go back and try again.");
      return;
    }
    if (otp.replace(/\D/g, "").length < 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const result = await authService.verifyOtp({
        identifier,
        otp: otp.replace(/\D/g, ""),
        purpose,
      });
      if ("token" in result) {
        await navigate({ to: "/dashboard" });
        return;
      }
      if (purpose === "PASSWORD_RESET") {
        await navigate({ to: "/reset-password", search: { identifier } });
        return;
      }
      await navigate({ to: "/login" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "OTP_EXPIRED") {
        setOtpError("OTP expired.");
      } else if (err instanceof ApiError && err.code === "OTP_INVALID") {
        setOtpError("Invalid OTP.");
      } else {
        setError(toUserError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!identifier) return;
    setError(null);
    setResending(true);
    try {
      await authService.resendOtp({ identifier, purpose });
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Verify your account"
      subtitle={
        <>
          Enter the 6-digit code sent to <span className="font-semibold text-foreground">{displayIdentifier}</span>.
        </>
      }
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        <OtpInput value={otp} onChange={setOtp} error={otpError} autoFocus disabled={loading} />
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Verifying..." : "Verify"}
        </Button>
        <div className="flex items-center justify-between">
          <Link
            to={purpose === "SIGNUP" ? "/signup" : "/login"}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <ResendOtpButton onResend={onResend} isSending={resending} disabled={!identifier} />
        </div>
      </form>
    </AuthLayout>
  );
}
