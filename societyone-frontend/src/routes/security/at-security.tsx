import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DoorOpen, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
} from "@/components/societyone";
import { authService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/security/at-security")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "At security | SocietyOne" },
      { name: "description", content: "Gate desk: check in walk-in visitors quickly." },
    ],
  }),
  component: SecurityAtDeskPage,
});

function SecurityAtDeskPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      visitorService.listRequests("SECURITY"),
    ]).then(([currentUser, items]) => {
      if (mounted) {
        setUser(currentUser);
        setRequests(items);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const atGate = requests.filter((r) => r.visitStatus === "WAITING_AT_GATE");
  const inside = requests.filter((r) => r.visitStatus === "CHECKED_IN");

  return (
    <AppShell title="At security desk" eyebrow="Security">
      <PageIntro
        eyebrow="Security · At gate"
        title="Gate desk"
        description="Walk-in visitors who arrive without an online request, and fast check-in/out for anyone waiting."
        action={
          <Button asChild className="bg-brand-blue">
            <Link to="/invite">
              <DoorOpen /> Register walk-in
            </Link>
          </Button>
        }
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title="Find a visitor" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, flat, or vehicle"
                className="pl-9"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <DoorOpen className="size-4 text-brand-blue" /> Walk-in
              </Label>
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <Search className="size-4 text-brand-blue" /> Flat lookup
              </Label>
              <Label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <LogOut className="size-4 text-brand-blue" /> Quick exit
              </Label>
            </div>
          </div>
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`Waiting at gate (${atGate.length})`} />
            {loading ? (
              <LoadingState />
            ) : atGate.length === 0 ? (
              <EmptyState
                title="No one waiting"
                description="When a visitor or delivery arrives at the gate, check them in here."
              />
            ) : (
              <div>
                {atGate.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actions={
                      <Button size="sm" className="bg-success text-primary-foreground">
                        <DoorOpen /> Check in
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <div className="space-y-5">
          <ComingSoon
            title="Photo capture & OTP"
            description="A future release will capture a visitor photo on arrival and send residents a 6-digit OTP for walk-in approvals."
          />
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`Currently inside (${inside.length})`} />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : inside.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visitors currently inside.</p>
            ) : (
              <div>
                {inside.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    actions={
                      <Button size="sm" variant="outline">
                        <LogOut /> Check out
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}