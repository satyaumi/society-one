import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileClock } from "lucide-react";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
} from "@/components/societyone";
import { auditService, authService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { AuditEvent, User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/history")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Visit history | SocietyOne" },
      { name: "description", content: "Past visits and activity history." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      visitorService.listRequests(),
      auditService.list().catch(() => [] as AuditEvent[]),
    ]).then(([currentUser, items, events]) => {
      if (mounted) {
        setUser(currentUser);
        setRequests(items);
        setAudit(events);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="History" eyebrow="History">
      <PageIntro
        eyebrow="History"
        title="Visit history"
        description="A record of every request, entry, and exit for your role view."
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Recent visits" />
          {loading ? (
            <LoadingState label="Loading history..." />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No visits on record yet"
              description="Once a visit closes, it will appear here for easy review."
              icon={<FileClock />}
            />
          ) : (
            <div>
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
        <section className="space-y-5">
          <ComingSoon
            title="Export records"
            description="Records will be exportable as CSV and PDF for society audits."
          />
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title="Audit trail" />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            ) : (
              <ol className="space-y-4">
                {audit.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-brand-blue" />
                    <div className="min-w-0">
                      <p className="font-semibold">{event.action}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.actor} → {event.target} · {event.detail}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{event.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
