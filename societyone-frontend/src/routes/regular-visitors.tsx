import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, PlusCircle, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, residentService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { RegisteredVisitor, User } from "@/types/domain";

export const Route = createFileRoute("/regular-visitors")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Regular visitors | SocietyOne" },
      { name: "description", content: "Manage trusted regular visitors." },
    ],
  }),
  component: RegularVisitorsPage,
});

function RegularVisitorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [visitors, setVisitors] = useState<RegisteredVisitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      residentService.listRegisteredVisitors(),
    ]).then(([currentUser, items]) => {
      if (mounted) {
        setUser(currentUser);
        setVisitors(items);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Regular visitors" eyebrow="Regular">
      <PageIntro
        eyebrow="Regular visitors"
        title="Trusted regulars"
        description="Keep profiles for domestic workers, drivers, and technicians who visit often. Toggle active status any time."
        action={
          <Button asChild className="bg-brand-blue">
            <Link to="/invite">
              <PlusCircle /> Add regular
            </Link>
          </Button>
        }
      />
      <div className="mt-7">
        {loading ? (
          <LoadingState label="Loading regular visitors..." />
        ) : visitors.length === 0 ? (
          <EmptyState
            title="No regular visitors saved"
            description="Add profiles for people who come often so gate staff can verify them quickly."
          />
        ) : (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`${visitors.length} regular visitor profiles`} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visitors.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-border bg-background p-4"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-info-soft font-display font-bold text-brand-blue">
                    <UserRound className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold">{item.name}</p>
                      {item.active ? (
                        <Badge className="bg-success text-primary-foreground">
                          <CheckCircle2 className="mr-1 size-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 size-3" /> Paused
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.visitorType.replace("_", " ").toLowerCase()} · {item.mobile}
                    </p>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Flat {item.flat.number} · Last visit: {item.lastVisit ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}