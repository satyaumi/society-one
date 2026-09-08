import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, Home, ShieldCheck, UserCheck, Users } from "lucide-react";
import societyOneLogo from "@/assets/societyone-logo.png";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Choose Workspace | SocietyOne" },
      { name: "description", content: "Choose your SocietyOne workspace." },
      { property: "og:title", content: "Choose Workspace | SocietyOne" },
      {
        property: "og:description",
        content: "Choose your SocietyOne workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

interface WorkspaceOption {
  role: Role;
  title: string;
  subtitle: string;
  detail: string;
  icon: typeof Home;
  themeColor: string;
  activeBorder: string;
  activeBg: string;
  iconGradient: string;
  badgeBg: string;
  badgeText: string;
}

function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("RESIDENT");

  const roles: WorkspaceOption[] = [
    {
      role: "RESIDENT",
      title: "Resident Workspace",
      subtitle: "For Flat Owners & Tenants",
      detail: "Approve visitors, create instant passes, view activities, and invite guests to your flat.",
      icon: Home,
      themeColor: "text-brand-blue",
      activeBorder: "border-brand-blue ring-2 ring-brand-blue/30 shadow-lg shadow-brand-blue/10",
      activeBg: "bg-blue-50/80 dark:bg-blue-950/40",
      iconGradient: "from-cyan-500 to-blue-600 shadow-blue-500/20",
      badgeBg: "bg-brand-blue/10 border-brand-blue/30",
      badgeText: "text-brand-blue",
    },
    {
      role: "SECURITY",
      title: "Security Gate Workspace",
      subtitle: "For Main Gate & Tower Guards",
      detail: "Verify visitor arrivals in real-time, scan pass codes, and manage check-ins/check-outs at the gate.",
      icon: ShieldCheck,
      themeColor: "text-emerald-600",
      activeBorder: "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10",
      activeBg: "bg-emerald-50/80 dark:bg-emerald-950/40",
      iconGradient: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
      badgeBg: "bg-emerald-500/10 border-emerald-500/30",
      badgeText: "text-emerald-700 dark:text-emerald-300",
    },
    {
      role: "ADMIN",
      title: "Society Admin Workspace",
      subtitle: "For RWA & Managing Committee",
      detail: "Manage society structure, approve resident onboarding, configure flats, and view audit history.",
      icon: Building2,
      themeColor: "text-amber-600",
      activeBorder: "border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10",
      activeBg: "bg-amber-50/80 dark:bg-amber-950/40",
      iconGradient: "from-amber-500 to-orange-600 shadow-amber-500/20",
      badgeBg: "bg-amber-500/10 border-amber-500/30",
      badgeText: "text-amber-700 dark:text-amber-300",
    },
  ];

  const currentOption = roles.find((item) => item.role === role) || roles[0];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[.85fr_1.15fr]">
      {/* Left: Branded Hero Side (Desktop) */}
      <div className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link
          to="/"
          className="flex w-fit items-center gap-3 rounded-xl transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
          aria-label="Go to SocietyOne home"
        >
          <img
            src={societyOneLogo}
            alt="SocietyOne"
            loading="eager"
            decoding="sync"
            className="size-11 rounded-xl object-cover shadow-md"
          />
          <span className="font-display text-xl font-bold">
            Society<span className="text-sidebar-primary">One</span>
          </span>
        </Link>

        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sidebar-primary/10 border border-sidebar-primary/30 flex items-center justify-center text-sidebar-primary shadow-sm">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="max-w-md font-display text-4xl xl:text-5xl font-bold leading-tight">
            A calmer gate starts here.
          </h1>
          <p className="max-w-md leading-relaxed text-sidebar-foreground/75 text-sm xl:text-base">
            A focused visitor workflow and society operations platform designed for modern residential communities.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-sidebar-foreground/50 border-t border-sidebar-border pt-4">
          <span>SocietyOne Platform Workspace</span>
          <span>Verified & Secure</span>
        </div>
      </div>

      {/* Right: Workspace Selector Form */}
      <div className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-lg">
          {/* Mobile Top Brand Bar */}
          <div className="mb-8 lg:hidden flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src={societyOneLogo}
                alt="SocietyOne"
                loading="eager"
                decoding="sync"
                className="size-10 rounded-xl object-cover shadow-sm"
              />
              <span className="font-display text-xl font-bold">
                Society<span className="text-brand-blue">One</span>
              </span>
            </Link>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2.5 py-0.5 rounded-full inline-block">
              Welcome Back
            </span>
            <h2 className="pt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Choose your workspace
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Select your role profile to proceed to sign in. Each workspace provides tailored tools for your residential tasks.
            </p>
          </div>

          {/* Interactive Role Options */}
          <div className="mt-6 space-y-3.5">
            {roles.map((item) => {
              const isSelected = role === item.role;
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  role="button"
                  tabIndex={0}
                  onClick={() => setRole(item.role)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRole(item.role);
                    }
                  }}
                  className={`group relative flex w-full items-start gap-3.5 sm:gap-4 rounded-2xl border p-4 sm:p-4.5 text-left cursor-pointer transition-all duration-200 active:scale-[0.99] focus:outline-none ${
                    isSelected
                      ? `${item.activeBorder} ${item.activeBg}`
                      : "border-border bg-card/80 hover:border-border/90 hover:bg-accent/40 shadow-xs"
                  }`}
                >
                  {/* Icon Avatar */}
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.iconGradient} text-white shadow-md transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="size-5.5" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block font-display font-bold text-sm sm:text-base text-foreground group-hover:text-brand-blue transition-colors">
                        {item.title}
                      </span>
                      {isSelected ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${item.badgeBg} ${item.badgeText}`}>
                          <Check className="size-3 stroke-[3]" /> Selected
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground/60 group-hover:text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action CTA Button */}
          <Button
            className="mt-6 h-12 w-full rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm sm:text-base shadow-md shadow-brand-blue/20 transition-all duration-200 hover:shadow-lg"
            onClick={async () => {
              await navigate({ to: "/login", search: { role } });
            }}
          >
            Continue to {currentOption.title} <ArrowRight className="ml-2 size-4" />
          </Button>

          {/* Visitor without login callout */}
          <div className="mt-7 rounded-2xl border border-brand-orange/30 bg-amber-50/70 dark:bg-amber-950/30 p-4.5 text-xs text-amber-950 dark:text-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-block rounded-full bg-brand-orange/15 border border-brand-orange/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                Visitor Access
              </span>
              <span className="text-[11px] text-muted-foreground">No account required</span>
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Visiting a resident or flat?</p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                Visitors do not need an account. Request guest entry directly to notify the resident immediately for gate approval.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-brand-orange/40 text-foreground hover:bg-brand-orange/10 font-semibold text-xs h-9"
              onClick={async () => {
                await navigate({ to: "/invite" });
              }}
            >
              Request Visit as Guest <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

