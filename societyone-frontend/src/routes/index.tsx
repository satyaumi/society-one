import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Compass,
  FileCheck2,
  FileSearch,
  Globe,
  Home,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MoreHorizontal,
  QrCode,
  Shield,
  ShieldAlert,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publicService, notificationService, type PublicSummary } from "@/services";
import type { Announcement } from "@/types/domain";
import {
  AnnouncementDetailsModal,
  getAnnouncementImage,
} from "@/components/notifications/AnnouncementDetailsModal";
import { ShareModal } from "@/components/share/ShareModal";
import { OnlineVisitTrackerModal } from "@/components/visitor/OnlineVisitTrackerModal";
import { WelcomeRolePrompt } from "@/components/landing/WelcomeRolePrompt";
import {
  ProtectedFeatureModal,
  type ProtectedFeatureRole,
} from "@/components/landing/ProtectedFeatureModal";
import { RestrictedManagementModal } from "@/components/landing/RestrictedManagementModal";
import { SocietyCreationTrackerModal } from "@/components/society/SocietyCreationTrackerModal";
import { authStore, useAuth } from "@/lib/auth/auth-store";
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
  const { user, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicAnnouncements, setPublicAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [currentPublicIndex, setCurrentPublicIndex] = useState(0);

  // Modals state
  const [protectedModal, setProtectedModal] = useState<{
    open: boolean;
    role: ProtectedFeatureRole;
    title?: string;
    description?: string;
  }>({ open: false, role: "RESIDENT" });
  const [mgmtModalOpen, setMgmtModalOpen] = useState(false);
  const [societyTrackerOpen, setSocietyTrackerOpen] = useState(false);

  const AUTOSLIDE_INTERVAL = 5000;

  // Auto-slide public events, then loop back to top pinned event (index 0) after interval
  useEffect(() => {
    if (publicAnnouncements.length <= 1 || selectedAnnouncement !== null) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentPublicIndex((prev) => (prev + 1) % publicAnnouncements.length);
    }, AUTOSLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [publicAnnouncements.length, currentPublicIndex, selectedAnnouncement]);

  const handleNextPublic = () => {
    if (publicAnnouncements.length <= 1) return;
    setCurrentPublicIndex((prev) => (prev + 1) % publicAnnouncements.length);
  };

  const handlePrevPublic = () => {
    if (publicAnnouncements.length <= 1) return;
    setCurrentPublicIndex((prev) => (prev - 1 + publicAnnouncements.length) % publicAnnouncements.length);
  };

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

    notificationService
      .listPublicAnnouncements()
      .then((data) => {
        if (mounted) setPublicAnnouncements(data);
      })
      .catch((err) => {
        console.error("Failed to load public announcements:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activitiesCount = summary?.todayActivitiesCount ?? summary?.todayVisitorsCount ?? 0;
  const societyName = summary?.societyName || summary?.primarySocietyName || "Residential Societies";

  // Card 1: ONLINE VISIT (dedicated advance registration workflow)
  function handleOnlineVisitClick() {
    void navigate({ to: "/online-visit" });
  }

  // Card 2: INSTANT VISIT (gate arrival workflow)
  function handleInstantVisitClick() {
    void navigate({ to: "/invite" });
  }

  // Card 3: AT SECURITY (preserves existing security auth)
  function handleSecurityClick() {
    const { isAuthenticated: authed, user: u } = authStore.getState();
    if (authed && u?.role === "SECURITY") {
      void navigate({ to: "/security/at-security" });
    } else if (authed) {
      setProtectedModal({
        open: true,
        role: "SECURITY",
        title: "Security Gate Access Required",
        description: "Your current account is not authorized as security staff. Please sign in with an authorized Security account."
      });
    } else {
      setProtectedModal({
        open: true,
        role: "SECURITY",
        title: "Security Gate Access Required",
        description: "This feature is for on-duty security staff. Please sign in with an authorized Security account to manage gate passes."
      });
    }
  }

  // Card 4: REGULAR PASSES (preserves existing resident & security pass workflows)
  function handleRegularPassesClick() {
    const { isAuthenticated: authed, user: u } = authStore.getState();
    if (authed && u?.role === "RESIDENT") {
      void navigate({ to: "/regular-visitors" });
    } else if (authed && u?.role === "SECURITY") {
      void navigate({ to: "/security/regular" });
    } else if (authed) {
      setProtectedModal({
        open: true,
        role: "RESIDENT",
        title: "Resident Pass Access Required",
        description: "Please sign in with a resident account to manage recurring domestic staff and delivery passes."
      });
    } else {
      setProtectedModal({
        open: true,
        role: "RESIDENT",
        title: "Resident Account Required",
        description: "Please register or sign in as a resident to create regular visitor and domestic helper passes."
      });
    }
  }

  function handleLogout() {
    authStore.clear();
    void navigate({ to: "/" });
  }

  function getDashboardLink() {
    if (!user) return "/dashboard";
    if (user.role === "PLATFORM_ADMIN") return "/platform";
    if (user.role === "SECURITY") return "/security/at-security";
    return "/dashboard";
  }

  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 rounded-xl transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
            aria-label="Go to SocietyOne home"
          >
            <img
              src={societyOneLogo}
              alt="SocietyOne"
              className="size-9 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-105 sm:size-9.5"
            />

            <span className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Society<span className="text-brand-orange">One</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex"
            aria-label="Main navigation"
          >
            <a
              href="#how-it-works"
              className="rounded-md transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              How it works
            </a>

            <a
              href="#features"
              className="rounded-md transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              Features
            </a>

            <a
              href="#about"
              className="rounded-md transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              About
            </a>
          </nav>

          {/* Desktop & Tablet Action Group */}
          <div className="hidden items-center gap-2.5 sm:flex">
            {/* Grouped Visits Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium text-muted-foreground hover:text-foreground gap-1.5 h-9"
                >
                  <Globe className="size-4 text-brand-blue" />
                  Visits
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border/80">
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Visitor Entry & Passes
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/online-visit" className="flex items-center gap-2.5 cursor-pointer py-2">
                    <div className="grid size-7 place-items-center rounded-md bg-brand-blue/10 text-brand-blue">
                      <Globe className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">Online Pre-Registration</p>
                      <p className="text-[10px] text-muted-foreground">Advance visitor schedule</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/invite" className="flex items-center gap-2.5 cursor-pointer py-2">
                    <div className="grid size-7 place-items-center rounded-md bg-brand-orange/10 text-brand-orange">
                      <Zap className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">Instant Gate Pass</p>
                      <p className="text-[10px] text-muted-foreground">Fast walk-in arrival</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <OnlineVisitTrackerModal
                    triggerVariant="ghost"
                    triggerSize="sm"
                    triggerClassName="w-full justify-start text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-2 gap-2"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary Action: Register Society */}
            {!isAuthenticated ? (
              <Button
                asChild
                variant="default"
                size="sm"
                className="bg-brand-blue hover:bg-brand-blue/90 text-white font-medium shadow-xs h-9 px-3.5"
              >
                <Link to="/register-society">
                  <Building2 className="mr-1.5 size-3.5" />
                  Register Society
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="default"
                size="sm"
                className="bg-brand-blue hover:bg-brand-blue/90 text-white font-medium shadow-xs h-9 px-3.5"
              >
                <Link to={getDashboardLink()}>
                  <LayoutDashboard className="mr-1.5 size-3.5" />
                  Dashboard
                </Link>
              </Button>
            )}

            {/* Sign In or Authenticated User Profile */}
            {!isAuthenticated ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border hover:bg-accent h-9 font-medium"
              >
                <Link to="/login" search={{ role: undefined }}>
                  Sign in
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9 font-medium border-border/80">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="max-w-[100px] truncate">{user?.name || user?.username}</span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg border-border/80">
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{user?.name || user?.username}</p>
                    <p className="text-[10px] font-medium text-brand-blue uppercase tracking-wider">{user?.role?.replace("_", " ")}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="flex items-center gap-2 cursor-pointer py-1.5">
                      <LayoutDashboard className="size-4 text-muted-foreground" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "RESIDENT" && (
                    <DropdownMenuItem asChild>
                      <Link to="/regular-visitors" className="flex items-center gap-2 cursor-pointer py-1.5">
                        <Users className="size-4 text-muted-foreground" />
                        <span>Regular Passes</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer py-1.5"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* More Menu (Share, Track Society, Restricted Management) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground"
                  aria-label="More options"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border/80">
                <DropdownMenuItem
                  onClick={() => setSocietyTrackerOpen(true)}
                  className="flex items-center gap-2.5 cursor-pointer py-2"
                >
                  <FileSearch className="size-4 text-brand-blue" />
                  <div>
                    <p className="font-semibold text-xs">Track Society Application</p>
                    <p className="text-[10px] text-muted-foreground">Check onboarding status</p>
                  </div>
                </DropdownMenuItem>
                <div className="p-1">
                  <ShareModal
                    triggerVariant="ghost"
                    triggerSize="sm"
                    triggerClassName="w-full justify-start text-xs font-semibold text-muted-foreground hover:text-foreground h-8 px-2 gap-2"
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setMgmtModalOpen(true)}
                  className="flex items-center gap-2.5 cursor-pointer py-2 text-slate-600 hover:text-slate-900"
                >
                  <Lock className="size-3.5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-xs text-amber-700">Platform Management</p>
                    <p className="text-[10px] text-muted-foreground">Restricted operational access</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <ShareModal
              triggerVariant="ghost"
              triggerSize="icon"
              triggerClassName="size-9 rounded-lg border border-border text-foreground"
            />

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="grid size-9 place-items-center rounded-lg border border-border text-foreground hover:bg-accent transition"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-background px-4 py-4 space-y-4 sm:hidden animate-in slide-in-from-top-2 duration-200 shadow-xl max-h-[85vh] overflow-y-auto">
            {/* Quick Links */}
            <div className="flex flex-col space-y-1 text-sm font-medium text-muted-foreground">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground flex items-center justify-between"
              >
                <span>How it works</span>
                <ChevronRight className="size-4 opacity-40" />
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground flex items-center justify-between"
              >
                <span>Features</span>
                <ChevronRight className="size-4 opacity-40" />
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground flex items-center justify-between"
              >
                <span>About</span>
                <ChevronRight className="size-4 opacity-40" />
              </a>
            </div>

            {/* Visitor Passes */}
            <div className="border-t border-border pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-1">
                Visitor Passes
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="h-10 justify-start text-xs font-medium">
                  <Link to="/online-visit" onClick={() => setMobileMenuOpen(false)}>
                    <Globe className="mr-1.5 size-3.5 text-brand-blue" />
                    Online Visit
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-10 justify-start text-xs font-medium">
                  <Link to="/invite" onClick={() => setMobileMenuOpen(false)}>
                    <Zap className="mr-1.5 size-3.5 text-brand-orange" />
                    Instant Pass
                  </Link>
                </Button>
              </div>
              <OnlineVisitTrackerModal
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="w-full justify-center text-xs h-9"
              />
            </div>

            {/* Society Onboarding */}
            <div className="border-t border-border pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-1">
                Society Onboarding
              </span>
              <Button asChild className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 justify-center h-10">
                <Link to="/register-society" onClick={() => setMobileMenuOpen(false)}>
                  <Building2 className="mr-2 size-4" />
                  Register Your Society
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSocietyTrackerOpen(true);
                }}
                className="w-full justify-center text-xs h-9"
              >
                <FileSearch className="mr-1.5 size-3.5 text-brand-blue" />
                Track Society Application
              </Button>
            </div>

            {/* Account & Authentication */}
            <div className="border-t border-border pt-3 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="rounded-lg bg-accent/60 p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{user?.name || user?.username}</p>
                      <p className="text-[10px] font-medium text-brand-blue uppercase">{user?.role?.replace("_", " ")}</p>
                    </div>
                    <Button asChild size="sm" className="bg-brand-blue text-white h-8 text-xs">
                      <Link to={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-rose-600 hover:bg-rose-50 justify-center text-xs h-9"
                  >
                    <LogOut className="mr-1.5 size-3.5" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline" className="w-full justify-center h-10 font-semibold">
                  <Link to="/login" search={{ role: undefined }} onClick={() => setMobileMenuOpen(false)}>
                    Sign in to Account
                    <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Subtle Management Entry */}
            <div className="border-t border-border pt-3 pb-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMgmtModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                <Lock className="size-3 text-amber-600" />
                Platform Management (Restricted)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Public Announcements Banner - Wide Hero Card Carousel */}
      {publicAnnouncements.length > 0 && (
        <aside
          aria-label="Public Society Events & Notices"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 mb-2"
        >
          {(() => {
            const currentPublic = publicAnnouncements[currentPublicIndex] || publicAnnouncements[0];
            const heroImage = getAnnouncementImage(currentPublic);

            return (
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:from-slate-900/90 dark:via-slate-900 dark:to-emerald-950/30">
                {/* Auto-slide Progress Indicator */}
                {publicAnnouncements.length > 1 && !selectedAnnouncement && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/10 dark:bg-emerald-400/10 overflow-hidden rounded-t-3xl">
                    <div
                      key={`pub-prog-${currentPublicIndex}-${publicAnnouncements.length}`}
                      className="h-full bg-emerald-500/50 dark:bg-emerald-400/60 animate-announcement-progress"
                    />
                  </div>
                )}

                <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/5" />

                {/* Top Bar with Counter */}
                <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                      <Sparkles className="size-3.5" />
                      Society Community Event
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Open for Public Visitors & Residents
                    </span>
                  </div>

                  {publicAnnouncements.length > 1 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {currentPublicIndex + 1} of {publicAnnouncements.length}
                    </span>
                  )}
                </div>

                <div
                  key={currentPublic.id}
                  className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center animate-in fade-in-50 duration-300"
                >
                  {/* Left content */}
                  <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-3">
                    <h2
                      onClick={() => setSelectedAnnouncement(currentPublic)}
                      className="cursor-pointer font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors leading-snug"
                    >
                      {currentPublic.title}
                    </h2>

                    {(currentPublic.eventDate || currentPublic.eventTime || currentPublic.purpose) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium text-foreground/80">
                        {currentPublic.eventDate && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-900 dark:text-emerald-300">
                            <Calendar className="size-3.5 text-emerald-600" />
                            <span>{currentPublic.eventDate}</span>
                          </div>
                        )}
                        {currentPublic.eventTime && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-1 text-amber-900 dark:text-amber-300">
                            <Clock className="size-3.5 text-amber-600" />
                            <span>{currentPublic.eventTime}</span>
                          </div>
                        )}
                        {currentPublic.purpose && (
                          <span className="text-xs text-muted-foreground">
                            • {currentPublic.purpose}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-sm sm:text-base leading-relaxed text-muted-foreground line-clamp-2">
                      {currentPublic.message}
                    </p>

                    {/* Bottom row: Explore Button + Navigation Carousel Controls */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                      <Button
                        onClick={() => setSelectedAnnouncement(currentPublic)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 shadow-sm transition-all hover:shadow-md inline-flex items-center gap-2 group"
                      >
                        <span>Explore Event Details</span>
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </Button>

                      {publicAnnouncements.length > 1 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 mr-2">
                            {publicAnnouncements.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentPublicIndex(idx)}
                                aria-label={`Jump to event ${idx + 1}`}
                                className={`size-2.5 rounded-full transition-all duration-300 ${
                                  idx === currentPublicIndex
                                    ? "w-6 bg-emerald-600"
                                    : "bg-emerald-300/60 hover:bg-emerald-400 dark:bg-emerald-800"
                                }`}
                              />
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-full border-border/80 text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={handlePrevPublic}
                            aria-label="Previous event"
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-full border-border/80 text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={handleNextPublic}
                            aria-label="Next event"
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right photo */}
                  <div className="md:col-span-5 lg:col-span-4">
                    <div
                      onClick={() => setSelectedAnnouncement(currentPublic)}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/20 bg-muted/40 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-emerald-500/40"
                    >
                      <img
                        src={heroImage}
                        alt={currentPublic.title}
                        className="h-48 sm:h-56 md:h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                        <span className="text-xs font-semibold text-white inline-flex items-center gap-1.5">
                          View details & location <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </aside>
      )}

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

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-xl bg-brand-blue px-6 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-blue/90 hover:shadow-lg active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <Link to="/online-visit">
                  <Globe className="mr-2 size-4" />
                  Online Visit (Pre-Register)
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                className="group h-12 rounded-xl bg-brand-orange px-6 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-orange/90 hover:shadow-lg active:translate-y-0 focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
              >
                <Link to="/invite">
                  <Zap className="mr-2 size-4" />
                  Instant Visit (Gate)
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="group h-12 rounded-xl px-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
              >
                <Link to="/auth">
                  Portal Sign In
                  <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>

              <ShareModal
                triggerVariant="secondary"
                triggerSize="lg"
                triggerClassName="h-12 rounded-xl px-5 border border-border/70 hover:border-brand-blue/40"
              />
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

        {/* Section: 4 Interactive Feature Cards */}
        <section
          id="features"
          className="scroll-mt-14 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue sm:text-sm">
              Tailored Access Points
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Four clear ways into the community.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Click any workflow below to launch the dedicated experience.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. ONLINE VISIT CARD */}
            <InteractiveCard
              icon={<Globe className="size-6 text-brand-blue" />}
              iconBg="bg-info-soft"
              tag="Public • Advance Entry"
              tagColor="blue"
              title="ONLINE VISIT"
              detail="Pre-register your upcoming visit in advance. Select the resident or society management member you wish to visit, optionally provide photo ID, and receive instant entry clearance."
              actionLabel="Register Online Visit"
              onClick={handleOnlineVisitClick}
            />

            {/* 2. INSTANT VISIT CARD */}
            <InteractiveCard
              icon={<Zap className="size-6 text-brand-orange" />}
              iconBg="bg-warning-soft"
              tag="Public • Instant Walk-in"
              tagColor="amber"
              title="INSTANT VISIT"
              detail="Quick on-the-spot visit request for immediate entry at the gate. Enter your details and flat number for direct resident push approval."
              actionLabel="Start Instant Visit"
              onClick={handleInstantVisitClick}
            />

            {/* 3. AT SECURITY CARD */}
            <InteractiveCard
              icon={<Users className="size-6 text-indigo-600" />}
              iconBg="bg-indigo-500/10"
              tag="Security Officers Desk"
              tagColor="blue"
              title="AT SECURITY"
              detail="Fast, focused gate desk workflows for walk-in arrivals, delivery agents, and service technicians with real-time arrival verification."
              actionLabel="Access Gate Desk"
              onClick={handleSecurityClick}
            />

            {/* 4. REGULAR PASSES CARD */}
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
          <ShareModal
            triggerVariant="ghost"
            triggerSize="sm"
            triggerClassName="text-xs text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent"
          >
            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              Share App
            </button>
          </ShareModal>

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

          {/* Subtle Restricted Platform Management Access in Footer */}
          <button
            type="button"
            onClick={() => setMgmtModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground/70 transition-colors duration-200 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            title="Platform Management Portal (Restricted)"
          >
            <ShieldAlert className="size-3 text-muted-foreground/60" />
            <span>Management</span>
          </button>
        </span>
      </footer>

      {/* Announcements Modal */}
      {selectedAnnouncement && (
        <AnnouncementDetailsModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}

      {/* 1. First-visit Role Welcome Prompt (Public visitors only) */}
      <WelcomeRolePrompt
        onRegisterSocietyClick={() => navigate({ to: "/register-society" })}
        onJoinResidentClick={() => navigate({ to: "/signup", search: { role: undefined } })}
      />

      {/* 2. Public User Protected Feature Explanatory Modal */}
      <ProtectedFeatureModal
        open={protectedModal.open}
        onClose={() => setProtectedModal((prev) => ({ ...prev, open: false }))}
        requiredRole={protectedModal.role}
        featureTitle={protectedModal.title}
        featureDescription={protectedModal.description}
      />

      {/* 3. Restricted Management Entry Confirmation Modal */}
      <RestrictedManagementModal
        open={mgmtModalOpen}
        onClose={() => setMgmtModalOpen(false)}
      />

      {/* 4. Society Creation Application Tracker Modal */}
      <SocietyCreationTrackerModal
        open={societyTrackerOpen}
        onClose={() => setSocietyTrackerOpen(false)}
      />
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