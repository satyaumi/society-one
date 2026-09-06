import { cn } from "@/lib/utils";

export type AuthMethod = "username_or_email" | "email" | "mobile";

/** Segmented control used across Login, Signup, Forgot Password. */
export function AuthMethodToggle<T extends string = AuthMethod>({
  value,
  onChange,
  labels = { email: "Email", mobile: "Mobile" } as Record<string, string>,
  id = "auth-method",
}: {
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
  id?: string;
}) {
  return (
    <div role="tablist" aria-label="Sign in method" className="inline-flex w-full rounded-lg bg-secondary p-1">
      {(Object.keys(labels) as T[]).map((method) => {
        const active = value === method;
        return (
          <button
            key={method}
            id={`${id}-${method}`}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(method)}
            className={cn(
              "inline-flex min-w-[7rem] items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/40",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[method]}
          </button>
        );
      })}
    </div>
  );
}
