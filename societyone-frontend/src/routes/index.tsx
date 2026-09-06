import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Clock,
  FileCheck2,
  Home,
  Lock,
  Menu,
  QrCode,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import societyOneLogo from "@/assets/societyone-logo.png";
import { Button } from "@/components/ui/button";
import { publicService, type PublicSummary } from "@/services";
import { authStore } from "@/lib/auth/auth-store";
import { WorkflowDemo } from "@/components/landing/WorkflowDemo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SocietyOne | Visitor Management for Residential Societies" },
      {
        name: "description",
        content:
          "A safer, simpler way to manage visitors, resident approvals, and gate security.",
      },
      {
        property: "og:title",
        content: "SocietyOne | Visitor Management for Residential Societies",
      },
      {
        property: "og:description",
        content:
          "A safer, simpler way to manage visitors, resident approvals, and gate security.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    publicService
      .getSummary()
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch(() => {
        // Fallback default if backend not reachable
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activitiesCount = summary?.todayActivitiesCount ?? summary?.todayVisitorsCount ?? 0;
  const societyName = summary?.societyName || summary?.primarySocietyName || "Residential Societies";

  // Card 1: ONLINE (public visitor workflow, no auth needed)
  function handleOnlineClick() {
    void navigate({ to: "/invite" });
  }

  // Card 2: AT SECURITY (preserves existing security auth)
  function handleSecurityClick() {
    const { isAuthenticated, user } = authStore.getState();
    if (isAuthenticated && user?.role === "SECURITY") {
      void navigate({ to: "/security/at-security" });
    } else {
      void navigate({ to: "/login", search: { role: "SECURITY" } });
    }
  }

  // Card 3: REGULAR PASSES (preserves existing resident & security pass workflows)
  function handleRegularPassesClick() {
    const { isAuthenticated, user } = authStore.getState();
    if (isAuthenticated && user?.role === "RESIDENT") {
      void navigate({ to: "/regular-visitors" });
    } else if (isAuthenticated && user?.role === "SECURITY") {
      void navigate({ to: "/security/regular" });
    } else {
      void navigate({ to: "/login", search: { role: "RESIDENT" } });
    }
  }

  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-2.5 rounded-xl transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
            aria-label="Go to SocietyOne home"
          >
            <img
              src={societyOneLogo}
              alt="SocietyOne"
              className="size-9 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-105 sm:size-10"
            />

            <span className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Society<span className="text-brand-orange">One</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            <a
              href="#how-it-works"
              className="rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              How it works
            </a>

            <a
              href="#features"
              className="rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              Features
            </a>

            <a
              href="#about"
              className="rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              About
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              <Link to="/invite">
                <Zap className="mr-1.5 size-4 text-brand-orange" />
                Instant Visit
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-brand-blue/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              <Link to="/login" search={{ role: undefined }}>
                Sign in
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground md:hidden"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-4 py-4 space-y-3 md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2 text-sm font-medium text-muted-foreground">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground"
              >
                About
              </a>
            </div>

            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Button asChild className="w-full bg-brand-orange text-white hover:bg-brand-orange/90 justify-center">
                <Link to="/invite" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="mr-2 size-4" />
                  Instant Visit Request (No Signup)
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-center">
                <Link to="/login" search={{ role: undefined }} onClick={() => setMobileMenuOpen(false)}>
                  Sign in to Portal
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-16">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-warning-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground transition-transform duration-300 hover:-translate-y-0.5">
              <span className="size-2 rounded-full bg-brand-orange animate-pulse" />
              Built for modern residential societies
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Safer entries.
              <br />
              <span className="text-brand-blue">
                Stronger communities.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
              Simple, reliable visitor and security management for residential
              societies. One seamless workflow connecting visitors, residents, and
              the gate security team.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-xl bg-brand-orange px-6 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-orange/90 hover:shadow-lg active:translate-y-0 focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
              >
                <Link to="/invite">
                  <Zap className="mr-2 size-4" />
                  Instant Visit Request
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                className="group h-12 rounded-xl bg-brand-blue px-6 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-blue/90 hover:shadow-lg active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <Link to="/auth">
                  Resident & Staff Portal
                  <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="group h-12 rounded-xl px-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <a href="#how-it-works">
                  See how it works
                  <ChevronRight className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </Button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-muted-foreground sm:text-sm">
              {[
                "Role-aware by design",
                "Instant resident notifications",
                "Spring Boot & PostgreSQL powered",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 transition-transform duration-200 hover:translate-x-0.5"
                >
                  <Check className="size-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Hero Visual Card: Dynamic Activities Display */}
          <div className="group relative mx-auto w-full max-w-[480px]">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-info-soft blur-3xl transition-opacity duration-500 group-hover:opacity-90" />

            <div className="relative overflow-hidden rounded-[2rem] border border-brand-blue/15 bg-card p-3 shadow-2xl shadow-brand-blue/20 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-brand-blue/30">
              <img
                src={societyOneLogo}
                alt="SocietyOne community mark"
                className="aspect-square w-full rounded-[1.5rem] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />

              {/* Dynamic Activities Count Banner (Replaces static "Gate active & ready") */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-xl border border-sidebar-border/80 bg-sidebar/95 px-5 py-3.5 text-sidebar-foreground backdrop-blur-md shadow-xl transition-transform duration-300 group-hover:-translate-y-1">
                <div>
                  <p className="text-[11px] font-bold tracking-wider uppercase text-sidebar-foreground/75">
                    Today's Activities
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      {activitiesCount}
                    </span>
                    <span className="text-xs font-medium text-sidebar-foreground/70 truncate max-w-[150px] sm:max-w-[200px]">
                      at {societyName}
                    </span>
                  </div>
                </div>

                <div className="grid size-11 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-md transition-transform duration-300 group-hover:scale-110 shrink-0">
                  <ShieldCheck className="size-6" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: From Request to Welcome + Interactive Product Demo */}
        <section
          id="how-it-works"
          className="scroll-mt-14 border-y border-border bg-card px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange sm:text-sm">
                One simple flow
              </p>

              <h2 className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                From request to welcome.
              </h2>

              <p className="mt-3.5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Every visit stays clear, visible, and accountable from the
                first invitation to the verified exit.
              </p>
            </div>

            {/* 5-Step Overview Pipeline */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["01", "Request", "Visitor or resident starts a visit request."],
                ["02", "Approve", "Resident reviews and approves the entry."],
                ["03", "Verify", "Gate security verifies visitor identity."],
                ["04", "Enter", "Visitor checks in safely at the gate."],
                ["05", "Exit", "Departure completes with clear audit record."],
              ].map(([number, title, detail], index) => (
                <div
                  key={number}
                  className="group relative border-l-2 border-brand-blue/15 pl-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-blue lg:border-l-0 lg:border-t-2 lg:pl-0 lg:pt-4"
                >
                  <span className="font-display text-xs font-bold text-brand-orange">
                    {number}
                  </span>

                  <h3 className="mt-1.5 font-display text-base font-semibold transition-colors duration-200 group-hover:text-brand-blue">
                    {title}
                  </h3>

                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {detail}
                  </p>

                  {index < 4 && (
                    <ArrowRight className="absolute right-2 top-3 hidden size-4 text-brand-blue/40 transition-transform duration-300 group-hover:translate-x-1 lg:block" />
                  )}
                </div>
              ))}
            </div>

            {/* Interactive SaaS Video-like Demonstration */}
            <WorkflowDemo />
          </div>
        </section>

        {/* Section: 3 Interactive Feature Cards */}
        <section
          id="features"
          className="scroll-mt-14 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue sm:text-sm">
              Tailored Access Points
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Three clear ways into the community.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Click any workflow below to launch the dedicated experience.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 1. ONLINE CARD */}
            <InteractiveCard
              icon={<Zap className="size-6 text-brand-orange" />}
              iconBg="bg-warning-soft"
              tag="Public • No Login Required"
              tagColor="amber"
              title="ONLINE"
              detail="Pre-schedule visits before arrivals. Guests submit requests directly, residents see instant alerts, and visitors track live approval statuses."
              actionLabel="Start Instant Visit"
              onClick={handleOnlineClick}
            />

            {/* 2. AT SECURITY CARD */}
            <InteractiveCard
              icon={<Users className="size-6 text-brand-blue" />}
              iconBg="bg-info-soft"
              tag="Security Officers Desk"
              tagColor="blue"
              title="AT SECURITY"
              detail="Fast, focused gate desk workflows for walk-in arrivals, delivery agents, and service technicians with real-time arrival verification."
              actionLabel="Access Gate Desk"
              onClick={handleSecurityClick}
            />

            {/* 3. REGULAR PASSES CARD */}
            <InteractiveCard
              icon={<ShieldCheck className="size-6 text-emerald-600" />}
              iconBg="bg-emerald-500/10"
              tag="Resident & Security Pass"
              tagColor="emerald"
              title="REGULAR PASSES"
              detail="Keep trusted domestic workers, drivers, and maintenance contractors on managed profiles with one-day or permanent validities."
              actionLabel="Manage Regular Passes"
              onClick={handleRegularPassesClick}
            />
          </div>
        </section>

        {/* Section: Improved About SocietyOne */}
        <section
          id="about"
          className="scroll-mt-14 bg-sidebar px-4 py-16 text-sidebar-foreground sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            {/* Headline Header */}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end border-b border-sidebar-border pb-10">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sidebar-primary sm:text-sm">
                  Designed for the real world
                </p>

                <h2 className="mt-2.5 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Less paperwork at the gate.
                  <br />
                  More peace of mind at home.
                </h2>
              </div>

              <p className="max-w-md text-sm leading-relaxed text-sidebar-foreground/75 sm:text-base sm:leading-7">
                SocietyOne is the complete residential security and visitor operating system.
                We eliminate manual logbooks, long gate queues, and unauthorized entries by
                connecting visitors, residents, and gate security into a single synchronized workflow.
              </p>
            </div>

            {/* 4 Feature Pillars Grid */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pillar 1: Residents */}
              <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 p-5 backdrop-blur transition-all duration-300 hover:border-sidebar-border hover:bg-sidebar-accent/50">
                <div className="grid size-10 place-items-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <Home className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  Residents & Households
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
                  Instant mobile notifications for arrivals, one-tap approvals from anywhere, and seamless delivery pre-authorizations for Swiggy, Zomato, and parcel deliveries.
                </p>
              </div>

              {/* Pillar 2: Visitors */}
              <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 p-5 backdrop-blur transition-all duration-300 hover:border-sidebar-border hover:bg-sidebar-accent/50">
                <div className="grid size-10 place-items-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <UserCheck className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  Zero-Barrier Visitors
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
                  No app download, password, or account setup required. Guests request entry via a quick public link with real-time status updates right on their mobile device.
                </p>
              </div>

              {/* Pillar 3: Security */}
              <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 p-5 backdrop-blur transition-all duration-300 hover:border-sidebar-border hover:bg-sidebar-accent/50">
                <div className="grid size-10 place-items-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <Shield className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  Gate Security Teams
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
                  Lightning-fast digital check-in desks, walk-in registration, recurring worker pass verification, and vehicle tracking that replaces illegible paper logbooks.
                </p>
              </div>

              {/* Pillar 4: Accountability */}
              <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 p-5 backdrop-blur transition-all duration-300 hover:border-sidebar-border hover:bg-sidebar-accent/50">
                <div className="grid size-10 place-items-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <FileCheck2 className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  Complete Audit Trail
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
                  Tamper-evident timestamped logs for every visitor request, approval, gate admission, and departure. Complete transparency for society committees.
                </p>
              </div>
            </div>

            {/* Bottom Key Value Ribbon */}
            <div className="mt-12 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-5 text-xs text-sidebar-foreground/80">
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <div>
                  <p className="font-display text-xl font-bold text-white sm:text-2xl">100%</p>
                  <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Paperless Gates</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-white sm:text-2xl">0 sec</p>
                  <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Visitor Signup Barrier</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-white sm:text-2xl">Real-time</p>
                  <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Gate Synchronization</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-white sm:text-2xl">Verified</p>
                  <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Audit Compliance</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm sm:px-6 lg:px-8">
        <span>© 2026 SocietyOne. All rights reserved.</span>

        <span className="flex items-center gap-6">
          <Link
            to="/privacy"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            Privacy
          </Link>

          <Link
            to="/terms"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            Terms
          </Link>

          <Link
            to="/contact"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            Contact
          </Link>
        </span>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// Clickable Interactive Feature Card Component
// ----------------------------------------------------
function InteractiveCard({
  icon,
  iconBg,
  tag,
  tagColor,
  title,
  detail,
  actionLabel,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  tag: string;
  tagColor: "amber" | "blue" | "emerald";
  title: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-blue/30 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-blue active:translate-y-0"
    >
      <div>
        {/* Top bar with Icon and Tag */}
        <div className="flex items-center justify-between">
          <div
            className={`grid size-12 place-items-center rounded-xl ${iconBg} shadow-sm transition-transform duration-300 group-hover:scale-110`}
          >
            {icon}
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              tagColor === "amber"
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                : tagColor === "blue"
                  ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            }`}
          >
            {tag}
          </span>
        </div>

        <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-brand-blue">
          {title}
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {detail}
        </p>
      </div>

      {/* Action Footer Button */}
      <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4 text-xs font-semibold text-brand-blue">
        <span>{actionLabel}</span>
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
      </div>
    </div>
  );
}