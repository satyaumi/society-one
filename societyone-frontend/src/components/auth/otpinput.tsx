import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface OtpInputHandle {
  clear: () => void;
  focus: () => void;
}

/**
 * Accessible 6-digit OTP input.
 * - Single logical input rendered as 6 boxes (mobile-friendly)
 * - Backspace moves focus backwards, Enter submits parent form (via standard form submit)
 * - Paste full 6-digit string anywhere
 * - Resend timer with disabled button while countdown active (anti-spam UX, backend rate limits too)
 */
export const OtpInput = forwardRef<OtpInputHandle, {
  id?: string;
  length?: 4 | 6;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: string | null;
  autoFocus?: boolean;
}>(function OtpInput(
  { id = "otp", length = 6, label = "Verification code", value, onChange, disabled, error, autoFocus },
  ref,
) {
  const firstRef = useRef<HTMLInputElement | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useImperativeHandle(ref, () => ({
    clear() {
      onChange("");
      setTimeout(() => refs.current[0]?.focus(), 0);
    },
    focus() {
      refs.current[0]?.focus();
    },
  }));

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus();
  }, [autoFocus]);

  function onInput(idx: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[idx] = ch;
    const filled = next.join("").padEnd(length, " ").slice(0, length).replace(/\s/g, "");
    onChange(filled);
    if (ch && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        const copy = value.split("");
        copy[idx - 1] = "";
        onChange(copy.join(""));
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    else if (e.key === "ArrowRight" && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function onPaste(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, length);
    if (digits) {
      onChange(digits);
      const idx = Math.min(digits.length, length - 1);
      refs.current[idx]?.focus();
    }
  }

  return (
    <div>
      <Label htmlFor={`${id}-0`}>
        {label}
        <span className="ml-1 text-destructive">*</span>
      </Label>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="mt-3 flex items-center justify-between gap-2"
      >
        {Array.from({ length }).map((_, idx) => (
          <input
            key={idx}
            id={`${id}-${idx}`}
            ref={(el) => {
              refs.current[idx] = el;
              if (idx === 0) firstRef.current = el;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="done"
            pattern="\d*"
            maxLength={1}
            aria-label={`Digit ${idx + 1} of ${length}`}
            aria-invalid={!!error}
            disabled={disabled}
            value={value[idx] ?? ""}
            onInput={(e) => onInput(idx, (e.target as HTMLInputElement).value)}
            onKeyDown={(e) => onKeyDown(idx, e)}
            onPaste={(e) => onPaste(e.clipboardData.getData("text"))}
            className={cn(
              "grid size-12 place-items-center rounded-lg border text-center font-display text-lg font-bold shadow-sm outline-none transition-colors sm:size-14 sm:text-xl",
              error
                ? "border-destructive focus:ring-2 focus:ring-destructive"
                : "border-border focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/40",
              disabled && "opacity-60",
            )}
            onSubmit={(e: FormEvent) => e.preventDefault()}
          />
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

/** Simple resend button with 30s countdown. Spam-safe UI layer (backend enforces real RL). */
export function ResendOtpButton({
  resendInSeconds = 30,
  onResend,
  disabled,
  isSending,
}: {
  resendInSeconds?: number;
  onResend: () => Promise<unknown> | void;
  disabled?: boolean;
  isSending?: boolean;
}) {
  const [remaining, setRemaining] = useState(resendInSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(t);
  }, [remaining]);

  const canResend = !disabled && remaining === 0 && !isSending;
  return (
    <button
      type="button"
      disabled={!canResend}
      onClick={() => {
        Promise.resolve(onResend()).then(() => setRemaining(resendInSeconds));
      }}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        canResend
          ? "text-brand-blue hover:bg-info-soft focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          : "text-muted-foreground",
      )}
    >
      {isSending
        ? "Sending..."
        : remaining > 0
          ? `Resend OTP in ${remaining}s`
          : "Resend OTP"}
    </button>
  );
}
