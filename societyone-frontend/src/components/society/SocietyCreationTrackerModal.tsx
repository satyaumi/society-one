import { useState } from "react";
import {
  Building2,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { societyRequestService } from "@/services";
import type { SocietyCreationRequest, SocietyRequestStatus } from "@/types/domain";
import { toUserError } from "@/lib/auth/error-mapper";

interface SocietyCreationTrackerModalProps {
  open: boolean;
  onClose: () => void;
}

export function SocietyCreationTrackerModal({
  open,
  onClose,
}: SocietyCreationTrackerModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SocietyCreationRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await societyRequestService.track(query.trim());
      setResults(data);
    } catch (err) {
      setError(toUserError(err, "Could not fetch status."));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: SocietyRequestStatus) {
    switch (status) {
      case "APPROVED":
      case "SOCIETY_CREATED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved & Active
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 border-rose-300">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case "CHANGES_REQUESTED":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-300">
            <AlertCircle className="w-3 h-3 mr-1" /> Changes Requested
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge className="bg-cyan-500/10 text-cyan-700 border-cyan-300">
            <Clock className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300">
            <Clock className="w-3 h-3 mr-1" /> Submitted
          </Badge>
        );
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          aria-label="Close tracker"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <Building2 className="size-5" />
          </div>
          <div>
            <h3 id="tracker-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Track Society Application
            </h3>
            <p className="text-xs text-slate-500">
              Enter your reference code or registered email to check status.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. SOC-REQ-XXXX or name@domain.com"
            className="flex-1 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Track
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {results !== null && (
          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
            {results.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">
                No matching society applications found.
              </p>
            ) : (
              results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{r.societyName}</span>
                    {getStatusBadge(r.status)}
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Ref: <strong className="font-mono text-brand-blue">{r.referenceCode}</strong></span>
                    <span>Applicant: {r.primaryContactName}</span>
                  </div>
                  {r.reviewNotes && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2 text-slate-600 italic">
                      Management: "{r.reviewNotes}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-900">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
