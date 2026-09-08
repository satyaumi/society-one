import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/lib/auth/auth-store";

const STORAGE_KEY = "societyone_welcome_role_dismissed_v1";

interface WelcomeRolePromptProps {
  onRegisterSocietyClick?: () => void;
  onJoinResidentClick?: () => void;
}

export function WelcomeRolePrompt({
  onRegisterSocietyClick,
  onJoinResidentClick,
}: WelcomeRolePromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only show if user is NOT authenticated and hasn't dismissed before in this browser session/storage
    const { isAuthenticated } = authStore.getState();
    if (isAuthenticated) return;

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Short subtle delay so the landing page renders smoothly first
        const timer = setTimeout(() => {
          const freshAuth = authStore.getState().isAuthenticated;
          if (!freshAuth) {
            setOpen(true);
          }
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore storage quota / private mode */
    }
  }, []);

  function handleDismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  // Handle Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        handleDismiss();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-background p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          aria-label="Close welcome prompt"
        >
          <X className="size-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand-blue to-cyan-500 text-white shadow-md shadow-brand-blue/20">
            <Sparkles className="size-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-brand-blue">
              Welcome to SocietyOne
            </span>
            <h2
              id="welcome-modal-title"
              className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-display"
            >
              What would you like to do?
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          SocietyOne modernizes visitor tracking, gate security, and community management. Choose your role to get started:
        </p>

        {/* 2 Primary Choice Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Option 1: Register Society */}
          <Link
            to="/register-society"
            onClick={() => {
              handleDismiss();
              onRegisterSocietyClick?.();
            }}
            className="group relative flex flex-col justify-between rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 text-left transition-all duration-200 hover:border-brand-blue hover:bg-brand-blue/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <div>
              <div className="grid size-9 place-items-center rounded-lg bg-brand-blue text-white shadow-xs group-hover:scale-105 transition-transform">
                <Building2 className="size-4.5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground text-sm flex items-center gap-1">
                Register Society
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-brand-blue" />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-normal">
                For committee members & admins onboarding a new society.
              </p>
            </div>
            <span className="mt-3 inline-flex items-center text-[11px] font-semibold text-brand-blue">
              Start Application →
            </span>
          </Link>

          {/* Option 2: Join as Resident */}
          <Link
            to="/signup"
            search={{ role: "RESIDENT" }}
            onClick={() => {
              handleDismiss();
              onJoinResidentClick?.();
            }}
            className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-brand-orange/60 hover:bg-brand-orange/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            <div>
              <div className="grid size-9 place-items-center rounded-lg bg-brand-orange text-white shadow-xs group-hover:scale-105 transition-transform">
                <Users className="size-4.5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground text-sm flex items-center gap-1">
                Join as Resident
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-brand-orange" />
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-normal">
                For apartment owners and tenants in registered societies.
              </p>
            </div>
            <span className="mt-3 inline-flex items-center text-[11px] font-semibold text-brand-orange">
              Create Account →
            </span>
          </Link>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
          <p className="text-muted-foreground">
            Already registered?{" "}
            <Link
              to="/login"
              search={{ role: undefined }}
              onClick={handleDismiss}
              className="font-semibold text-brand-blue hover:underline"
            >
              Sign in to your account
            </Link>
          </p>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
          >
            Explore Website First
          </Button>
        </div>
      </div>
    </div>
  );
}
