import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_PASSWORD_POLICY,
  evaluatePassword,
  passwordStrengthColor,
  passwordStrengthScore,
  strengthLabel,
  type PasswordPolicy,
} from "@/lib/auth/password-validators";

/**
 * Password input with:
 *  - show/hide button
 *  - HTML autocomplete (current-password vs new-password)
 *  - optional strength meter + rule checklist (for sign-up / reset flows)
 *
 * Reused on Login, Signup, Reset Password — no copy/paste.
 */
export function PasswordField({
  id = "password",
  label = "Password",
  value,
  onChange,
  placeholder = "Enter your password",
  autoComplete = "current-password",
  required = true,
  showStrength = false,
  policy = DEFAULT_PASSWORD_POLICY,
  error,
  disabled,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  showStrength?: boolean;
  policy?: PasswordPolicy;
  error?: string | null;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const showHelp = showStrength && (touched || value.length > 0);
  const score = passwordStrengthScore(value, policy);
  const checks = evaluatePassword(value, policy);
  const passCount = checks.filter((c) => c.pass).length;
  const color = passwordStrengthColor(score);
  const totalChecks = checks.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          <Lock className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>
      <div className="relative mt-2">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          className={cn("pr-11", error && "border-destructive focus:ring-destructive")}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-2 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Strength</span>
            <span
              className={cn(
                "font-semibold",
                color === "red" && "text-destructive",
                color === "orange" && "text-brand-orange",
                color === "yellow" && "text-amber-600",
                color === "green" && "text-success",
                color === "emerald" && "text-emerald-600",
              )}
            >
              {strengthLabel(score)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalChecks + 1}
            aria-valuenow={passCount}
            className="mt-2 grid h-2 grid-cols-5 gap-1"
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const active = i < Math.max(1, Math.min(5, Math.ceil(((score) / 5) * 5)));
              const filled = score > 0 && active;
              return (
                <span
                  key={i}
                  className={cn(
                    "h-full rounded-full transition-colors",
                    !filled && "bg-secondary",
                    filled && color === "red" && "bg-destructive",
                    filled && color === "orange" && "bg-brand-orange",
                    filled && color === "yellow" && "bg-amber-500",
                    filled && color === "green" && "bg-success",
                    filled && color === "emerald" && "bg-emerald-500",
                    filled && color === "slate" && "bg-secondary-foreground/30",
                  )}
                />
              );
            })}
          </div>
          {showHelp && (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {checks.map((c) => (
                <li key={c.key} className={cn("flex items-start gap-2", c.pass ? "text-success" : "")}>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 inline-block size-3.5 rounded-full",
                      c.pass ? "bg-success" : "bg-secondary",
                    )}
                  />
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
