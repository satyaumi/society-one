import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  ComingSoon,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, societyService } from "@/services";
import type { Building, Society, User } from "@/types/domain";

export const Route = createFileRoute("/admin/society")({
  head: () => ({
    meta: [
      { title: "Society structure | SocietyOne Admin" },
      { name: "description", content: "Admin view of buildings, floors, and flats." },
    ],
  }),
  component: AdminSocietyPage,
});

function AdminSocietyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      societyService.getSociety(),
    ]).then(([currentUser, soc]) => {
      if (mounted) {
        setUser(currentUser);
        setSociety(soc);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const totalFlats =
    society?.buildings.reduce(
      (acc: number, b: Building) =>
        acc + b.floors.reduce((a, f) => a + f.flats.length, 0),
      0,
    ) ?? 0;
  const totalResidents =
    society?.buildings.reduce(
      (acc: number, b: Building) =>
        acc +
        b.floors.reduce(
          (a, f) => a + f.flats.reduce((r, flat) => r + flat.residentIds.length, 0),
          0,
        ),
      0,
    ) ?? 0;

  return (
    <AppShell title="Society structure" eyebrow="Admin">
      <PageIntro
        eyebrow="Admin · Society"
        title={society?.name ?? "Society structure"}
        description={
          society
            ? `${society.address} — every building, floor, and flat at a glance.`
            : "The buildings, floors, and flats that make up the residential society."
        }
        action={
          <Button asChild variant="outline">
            <Link to="/admin/visitors">
              <Users /> Visitor activity
            </Link>
          </Button>
        }
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {loading ? (
          <LoadingState label="Loading society structure..." />
        ) : society ? (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionHeading title="Buildings" />
              <div className="grid gap-3">
                {society.buildings.map((building) => (
                  <details
                    key={building.id}
                    className="group rounded-xl border border-border bg-background p-4 open:bg-secondary/30"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-lg bg-info-soft text-brand-blue">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{building.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {building.floors.length} floor
                            {building.floors.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-4 space-y-3">
                      {building.floors.map((floor) => (
                        <div key={floor.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Floor {floor.number}</span>
                            <span>{floor.flats.length} flat{floor.flats.length === 1 ? "" : "s"}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {floor.flats.map((flat) => (
                              <div
                                key={flat.id}
                                className="flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-2 text-sm"
                              >
                                <Home className="size-3.5 text-brand-blue" />
                                <span className="font-semibold">{flat.number}</span>
                                <span className="ml-auto text-[11px] text-muted-foreground">
                                  {flat.residentIds.length} resident
                                  {flat.residentIds.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        <div className="space-y-5">
          <div className="rounded-xl border border-brand-blue/15 bg-info-soft p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-blue">Summary</p>
            <h3 className="mt-3 font-display text-xl font-bold">{society?.name}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{society?.address}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Buildings</dt>
                <dd className="mt-1 font-display text-xl font-bold">{society?.buildings.length ?? 0}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Flats</dt>
                <dd className="mt-1 font-display text-xl font-bold">{totalFlats}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Residents linked</dt>
                <dd className="mt-1 font-display text-xl font-bold">{totalResidents}</dd>
              </div>
              <div className="rounded-lg bg-background p-3">
                <dt className="text-xs text-muted-foreground">Coverage</dt>
                <dd className="mt-1 font-display text-xl font-bold">98%</dd>
              </div>
            </dl>
          </div>
          <ComingSoon
            title="Structure editor"
            description="Admins will be able to add towers, floors, and flats, plus assign residents directly from this screen."
          />
        </div>
      </div>
    </AppShell>
  );
}