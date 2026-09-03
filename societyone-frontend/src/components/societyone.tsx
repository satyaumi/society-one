import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileClock,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import logoAsset from "@/assets/societyone-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-store";
import { authService, notificationService, realtimeEvents } from "@/services";
import type { Notification, Role, User, VisitRequest } from "@/types/domain";

export type AppPath = "/dashboard" | "/requests" | "/invite" | "/regular-visitors" | "/history" | "/notifications" | "/security/online" | "/security/at-security" | "/security/regular" | "/admin" | "/admin/society" | "/admin/visitors" | "/settings";

const roleLabels: Record<Role, string> = { VISITOR: "Visitor", RESIDENT: "Resident", SECURITY: "Security", ADMIN: "Admin" };
const navByRole: Record<Role, { label: string; to: AppPath; icon: ReactNode }[]> = {
  RESIDENT: [
    { label: "Overview", to: "/dashboard", icon: <Home /> },
    { label: "Visitor requests", to: "/requests", icon: <ClipboardCheck /> },
    { label: "Invite a visitor", to: "/invite", icon: <DoorOpen /> },
    { label: "Regular visitors", to: "/regular-visitors", icon: <Users /> },
    { label: "Visitor history", to: "/history", icon: <FileClock /> },
  ],
  VISITOR: [
    { label: "Overview", to: "/dashboard", icon: <Home /> },
    { label: "My requests", to: "/requests", icon: <ClipboardCheck /> },
    { label: "Request a visit", to: "/invite", icon: <DoorOpen /> },
    { label: "Visit history", to: "/history", icon: <FileClock /> },
  ],
  SECURITY: [
    { label: "Gate overview", to: "/dashboard", icon: <Home /> },
    { label: "Online visitors", to: "/security/online", icon: <ClipboardCheck /> },
    { label: "At security", to: "/security/at-security", icon: <DoorOpen /> },
    { label: "Regular visitors", to: "/security/regular", icon: <Users /> },
    { label: "Entry history", to: "/history", icon: <FileClock /> },
  ],
  ADMIN: [
    { label: "Overview", to: "/dashboard", icon: <Home /> },
    { label: "Society structure", to: "/admin/society", icon: <Building2 /> },
    { label: "Visitor activity", to: "/admin/visitors", icon: <ClipboardCheck /> },
    { label: "Audit history", to: "/history", icon: <FileClock /> },
  ],
};

export function AppShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow?: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(auth.user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setUser(auth.user);
  }, [auth.user]);

  useEffect(() => {
    let mounted = true;
    void Promise.all([authService.getCurrentUser(), notificationService.list("RESIDENT")]).then(([currentUser, items]) => {
      if (mounted) {
        setUser(currentUser);
        setNotifications(items);
      }
    });
    const unsubscribe = realtimeEvents.subscribe(() => {
      void notificationService.list("RESIDENT").then(setNotifications);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const role = user?.role ?? "RESIDENT";
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  async function signOut() {
    await authService.logout();
    setMobileOpen(false);
    await router.navigate({ to: "/login" });
  }

  return (
    <div className="app-shell-grid bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:h-full lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-6 sm:h-20">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="SocietyOne dashboard">
            <img src={logoAsset.url} alt="SocietyOne" className="size-9 rounded-lg object-cover" />
            <span className="font-display text-lg font-bold">
              Society<span className="text-sidebar-primary">One</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </Button>
        </div>
        <div className="shrink-0 border-b border-sidebar-border px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            SocietyOne workspace
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
              {user?.name?.slice(0, 1) ?? "S"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name ?? "Loading profile"}</p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabels[role]}</p>
            </div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Workspace navigation">
          {navByRole[role].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="my-4 border-t border-sidebar-border" />
          <Link
            to="/notifications"
            onClick={() => setMobileOpen(false)}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Bell />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="size-4" /> Settings
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="z-20 flex min-h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:min-h-20 sm:px-5 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu />
            </Button>
            <div className="min-w-0">
              <p className="hidden text-xs font-bold uppercase tracking-[0.16em] text-brand-blue sm:block">
                {eyebrow ?? "SocietyOne workspace"}
              </p>
              <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <Bell />
              {unreadCount > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-brand-orange" />}
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Link to="/settings" className="hidden items-center gap-2 text-right sm:flex">
              <p className="max-w-[10rem] truncate text-sm font-semibold">{user?.name}</p>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </header>
        {notificationsOpen && <NotificationPopover notifications={notifications} onClose={() => setNotificationsOpen(false)} />}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-[1440px] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-7 lg:px-9 lg:py-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NotificationPopover({ notifications, onClose }: { notifications: Notification[]; onClose: () => void }) { return <div className="fixed right-5 top-[76px] z-30 w-[min(360px,calc(100vw-40px))] rounded-xl border border-border bg-card p-4 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-display font-bold">Notifications</h2><Button variant="ghost" size="icon" aria-label="Close notifications" onClick={onClose}><X /></Button></div><div className="mt-2 divide-y divide-border">{notifications.slice(0, 3).map((item) => <div key={item.id} className="flex gap-3 py-3"><div className="mt-1 size-2 shrink-0 rounded-full bg-brand-orange" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.timestamp}</p></div></div>)}</div><Link to="/notifications" className="mt-2 block text-center text-sm font-semibold text-brand-blue" onClick={onClose}>View all notifications</Link></div>; }

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="grid gap-5 border-b border-border pb-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-brand-orange">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>; }

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) { return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">{title}</h2>{action}</div>; }

export function StatGrid({ stats }: { stats: { label: string; value: string; helper: string; tone: "blue" | "orange" | "green" | "slate" }[] }) { const tones = { blue: "bg-info-soft text-brand-blue", orange: "bg-warning-soft text-accent-foreground", green: "bg-success-soft text-success", slate: "bg-secondary text-secondary-foreground" }; return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><p className="text-sm text-muted-foreground">{stat.label}</p><span className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", tones[stat.tone])}><span aria-hidden="true">●</span></span></div><p className="mt-4 font-display text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p></div>)}</div>; }

export function StatusBadge({ status }: { status: VisitRequest["requestStatus"] | VisitRequest["visitStatus"] }) { const labels: Record<string, string> = { PENDING_RESIDENT: "Pending resident", APPROVED_BY_RESIDENT: "Resident approved", DENIED_BY_RESIDENT: "Resident denied", PENDING_SECURITY: "Pending security", ACCEPTED_BY_SECURITY: "Entry accepted", DENIED_BY_SECURITY: "Entry denied", CANCELLED: "Cancelled", EXPIRED: "Expired", EXPECTED: "Expected", WAITING_AT_GATE: "Waiting at gate", CHECKED_IN: "Checked in", CHECKED_OUT: "Checked out", NO_SHOW: "No show" }; const positive = ["APPROVED_BY_RESIDENT", "ACCEPTED_BY_SECURITY", "CHECKED_IN", "CHECKED_OUT"].includes(status); const warning = ["PENDING_RESIDENT", "PENDING_SECURITY", "EXPECTED", "WAITING_AT_GATE"].includes(status); return <Badge variant={positive ? "default" : warning ? "secondary" : "destructive"} className={cn(positive && "bg-success text-primary-foreground", warning && "bg-warning-soft text-accent-foreground")}>{labels[status] ?? status}</Badge>; }

export function RequestRow({ request, actions }: { request: VisitRequest; actions?: ReactNode }) { return <div className="grid gap-4 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-info-soft font-display font-bold text-brand-blue">{request.visitor.name.slice(0, 1)}</div><div className="min-w-0"><p className="truncate font-semibold">{request.visitor.name}</p><p className="mt-1 text-xs text-muted-foreground">{request.expectedDate} · {request.expectedTime} · {request.flat.number}</p><div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={request.requestStatus} /><StatusBadge status={request.visitStatus} /></div></div></div><div className="flex shrink-0 items-center gap-2">{actions}</div></div>; }

export function EmptyState({ title, description, icon = <Clock3 /> }: { title: string; description: string; icon?: ReactNode }) { return <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"><div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</div><h3 className="mt-4 font-display font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p></div>; }

export function LoadingState({ label = "Loading visitor requests..." }: { label?: string }) { return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground" role="status"><div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />{label}</div>; }

export function ComingSoon({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-dashed border-brand-orange/40 bg-warning-soft p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-foreground">Coming soon</p><h3 className="mt-2 font-display text-lg font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>; }