import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ClipboardCheck, FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  ComingSoon,
  LoadingState,
  PageIntro,
  SectionHeading,
  StatGrid,
} from "@/components/societyone";
import { requireAuth } from "@/lib/auth/require-auth";
import { authService, societyService } from "@/services";
import type { DashboardSummary } from "@/types/domain";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Admin workspace | SocietyOne" },
      { name: "description", content: "Admin overview for the society." },
    ],
  }),
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const [stats, setStats] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService
      .getCurrentUser()
      .then((user) => societyService.getSummary(user.role))
      .then((summary) => {
        if (mounted) {
          setStats(summary);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Admin workspace" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin"
        title="Society at a glance"
        description="Monitor the society structure, visitor activity, and audit history from a single admin view."
        action={
          <Button asChild className="bg-brand-blue">
            <Link to="/admin/society">
              <Building2 /> Society structure
            </Link>
          </Button>
        }
      />
      <div className="mt-7">
        {loading ? (
          <LoadingState label="Loading society summary..." />
        ) : (
          <StatGrid stats={stats} />
        )}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Society" />
          <p className="text-sm text-muted-foreground">
            Buildings, floors, flats, and resident mappings.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/admin/society">
              <Building2 /> Open structure
            </Link>
          </Button>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Visitors" />
          <p className="text-sm text-muted-foreground">
            Filtered view of all visitor activity across the society.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/admin/visitors">
              <ClipboardCheck /> View activity
            </Link>
          </Button>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title="Audit" />
          <p className="text-sm text-muted-foreground">
            Full history of actions across the security and resident workflows.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/history">
              <FileClock /> Open audit history
            </Link>
          </Button>
        </section>
      </div>
      <div className="mt-8">
        <ComingSoon
          title="Bulk import & roles"
          description="A future admin release will add bulk resident CSV import, custom security shifts, and role-based permissions."
        />
      </div>
    </AppShell>
  );
}
