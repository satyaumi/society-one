import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import societyOneLogo from "@/assets/societyone-logo.png";
import { Link } from "@tanstack/react-router";
/**
 * Reusable split-screen authentication shell.
 * Every auth route renders inside this so the visual identity is guaranteed identical to /auth.
 * Do NOT duplicate sidebars on each page.
 */
export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footerNote,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | ReactNode;
  children: ReactNode;
  footerNote?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[.8fr_1.2fr]">
      {/* Left: branded intro */}
      <div className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
      <Link
  to="/"
  className="flex w-fit items-center gap-3 rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
  aria-label="Go to SocietyOne home"
  >
  <img
    src={societyOneLogo}
    alt="SocietyOne"
    loading="eager"
    decoding="sync"
    className="size-11 rounded-xl object-cover shadow-sm"
  />
  <span className="font-display text-xl font-bold">
    Society<span className="text-sidebar-primary">One</span>
  </span>
</Link>
        <div>
          <ShieldCheck className="size-12 text-sidebar-primary" />
          <h1 className="mt-6 max-w-md font-display text-5xl font-bold leading-tight">
            A calmer gate starts here.
          </h1>
          <p className="mt-5 max-w-md leading-7 text-sidebar-foreground/70">
            A focused visitor workflow for the people who make a residential community
            feel like home.
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">
          Frontend · Spring Boot ready · JWT + OTP authentication
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">
         <div className="mb-10 lg:hidden">
  <Link
    to="/"
    className="inline-flex flex-col rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-orange"
    aria-label="Go to SocietyOne home"
  >
    <img
      src={societyOneLogo}
      alt="SocietyOne"
      loading="eager"
      decoding="sync"
      className="size-12 rounded-xl object-cover shadow-sm"
    />
    <p className="mt-4 font-display text-xl font-bold">
      Society<span className="text-brand-orange">One</span>
    </p>
  </Link>
</div>
          {eyebrow && (
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 leading-7 text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
          {footerNote && (
            <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
              {footerNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
