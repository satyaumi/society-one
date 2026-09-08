import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Lock,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProtectedFeatureRole = "RESIDENT" | "ADMIN" | "SECURITY";

interface ProtectedFeatureModalProps {
  open: boolean;
  onClose: () => void;
  requiredRole: ProtectedFeatureRole;
  featureTitle?: string;
  featureDescription?: string;
}

const ROLE_INFO: Record<
  ProtectedFeatureRole,
  {
    title: string;
    description: string;
    icon: typeof Users;
    registerUrl?: string;
    registerLabel?: string;
    color: string;
  }
> = {
  RESIDENT: {
    title: "Resident Account Required",
    description:
      "This section is exclusively for residents to manage passes, approve visitors, and access flat activities.",
    icon: Users,
    registerUrl: "/signup?role=RESIDENT",
    registerLabel: "Register as Resident",
    color: "text-brand-orange bg-brand-orange/10 border-brand-orange/30",
  },
  ADMIN: {
    title: "Society Administrator Account Required",
    description:
      "This feature is reserved for authorized Society Administrators managing society operations, residents, and gate staff.",
    icon: Building2,
    registerUrl: "/register-society",
    registerLabel: "Register Your Society",
    color: "text-brand-blue bg-brand-blue/10 border-brand-blue/30",
  },
  SECURITY: {
    title: "Security Gate Access Required",
    description:
      "This area is restricted to authorized on-duty security staff for visitor verification and gate pass check-ins.",
    icon: ShieldAlert,
    registerUrl: undefined,
    registerLabel: undefined,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
};

export function ProtectedFeatureModal({
  open,
  onClose,
  requiredRole,
  featureTitle,
  featureDescription,
}: ProtectedFeatureModalProps) {
  const info = ROLE_INFO[requiredRole];
  const Icon = info.icon;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protected-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className={`grid size-11 shrink-0 place-items-center rounded-xl border ${info.color}`}>
            <Icon className="size-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {featureTitle || "Restricted Feature"}
            </span>
            <h3
              id="protected-modal-title"
              className="text-lg font-bold text-foreground tracking-tight"
            >
              {info.title}
            </h3>
          </div>
        </div>

        <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {featureDescription || info.description}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button asChild className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-medium">
            <Link to="/login" search={{ role: requiredRole }} onClick={onClose}>
              Sign In with Authorized Account
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>

          {info.registerUrl && info.registerLabel && (
            <Button asChild variant="outline" className="w-full border-border hover:bg-muted font-medium">
              <Link to={info.registerUrl} onClick={onClose}>
                {info.registerLabel}
              </Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel & Return
          </Button>
        </div>
      </div>
    </div>
  );
}
