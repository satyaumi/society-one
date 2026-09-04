// import { Link, createFileRoute } from "@tanstack/react-router";
// import { ArrowRight, Check, ChevronRight, ShieldCheck, Users, Zap } from "lucide-react";
// import logoAsset from "@/assets/societyone-logo.png.asset.json";
// import { Button } from "@/components/ui/button";

// export const Route = createFileRoute("/")({
//   head: () => ({ meta: [
//     { title: "SocietyOne | Visitor Management for Residential Societies" },
//     { name: "description", content: "A safer, simpler way to manage visitors, resident approvals, and gate security." },
//     { property: "og:title", content: "SocietyOne | Visitor Management for Residential Societies" },
//     { property: "og:description", content: "A safer, simpler way to manage visitors, resident approvals, and gate security." },
//     { property: "og:type", content: "website" },
//     { name: "twitter:card", content: "summary_large_image" },
//   ] }),
//   component: HomePage,
// });

// function HomePage() {
//   return (
//     <div className="min-h-screen overflow-hidden bg-background">
//       <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
//         <Link to="/" className="flex items-center gap-3" aria-label="SocietyOne home">
//           <img src={logoAsset.url} alt="SocietyOne" className="size-11 rounded-xl object-cover" />
//           <span className="font-display text-xl font-bold tracking-tight text-foreground">Society<span className="text-brand-orange">One</span></span>
//         </Link>
//         <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex" aria-label="Main navigation">
//           <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
//           <a href="#features" className="transition-colors hover:text-foreground">Features</a>
//           <a href="#about" className="transition-colors hover:text-foreground">About</a>
//         </nav>
//         <Button asChild variant="outline" className="border-brand-blue/20">
//           <Link to="/login">Sign in <ArrowRight /></Link>
//         </Button>
//       </header>

//       <main>
//         <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-20">
//           <div className="relative z-10">
//             <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-warning-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground">
//               <span className="size-2 rounded-full bg-brand-orange" /> Built for better communities
//             </div>
//             <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">Safer entries.<br /><span className="text-brand-blue">Stronger communities.</span></h1>
//             <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">Simple visitor and security management for residential societies. One clear workflow for visitors, residents, and the gate team.</p>
//             <div className="mt-9 flex flex-col gap-3 sm:flex-row">
//               <Button asChild size="lg" className="h-12 rounded-lg bg-brand-blue px-6 hover:bg-brand-blue/90"><Link to="/auth">Get started <ArrowRight /></Link></Button>
//               <Button asChild variant="outline" size="lg" className="h-12 rounded-lg px-6"><a href="#how-it-works">See how it works <ChevronRight /></a></Button>
//             </div>
//             <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
//               {["Role-aware by design", "Built for Indian societies", "Spring Boot API-ready"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="size-4 text-success" />{item}</span>)}
//             </div>
//           </div>
//           <div className="relative mx-auto w-full max-w-[520px]">
//             <div className="absolute -inset-8 rounded-[3rem] bg-info-soft blur-3xl" />
//             <div className="relative overflow-hidden rounded-[2rem] border border-brand-blue/10 bg-sidebar p-3 shadow-2xl shadow-brand-blue/20">
//               <img src={logoAsset.url} alt="SocietyOne community security mark" className="aspect-square w-full rounded-[1.5rem] object-cover" />
//               <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar/90 px-4 py-3 text-sidebar-foreground backdrop-blur">
//                 <div><p className="text-xs text-sidebar-foreground/70">Today at Green Residency</p><p className="mt-1 font-display font-semibold">18 visitors managed</p></div>
//                 <div className="grid size-10 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-5" /></div>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section id="how-it-works" className="border-y border-border bg-card px-5 py-20 lg:px-8">
//           <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange">One simple flow</p><h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">From request to welcome.</h2><p className="mt-4 text-muted-foreground">Every visit stays clear, visible, and accountable from the first request to the final exit.</p></div>
//             <div className="mt-12 grid gap-4 md:grid-cols-5">{[["01", "Request", "Visitor or resident starts a visit request."], ["02", "Approve", "Resident reviews and responds."], ["03", "Verify", "Security confirms at the gate."], ["04", "Enter", "Visitor is checked in safely."], ["05", "Exit", "Visit closes with a clear record."]].map(([number, title, detail], index) => <div key={number} className="relative border-l-2 border-brand-blue/15 pl-5 md:border-l-0 md:border-t-2 md:pl-0 md:pt-5"><span className="font-display text-sm font-bold text-brand-orange">{number}</span><h3 className="mt-2 font-display text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>{index < 4 && <ArrowRight className="absolute right-3 top-4 hidden size-4 text-brand-blue/40 md:block" />}</div>)}</div>
//           </div>
//         </section>

//         <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-5 md:grid-cols-3"><Feature icon={<Zap />} title="ONLINE" detail="Plan visits before they arrive. Residents see every request and status." /><Feature icon={<Users />} title="AT SECURITY" detail="Fast, focused gate workflows for unexpected visitors who arrive in person." /><Feature icon={<ShieldCheck />} title="REGULAR" detail="Keep trusted regular visitors on a single reusable profile, with active status." /></div></section>
//         <section id="about" className="bg-sidebar px-5 py-16 text-sidebar-foreground lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-sidebar-primary">Designed for the real world</p><h2 className="mt-3 max-w-xl font-display text-3xl font-bold">Less paperwork at the gate.<br />More peace of mind at home.</h2></div><p className="max-w-md leading-7 text-sidebar-foreground/70">SocietyOne starts with one focused problem — visitor management — and leaves room for the rest of society life to grow into later.</p></div></section>
//       </main>
//       <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 SocietyOne</span><span className="flex items-center gap-4"><Link to="/privacy" className="hover:text-foreground">Privacy</Link><Link to="/terms" className="hover:text-foreground">Terms</Link><Link to="/contact" className="hover:text-foreground">Contact</Link></span></footer>
//     </div>
//   );
// }

// function Feature({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="grid size-11 place-items-center rounded-lg bg-info-soft text-brand-blue">{icon}</div><h3 className="mt-6 font-display text-xl font-bold">{title}</h3><p className="mt-2 leading-7 text-muted-foreground">{detail}</p></div>; }
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import logoAsset from "@/assets/societyone-logo.png.asset.json";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="min-h-screen scroll-smooth overflow-hidden bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-xl transition-all duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
          aria-label="Go to SocietyOne home"
        >
          <img
            src={logoAsset.url}
            alt="SocietyOne"
            className="size-11 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Society<span className="text-brand-orange">One</span>
          </span>
        </Link>

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

        <Button
          asChild
          variant="outline"
          className="border-brand-blue/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
        >
          <Link to="/login">
            Sign in
            <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-warning-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground transition-transform duration-300 hover:-translate-y-0.5">
              <span className="size-2 rounded-full bg-brand-orange" />
              Built for better communities
            </div>

            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Safer entries.
              <br />
              <span className="text-brand-blue">
                Stronger communities.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
              Simple visitor and security management for residential
              societies. One clear workflow for visitors, residents, and the
              gate team.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-lg bg-brand-blue px-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-blue/90 hover:shadow-lg active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <Link to="/auth">
                  Get started
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="group h-12 rounded-lg px-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <a href="#how-it-works">
                  See how it works
                  <ChevronRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              {[
                "Role-aware by design",
                "Built for Indian societies",
                "Spring Boot API-ready",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 transition-transform duration-200 hover:translate-x-1"
                >
                  <Check className="size-4 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="group relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-info-soft blur-3xl transition-opacity duration-500 group-hover:opacity-80" />

            <div className="relative overflow-hidden rounded-[2rem] border border-brand-blue/10 bg-sidebar p-3 shadow-2xl shadow-brand-blue/20 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-brand-blue/30">
              <img
                src={logoAsset.url}
                alt="SocietyOne community security mark"
                className="aspect-square w-full rounded-[1.5rem] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              />

              <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar/90 px-4 py-3 text-sidebar-foreground backdrop-blur transition-transform duration-300 group-hover:-translate-y-1">
                <div>
                  <p className="text-xs text-sidebar-foreground/70">
                    Today at Green Residency
                  </p>
                  <p className="mt-1 font-display font-semibold">
                    18 visitors managed
                  </p>
                </div>

                <div className="grid size-10 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground transition-transform duration-300 group-hover:scale-110">
                  <ShieldCheck className="size-5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-8 border-y border-border bg-card px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange">
                One simple flow
              </p>

              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
                From request to welcome.
              </h2>

              <p className="mt-4 text-muted-foreground">
                Every visit stays clear, visible, and accountable from the
                first request to the final exit.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {[
                ["01", "Request", "Visitor or resident starts a visit request."],
                ["02", "Approve", "Resident reviews and responds."],
                ["03", "Verify", "Security confirms at the gate."],
                ["04", "Enter", "Visitor is checked in safely."],
                ["05", "Exit", "Visit closes with a clear record."],
              ].map(([number, title, detail], index) => (
                <div
                  key={number}
                  className="group relative border-l-2 border-brand-blue/15 pl-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue md:border-l-0 md:border-t-2 md:pl-0 md:pt-5"
                >
                  <span className="font-display text-sm font-bold text-brand-orange">
                    {number}
                  </span>

                  <h3 className="mt-2 font-display text-lg font-semibold transition-colors duration-200 group-hover:text-brand-blue">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {detail}
                  </p>

                  {index < 4 && (
                    <ArrowRight className="absolute right-3 top-4 hidden size-4 text-brand-blue/40 transition-transform duration-300 group-hover:translate-x-1 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-8 mx-auto max-w-7xl px-5 py-20 lg:px-8"
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Feature
              icon={<Zap />}
              title="ONLINE"
              detail="Plan visits before they arrive. Residents see every request and status."
            />

            <Feature
              icon={<Users />}
              title="AT SECURITY"
              detail="Fast, focused gate workflows for unexpected visitors who arrive in person."
            />

            <Feature
              icon={<ShieldCheck />}
              title="REGULAR"
              detail="Keep trusted regular visitors on a single reusable profile, with active status."
            />
          </div>
        </section>

        {/* About */}
        <section
          id="about"
          className="scroll-mt-8 bg-sidebar px-5 py-16 text-sidebar-foreground lg:px-8"
        >
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-sidebar-primary">
                Designed for the real world
              </p>

              <h2 className="mt-3 max-w-xl font-display text-3xl font-bold">
                Less paperwork at the gate.
                <br />
                More peace of mind at home.
              </h2>
            </div>

            <p className="max-w-md leading-7 text-sidebar-foreground/70">
              SocietyOne starts with one focused problem — visitor management
              — and leaves room for the rest of society life to grow into
              later.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>© 2026 SocietyOne</span>

        <span className="flex items-center gap-4">
          <Link
            to="/privacy"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            Privacy
          </Link>

          <Link
            to="/terms"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            Terms
          </Link>

          <Link
            to="/contact"
            className="rounded-md transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
          >
            Contact
          </Link>
        </span>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/20 hover:shadow-lg focus-within:ring-2 focus-within:ring-brand-blue/20">
      <div className="grid size-11 place-items-center rounded-lg bg-info-soft text-brand-blue transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      <h3 className="mt-6 font-display text-xl font-bold transition-colors duration-200 group-hover:text-brand-blue">
        {title}
      </h3>

      <p className="mt-2 leading-7 text-muted-foreground">{detail}</p>
    </div>
  );
}