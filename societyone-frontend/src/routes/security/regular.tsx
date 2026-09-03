import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Clock3, IdCard } from "lucide-react";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, residentService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { RegisteredVisitor, User } from "@/types/domain";

export const Route = createFileRoute("/security/regular")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Regular visitors | Security" },
      { name: "description", content: "Security view of regular visitor profiles." },
    ],
  }),
  component: SecurityRegularPage,
});

function SecurityRegularPage() {
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
    <AppShell title="Regular visitors" eyebrow="Security">
      <PageIntro
        eyebrow="Security · Regulars"
        title="Regular visitor profiles"
        description="Domestic workers, drivers, and technicians with saved profiles. Gate staff can verify and check them in with a single tap."
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title={`${visitors.length} registered profiles`} />
          {loading ? (
            <LoadingState label="Loading regular visitor directory..." />
          ) : visitors.length === 0 ? (
            <EmptyState
              title="No regular profiles"
              description="Residents add regulars from their workspace. They will appear here for fast gate verification."
              icon={<IdCard />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visitors.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background p-4"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-info-soft font-display font-bold text-brand-blue">
                    {item.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{item.name}</p>
                      {item.active ? (
                        <BadgeCheck className="size-4 text-success" aria-label="Active profile" />
                      ) : (
                        <Clock3 className="size-4 text-muted-foreground" aria-label="Paused profile" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.visitorType.replace("_", " ").toLowerCase()} · Flat {item.flat.number}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.mobile}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <ComingSoon
          title="ID verification & badges"
          description="A future release will support photo ID uploads and printable temporary badges for regulars."
        />
      </div>
    </AppShell>
  );
}
