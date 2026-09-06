import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/authlayout";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/authmethodtoggle";
import { AuthFormError } from "@/components/auth/authformError";
import { MobileField } from "@/components/auth/mobilefield";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserError } from "@/lib/auth/error-mapper";
import { sanitizeMobile, validateEmail, validateMobile } from "@/lib/auth/password-validators";
import { authService } from "@/services";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password | SocietyOne" },
      { name: "description", content: "Reset your SocietyOne password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const identifier = useMemo(() => {
    if (method === "email") return email.trim();
    return sanitizeMobile(`${countryCode}${localNumber}`);
  }, [method, email, countryCode, localNumber]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    const identifierError =
      method === "email" ? validateEmail(email) : validateMobile(countryCode, localNumber);
    if (identifierError) {
      setFieldError(identifierError);
      return;
    }

    setLoading(true);
    try {
      const result = await authService.forgotPassword({ method, identifier });
      await navigate({
        to: "/reset-password",
        search: { identifier: result.identifier || identifier },
      });
    } catch (err) {
      setError(toUserError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Account"
      title="Forgot password"
      subtitle="We'll send a verification code to recover your SocietyOne account."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthFormError message={error} />
        <AuthMethodToggle value={method} onChange={setMethod} />
        {method === "email" ? (
          <div>
            <Label htmlFor="forgot-email">
              <Mail className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
              Email
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="forgot-email"
              className="mt-2"
              type="email"
              autoComplete="email"
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
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Sending code..." : "Send reset code"}
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
