import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileClock,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import societyOneLogo from "@/assets/societyone-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShareModal } from "@/components/share/ShareModal";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media-url";
import { useAuth } from "@/lib/auth/auth-store";
import { authService, notificationService, realtimeEvents } from "@/services";
import type { Notification, Role, User, VisitRequest } from "@/types/domain";

export type AppPath =
  | "/dashboard"
  | "/requests"
  | "/invite"
  | "/regular-visitors"
  | "/history"
  | "/notifications"
  | "/security/online"
  | "/security/at-security"
  | "/security/regular"
  | "/admin"
  | "/admin/announcements"
  | "/admin/residents"
  | "/admin/security-staff"
  | "/admin/society"
  | "/admin/visitors"
  | "/settings";

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
    { label: "Announcements", to: "/admin/announcements", icon: <Megaphone /> },
    { label: "Residents", to: "/admin/residents", icon: <Users /> },
    { label: "Security staff", to: "/admin/security-staff", icon: <ShieldCheck /> },
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
    void Promise.all([authService.getCurrentUser(), notificationService.list()]).then(([currentUser, items]) => {
      if (mounted) {
        setUser(currentUser);
        setNotifications(items);
      }
    });
    const unsubscribe = realtimeEvents.subscribe(() => {
      void notificationService.list().then((items) => {
        if (mounted) setNotifications(items);
      });
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
    await router.navigate({ to: "/login", search: { role: undefined } });
  }

  return (
    <div className="app-shell-grid bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh min-h-0 w-[248px] flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:h-full lg:max-h-dvh lg:min-h-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-5 sm:h-16 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-3" aria-label="SocietyOne dashboard">
            <img src={societyOneLogo} alt="SocietyOne" className="size-8 sm:size-9 rounded-lg object-cover" />
            <span className="font-display text-base sm:text-lg font-bold">
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
        <div className="shrink-0 border-b border-sidebar-border px-4 py-3 sm:px-5 sm:py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            SocietyOne workspace
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <Avatar className="size-9 shrink-0 border border-sidebar-border shadow-xs sm:size-10">
              <AvatarImage
                src={resolveMediaUrl(user?.avatar || user?.profilePhotoUrl)}
                alt={user?.name ?? "User"}
                className="size-full aspect-square object-cover object-center"
              />
              <AvatarFallback className="bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
                {user?.name?.slice(0, 1) ?? "S"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name ?? "Loading profile"}</p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabels[role]}</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav-scroll min-h-0 flex-1 space-y-1 px-3 py-3 overscroll-contain" aria-label="Workspace navigation">
          {navByRole[role].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="shrink-0 [&>svg]:size-4">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
          <div className="my-3 border-t border-sidebar-border" />
          <Link
            to="/notifications"
            onClick={() => setMobileOpen(false)}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Bell className="size-4 shrink-0" />
            <span className="truncate">Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="shrink-0 border-t border-sidebar-border bg-sidebar/95 p-2.5 backdrop-blur sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="size-4 shrink-0" /> <span className="truncate">Settings</span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-0.5 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 shrink-0" /> <span className="truncate">Sign out</span>
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShareModal
              triggerVariant="ghost"
              triggerSize="icon"
              triggerClassName="text-muted-foreground hover:text-foreground hover:bg-accent/60"
              title="Share SocietyOne"
              description="Share SocietyOne with residents, gate security, visitors, or friends."
            />
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-accent/60"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <Bell />
              {unreadCount > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-brand-orange" />}
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Link to="/settings" className="hidden items-center gap-2.5 text-right sm:flex hover:opacity-90 transition-opacity">
              <Avatar className="size-7 shrink-0 border border-border shadow-xs">
                <AvatarImage
                  src={resolveMediaUrl(user?.avatar || user?.profilePhotoUrl)}
                  alt={user?.name ?? "User"}
                  className="size-full aspect-square object-cover object-center"
                />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {user?.name?.slice(0, 1) ?? "U"}
                </AvatarFallback>
              </Avatar>
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

function NotificationPopover({
  notifications,
  onClose,
}: {
  notifications: Notification[];
  onClose: () => void;
}) {
  const unreadItems = notifications.filter((n) => !n.read);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleItemClick = async (item: Notification) => {
    if (!item.read) {
      try {
        await notificationService.markRead(item.id);
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    }
  };

  return (
    <div className="fixed right-4 top-[72px] z-40 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 sm:right-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-bold text-foreground">Notifications</h2>
          {unreadItems.length > 0 && (
            <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-bold text-brand-orange">
              {unreadItems.length} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-brand-blue"
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-full text-muted-foreground"
            aria-label="Close notifications"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 divide-y divide-border/60 max-h-[380px] overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 5).map((item) => (
            <div
              key={item.id}
              onClick={() => void handleItemClick(item)}
              className={cn(
                "group flex cursor-pointer items-start gap-3 py-3 px-1 transition-colors rounded-lg hover:bg-muted/50",
                !item.read && "bg-brand-blue/5 font-medium"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  !item.read ? "bg-brand-orange" : "bg-muted-foreground/30"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn("text-xs font-semibold truncate", !item.read ? "text-foreground" : "text-foreground/80")}>
                    {item.title}
                  </p>
                  {item.category === "ANNOUNCEMENT" && (
                    <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary">
                      Notice
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : ""}
                  </span>
                  {!item.read && (
                    <span className="text-brand-blue text-[10px]">Tap to mark read</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border/70">
        <Link
          to="/notifications"
          className="block text-center text-xs font-semibold text-brand-blue hover:underline py-1"
          onClick={onClose}
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="grid gap-5 border-b border-border pb-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-brand-orange">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>; }

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) { return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">{title}</h2>{action}</div>; }

export function StatGrid({ stats }: { stats: { label: string; value: string; helper: string; tone: "blue" | "orange" | "green" | "slate" }[] }) { const tones = { blue: "bg-info-soft text-brand-blue", orange: "bg-warning-soft text-accent-foreground", green: "bg-success-soft text-success", slate: "bg-secondary text-secondary-foreground" }; return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><p className="text-sm text-muted-foreground">{stat.label}</p><span className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold", tones[stat.tone])}><span aria-hidden="true">●</span></span></div><p className="mt-4 font-display text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p></div>)}</div>; }

export function StatusBadge({ status }: { status: VisitRequest["requestStatus"] | VisitRequest["visitStatus"] }) { const labels: Record<string, string> = { PENDING_RESIDENT: "Pending resident", APPROVED_BY_RESIDENT: "Resident approved", DENIED_BY_RESIDENT: "Resident denied", REJECTED_BY_RESIDENT: "Resident denied", PENDING_SECURITY: "Pending security", ACCEPTED_BY_SECURITY: "Entry accepted", DENIED_BY_SECURITY: "Entry denied", REJECTED_BY_SECURITY: "Entry denied", CANCELLED: "Cancelled", EXPIRED: "Expired", EXPECTED: "Expected", WAITING_AT_GATE: "Waiting at gate", CHECKED_IN: "Checked in", CHECKED_OUT: "Checked out", NO_SHOW: "No show" }; const positive = ["APPROVED_BY_RESIDENT", "ACCEPTED_BY_SECURITY", "CHECKED_IN", "CHECKED_OUT"].includes(status); const warning = ["PENDING_RESIDENT", "PENDING_SECURITY", "EXPECTED", "WAITING_AT_GATE"].includes(status); return <Badge variant={positive ? "default" : warning ? "secondary" : "destructive"} className={cn(positive && "bg-success text-primary-foreground", warning && "bg-warning-soft text-accent-foreground")}>{labels[status] ?? status}</Badge>; }

export function RequestRow({
  request,
  actions,
  onViewAuthorization,
}: {
  request: VisitRequest;
  actions?: ReactNode;
  onViewAuthorization?: (request: VisitRequest) => void;
}) {
  const photo = resolveMediaUrl(request.photoUrl || request.visitor.photoUrl);

  return (
    <div className="grid gap-4 border-b border-border py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-info-soft shadow-sm">
          {photo ? (
            <img
              src={photo}
              alt={request.visitor.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-display text-lg font-bold text-brand-blue">
              {request.visitor.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">{request.visitor.name}</p>
            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0 font-normal">
              {(request.visitorType || request.visitor.visitorType || "Guest").replace("_", " ").toLowerCase()}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.expectedDate} · {request.expectedTime}{request.flat?.number ? ` · Flat ${request.flat.number}` : (request.resident?.name ? ` · ${request.resident.name}` : "")}
            {request.buildingName && ` (${request.buildingName})`}
            {request.purpose && ` · ${request.purpose}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={request.requestStatus} />
            {request.requestStatus === "APPROVED_BY_RESIDENT" && onViewAuthorization && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onViewAuthorization(request)}
                className="h-5 text-[11px] px-2.5 rounded-full border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 flex items-center gap-1 font-medium shadow-xs"
              >
                <ShieldCheck className="size-3" />
                View Authorization
              </Button>
            )}
            <StatusBadge status={request.visitStatus} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

export function EmptyState({ title, description, icon = <Clock3 /> }: { title: string; description: string; icon?: ReactNode }) { return <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"><div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</div><h3 className="mt-4 font-display font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p></div>; }

export function LoadingState({ label = "Loading visitor requests..." }: { label?: string }) { return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground" role="status"><div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />{label}</div>; }

export function ComingSoon({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-dashed border-brand-orange/40 bg-warning-soft p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-foreground">Coming soon</p><h3 className="mt-2 font-display text-lg font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>; }