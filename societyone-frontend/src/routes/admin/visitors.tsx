import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ClipboardCheck, FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
  StatGrid,
} from "@/components/societyone";
import { authService, societyService, visitorService } from "@/services";
import type { DashboardSummary, Role, User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/admin/visitors")({
  head: () => ({
    meta: [
      { title: "Visitor activity | SocietyOne Admin" },
      { name: "description", content: "Admin view of visitor activity across the society." },
    ],
  }),
  component: AdminVisitorsPage,
});

function AdminVisitorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardSummary[]>([]);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      authService
        .getCurrentUser()
        .then((item) => societyService.getSummary(item.role || ("ADMIN" as Role))),
      visitorService.listRequests("ADMIN"),
    ]).then(([currentUser, summary, items]) => {
      if (mounted) {
        setUser(currentUser);
        setStats(summary);
        setRequests(items);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Visitor activity" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin · Visitors"
        title="Visitor activity"
        description="Cross-society view of all online and at-gate visitor activity. Good for daily checks and trend spotting."
        action={
          <>
            <Button asChild variant="outline" className="mr-2">
              <Link to="/admin/society">
                <Building2 /> Society structure
              </Link>
            </Button>
            <Button asChild className="bg-brand-blue">
              <Link to="/history">
                <FileClock /> Audit history
              </Link>
            </Button>
          </>
        }
      />
      <div className="mt-7">
        <StatGrid stats={stats} />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading
            title="Latest activity"
            action={
              <Link
                to="/history"
                className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
              >
                Full audit <ArrowRight className="size-4" />
              </Link>
            }
          />
          {loading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No activity today"
              description="Visitor check-ins, approvals, and requests will land here as they happen."
              icon={<ClipboardCheck />}
            />
          ) : (
            <div>
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
        <div className="space-y-5">
          <ComingSoon
            title="Date filters & exports"
            description="Admins will be able to filter by date range, building, and flat, then export the filtered set."
          />
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title="Trends (mock)" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Online vs. at-gate</dt>
                <dd className="font-semibold">60% online</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Peak hour</dt>
                <dd className="font-semibold">6:30 – 8:00 PM</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Busiest tower</dt>
                <dd className="font-semibold">Tower A</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Avg. gate wait</dt>
                <dd className="font-semibold text-success">Under 40s</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
