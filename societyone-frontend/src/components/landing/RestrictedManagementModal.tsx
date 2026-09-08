import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestrictedManagementModalProps {
  open: boolean;
  onClose: () => void;
}

export function RestrictedManagementModal({
  open,
  onClose,
}: RestrictedManagementModalProps) {
  useEffect(() => {
    if (open && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        // Safe, subtle micro-haptic feedback (15ms)
        navigator.vibrate(15);
      } catch {
        /* ignore if device blocks vibration */
      }
    }
  }, [open]);

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
      aria-labelledby="mgmt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 p-6 sm:p-7 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
            <Lock className="size-5.5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Restricted Area
            </span>
            <h3
              id="mgmt-modal-title"
              className="text-lg font-bold text-white tracking-tight"
            >
              Platform Management
            </h3>
          </div>
        </div>

        <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          SocietyOne Platform Management is strictly restricted to authorized platform administrators and multi-tenant management personnel.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            asChild
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-900/40"
          >
            <Link
              to="/login"
              search={{ role: "PLATFORM_ADMIN" }}
              onClick={onClose}
            >
              Continue to Management Sign In
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel & Return to Public Site
          </Button>
        </div>
      </div>
    </div>
  );
}
