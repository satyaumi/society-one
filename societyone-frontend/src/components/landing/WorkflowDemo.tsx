import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Scan,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
  UserCheck,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface DemoStep {
  id: string;
  stepNumber: string;
  tabLabel: string;
  actor: string;
  actorRole: string;
  title: string;
  subtitle: string;
  bulletPoints: string[];
  statusLabel: string;
  statusColor: string;
  ctaText?: string;
  ctaLink?: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: "request",
    stepNumber: "01",
    tabLabel: "Request",
    actor: "Guest Visitor",
    actorRole: "Public Web / Gate Kiosk",
    title: "Instant Visitor Request",
    subtitle:
      "A guest opens SocietyOne directly on their phone or gate tablet. No password, no app install, and no signup barrier.",
    bulletPoints: [
      "Zero account creation or credentials required",
      "Dynamic building & flat selector with resident lookup",
      "Instant tracking ID with live status updates",
    ],
    statusLabel: "REQUEST SUBMITTED",
    statusColor: "amber",
    ctaText: "Try Instant Request",
    ctaLink: "/invite",
  },
  {
    id: "approve",
    stepNumber: "02",
    tabLabel: "Approve",
    actor: "Flat Resident",
    actorRole: "Mobile & Web Portal",
    title: "One-Tap Resident Approval",
    subtitle:
      "The flat resident receives a real-time push alert with the visitor's photo, name, mobile number, and purpose of visit.",
    bulletPoints: [
      "Instant notification on resident phone / dashboard",
      "One-click Approve or Deny with custom entry notes",
      "Pre-authorizations supported for Swiggy, Zomato & deliveries",
    ],
    statusLabel: "APPROVED BY RESIDENT",
    statusColor: "emerald",
    ctaText: "Resident Portal",
    ctaLink: "/login?role=RESIDENT",
  },
  {
    id: "verify",
    stepNumber: "03",
    tabLabel: "Verify",
    actor: "Gate Security Officer",
    actorRole: "Gate Desk Terminal",
    title: "Security Identity Verification",
    subtitle:
      "Gate officers see approved arrivals pop up immediately on their live arrival desk, verifying vehicle number and phone number.",
    bulletPoints: [
      "Live synchronized arrival queue updated in real-time",
      "Quick phone & vehicle number confirmation",
      "Eliminates paper registers and gate traffic jams",
    ],
    statusLabel: "SECURITY VERIFIED",
    statusColor: "blue",
    ctaText: "Security Gate Desk",
    ctaLink: "/login?role=SECURITY",
  },
  {
    id: "enter",
    stepNumber: "04",
    tabLabel: "Enter",
    actor: "Digital Pass & Barrier",
    actorRole: "Automated Gate Access",
    title: "Gate Clearance & Safe Entry",
    subtitle:
      "Security admits the visitor with one tap. A digital gate pass is issued, the barrier opens, and the resident is informed.",
    bulletPoints: [
      "Digital visitor pass generated with unique security token",
      "Boom barrier cleared and gate entry timestamp recorded",
      "Resident notified: 'Your visitor has arrived at Gate 1'",
    ],
    statusLabel: "CHECKED IN • ACTIVE ON PREMISES",
    statusColor: "emerald",
  },
  {
    id: "exit",
    stepNumber: "05",
    tabLabel: "Exit",
    actor: "Society Audit Trail",
    actorRole: "Immutable Compliance Log",
    title: "Verified Departure & Audit Record",
    subtitle:
      "Upon leaving, security marks departure. Total stay duration is calculated, and an immutable audit log is saved permanently.",
    bulletPoints: [
      "Departure recorded at any exit gate in under 3 seconds",
      "Exact visit duration, gate number, and officer ID stored",
      "Tamper-proof audit logs available for society committee",
    ],
    statusLabel: "VISIT COMPLETED • AUDIT LOGGED",
    statusColor: "indigo",
  },
];

const STEP_DURATION_MS = 5000;

export function WorkflowDemo() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const step = DEMO_STEPS[currentStepIndex];
  const progressIntervalRef = useRef<number | null>(null);

  // Auto-advance loop
  useEffect(() => {
    if (!isPlaying || isHovered) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 50;
    const totalTicks = STEP_DURATION_MS / intervalStep;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / totalTicks;
        if (next >= 100) {
          setCurrentStepIndex((prevIdx) => (prevIdx + 1) % DEMO_STEPS.length);
          return 0;
        }
        return next;
      });
    }, intervalStep);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, isHovered, currentStepIndex]);

  function handleSelectStep(index: number) {
    setCurrentStepIndex(index);
    setProgress(0);
  }

  function handleTogglePlay() {
    setIsPlaying((prev) => !prev);
  }

  function handleRestart() {
    setCurrentStepIndex(0);
    setProgress(0);
    setIsPlaying(true);
  }

  function handlePrev() {
    setCurrentStepIndex((prev) => (prev === 0 ? DEMO_STEPS.length - 1 : prev - 1));
    setProgress(0);
  }

  function handleNext() {
    setCurrentStepIndex((prev) => (prev + 1) % DEMO_STEPS.length);
    setProgress(0);
  }

  return (
    <div
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Demo Header Bar with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-full bg-rose-500/80" />
            <span className="size-3 rounded-full bg-amber-500/80" />
            <span className="size-3 rounded-full bg-emerald-500/80" />
          </div>

          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Interactive Product Demo
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
            <span className="size-1.5 rounded-full bg-brand-blue animate-pulse" />
            Live Workflow Simulation
          </span>
        </div>

        {/* Step Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {DEMO_STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                  isActive
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                <span>{s.stepNumber}</span>
                <span className="hidden sm:inline">{s.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous step"
            className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Pause demo" : "Play demo"}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5 text-amber-500 fill-amber-500" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 text-emerald-500 fill-emerald-500" />
                <span className="hidden sm:inline">Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next step"
            className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ›
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Restart demo"
            className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Restart demo"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-brand-orange transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Showcase Grid */}
      <div className="grid gap-8 p-6 lg:grid-cols-12 lg:items-center lg:p-10">
        {/* Left: Step Description */}
        <div className="space-y-5 lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-warning-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            <span>Step {step.stepNumber} of 05</span>
            <span>•</span>
            <span>{step.actor}</span>
          </div>

          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {step.title}
          </h3>

          <p className="text-base leading-relaxed text-muted-foreground">
            {step.subtitle}
          </p>

          <ul className="space-y-2.5 pt-2">
            {step.bulletPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check className="size-3.5 stroke-[2.5]" />
                </div>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {step.ctaText && step.ctaLink && (
            <div className="pt-3">
              <Link
                to={step.ctaLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-blue/90"
              >
                {step.ctaText}
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Right: Simulated Video-like SaaS UI Screen */}
        <div className="lg:col-span-7">
          <div className="relative overflow-hidden rounded-xl border border-border bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-6">
            {/* Screen Header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-medium text-slate-300">SocietyOne Live Environment</span>
              </div>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                {step.actorRole}
              </span>
            </div>

            {/* Simulated Stage Visuals */}
            <div className="min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
              {currentStepIndex === 0 && <StepOneVisual />}
              {currentStepIndex === 1 && <StepTwoVisual />}
              {currentStepIndex === 2 && <StepThreeVisual />}
              {currentStepIndex === 3 && <StepFourVisual />}
              {currentStepIndex === 4 && <StepFiveVisual />}
            </div>

            {/* Screen Footer Status Banner */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/90 px-3.5 py-2.5 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-400">Current Phase:</span>
                <span className="font-semibold text-white">{step.title}</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${
                  step.statusColor === "emerald"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : step.statusColor === "amber"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : step.statusColor === "blue"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {step.statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepOneVisual() {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3 border border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-orange tracking-wider">
            Green Valley Residency
          </p>
          <p className="font-display text-sm font-bold text-white">
            Guest Visit Request (No Signup Needed)
          </p>
        </div>
        <div className="rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
          Token #REQ-8291
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
          <span className="text-slate-400">Visitor Name</span>
          <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
            <User className="size-3.5 text-brand-blue" />
            Rahul Sharma
          </p>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
          <span className="text-slate-400">Mobile Number</span>
          <p className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
            <Smartphone className="size-3.5 text-brand-blue" />
            +91 98765 43210
          </p>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
          <span className="text-slate-400">Destination</span>
          <p className="font-semibold text-emerald-400 mt-0.5">
            Tower A • 4th Floor • Flat 402
          </p>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
          <span className="text-slate-400">Visiting Resident</span>
          <p className="font-semibold text-white mt-0.5">
            Satya (Primary Resident)
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-emerald-950/40 p-3 border border-emerald-500/30">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="size-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-300">Request Validated & Sent</p>
            <p className="text-[11px] text-emerald-400/80">
              Resident notified in real time on mobile app
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">Just now</span>
      </div>
    </div>
  );
}

function StepTwoVisual() {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-3 border border-brand-orange/40 shadow-lg">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-orange/20 text-brand-orange">
          <Bell className="size-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white">SocietyOne • Visitor Alert</p>
            <span className="text-[10px] text-slate-400">10s ago</span>
          </div>
          <p className="text-xs text-slate-300 truncate">
            Rahul Sharma is at the main gate requesting entry to Flat 402.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/90 p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-brand-blue/30 text-brand-blue font-bold grid place-items-center text-xs">
              RS
            </div>
            <div>
              <p className="text-xs font-bold text-white">Rahul Sharma</p>
              <p className="text-[11px] text-slate-400">Purpose: Personal Guest • Expected: Today</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30">
            Awaiting Decision
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 text-center rounded-lg bg-slate-800 py-2 text-xs font-semibold text-slate-300">
            Deny Entry
          </div>
          <div className="flex-1 text-center rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 ring-2 ring-emerald-400/30">
            <Check className="size-3.5" />
            Approve Entry
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
        <ShieldCheck className="size-3.5 text-emerald-400" />
        <span>Pre-approval token automatically synced with Gate Security</span>
      </div>
    </div>
  );
}

function StepThreeVisual() {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3 border border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-brand-blue" />
          <span className="text-xs font-bold text-white">Gate 1 Security Terminal</span>
        </div>
        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold px-2 py-0.5">
          Live Arrival Queue
        </span>
      </div>

      <div className="rounded-xl bg-slate-900/90 p-3.5 border border-blue-500/30 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Rahul Sharma</span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
            ✓ Approved by Flat 402 (Satya)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg">
          <div>
            <span className="text-slate-500 block">Phone</span>
            <span className="font-mono">...43210</span>
          </div>
          <div>
            <span className="text-slate-500 block">Vehicle</span>
            <span className="font-mono">OD-02-X-4921</span>
          </div>
          <div>
            <span className="text-slate-500 block">Pass Type</span>
            <span className="text-amber-300">Guest</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="size-3 text-slate-400" />
            Arrival: 10:14 AM
          </span>
          <div className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow">
            <Scan className="size-3.5" />
            Verify & Admit
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/50 p-2 text-center text-[11px] text-slate-400">
        Officer: Chandan (Security ID #SEC-04) • Terminal Online
      </div>
    </div>
  );
}

function StepFourVisual() {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 to-emerald-950/40 p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <QrCode className="size-4 text-emerald-400" />
            <span className="font-display text-xs font-bold text-white tracking-wider">
              DIGITAL VISITOR PASS
            </span>
          </div>
          <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5">
            #SO-8291 • VALID
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="font-display text-base font-bold text-white">Rahul Sharma</p>
            <p className="text-xs text-slate-300">Visiting Flat 402 • Tower A</p>
            <p className="text-[11px] text-slate-400 mt-1">Host: Satya (Resident)</p>
          </div>
          <div className="grid size-12 place-items-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-400">Gate 1 Barrier Opened</span>
          <span className="font-mono text-emerald-400 font-semibold">10:15 AM Today</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-900/90 p-2.5 border border-slate-800 text-xs text-slate-300">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          Active on Society Premises
        </span>
        <span className="text-slate-400">Live Timer: 00:01:14</span>
      </div>
    </div>
  );
}

function StepFiveVisual() {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-lg bg-slate-900 p-3 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-indigo-400" />
          <span className="text-xs font-bold text-white">Society Audit Trail</span>
        </div>
        <span className="rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5">
          Permanent Record
        </span>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">VISITOR_DEPARTED</span>
            <span className="font-mono text-slate-400 text-[11px]">11:39 AM</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Visitor Rahul Sharma checked out at Gate 2. Total duration: 1h 24m.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
            <span>Actor: Security Officer (Gate 2)</span>
            <span>•</span>
            <span>Target: Pass #SO-8291</span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Integrity Verification</span>
          <span className="text-emerald-400 font-mono">SHA-256 Validated</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
        <Check className="size-3.5 text-emerald-400" />
        <span>Full visit lifecycle completed with 100% accountability</span>
      </div>
    </div>
  );
}
