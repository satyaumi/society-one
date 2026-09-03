import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Top-of-form error banner — consistent across all auth pages. */
export function AuthFormError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <p className="leading-6 text-destructive">{message}</p>
    </div>
  );
}
