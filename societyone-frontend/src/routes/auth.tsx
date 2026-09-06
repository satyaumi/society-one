import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import logoAsset from "@/assets/societyone-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | SocietyOne" },
      { name: "description", content: "Choose a SocietyOne workspace." },
      { property: "og:title", content: "Sign in | SocietyOne" },
      {
        property: "og:description",
        content: "Choose a SocietyOne workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("RESIDENT");
  const roles: { role: Role; title: string; detail: string }[] = [
    {
      role: "RESIDENT",
      title: "Resident",
      detail: "Approve visitors and invite guests to your flat.",
    },
    {
      role: "SECURITY",
      title: "Security",
      detail: "Verify arrivals quickly at the gate.",
    },
    {
      role: "ADMIN",
      title: "Admin",
      detail: "See the society structure and activity.",
    },
  ];
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[.8fr_1.2fr]">
      <div className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoAsset.url}
            alt="SocietyOne"
            className="size-11 rounded-xl object-cover"
          />
          <span className="font-display text-xl font-bold">
            Society<span className="text-sidebar-primary">One</span>
          </span>
        </div>
        <div>
          <ShieldCheck className="size-12 text-sidebar-primary" />
          <h1 className="mt-6 max-w-md font-display text-5xl font-bold leading-tight">
            A calmer gate starts here.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-sidebar-foreground/70">
            A focused visitor workflow for the people who make a residential
            community feel like home.
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">
          SocietyOne workspace · Account access
        </p>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-10 lg:hidden">
            <img
              src={logoAsset.url}
              alt="SocietyOne"
              className="size-12 rounded-xl object-cover"
            />
            <p className="mt-4 font-display text-xl font-bold">
              Society<span className="text-brand-orange">One</span>
            </p>
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange">
            Welcome back
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
            Choose your workspace
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Select your account workspace to sign in. SocietyOne keeps entries
            secure, verified, and transparent.
          </p>
          <div className="mt-8 space-y-3">
            {roles.map((item) => (
              <button
                key={item.role}
                onClick={() => setRole(item.role)}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${role === item.role ? "border-brand-blue bg-info-soft" : "border-border bg-card hover:border-brand-blue/40"}`}
              >
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-full font-display font-bold ${role === item.role ? "bg-brand-blue text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  {item.title.slice(0, 1)}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                {role === item.role && (
                  <span className="text-xs font-bold text-brand-blue">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button
            className="mt-6 h-12 w-full rounded-lg bg-brand-blue hover:bg-brand-blue/90"
            onClick={async () => {
              await navigate({ to: "/login", search: { role } });
            }}
          >
            Enter {roles.find((item) => item.role === role)?.title} workspace{" "}
            <ArrowRight />
          </Button>

          {/* Visitor without login section */}
          <div className="mt-8 rounded-xl border border-brand-orange/30 bg-warning-soft p-5">
            <span className="inline-block rounded-full bg-brand-orange/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              No account required
            </span>
            <h3 className="mt-2 font-display text-lg font-bold text-foreground">
              Visiting a resident?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Visitors do not need an account. Request guest entry directly to notify the resident immediately.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full border-brand-orange/40 font-semibold text-accent-foreground hover:bg-brand-orange/10"
              onClick={async () => {
                await navigate({ to: "/invite" });
              }}
            >
              Request Visit as Guest <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
