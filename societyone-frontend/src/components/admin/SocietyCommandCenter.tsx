import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DoorOpen,
  Eye,
  FileClock,
  Filter,
  Flame,
  Home,
  Layers,
  Loader2,
  Megaphone,
  Pin,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { dashboardService } from "@/services";
import type {
  BuildingOccupancySummary,
  FlatItemSummary,
  FloorOccupancySummary,
  SocietyCommandCenterResponse,
  VisitorCategoryCount,
} from "@/types/command-center";

interface SocietyCommandCenterProps {
  initialBuildingId?: number;
}

export function SocietyCommandCenter({ initialBuildingId }: SocietyCommandCenterProps) {
  const navigate = useNavigate();

  // State
  const [data, setData] = useState<SocietyCommandCenterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | undefined>(initialBuildingId);
  const [timeRange, setTimeRange] = useState<"TODAY" | "WEEK" | "MONTH">("WEEK");
  const [occupancyFilter, setOccupancyFilter] = useState<"ALL" | "OCCUPIED" | "AVAILABLE">("ALL");

  // Flat inspector modal/sheet state
  const [inspectingFlat, setInspectingFlat] = useState<{
    flat: FlatItemSummary;
    buildingName: string;
    floorNumber: number;
  } | null>(null);

  // Collapsed floors state (floorId -> boolean)
  const [collapsedFloors, setCollapsedFloors] = useState<Record<number, boolean>>({});

  // Fetch command center data
  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await dashboardService.getSocietyCommandCenter({
        buildingId: selectedBuildingId,
        timeRange,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load society command center data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [selectedBuildingId, timeRange]);

  const toggleFloor = (floorId: number) => {
    setCollapsedFloors((prev) => ({
      ...prev,
      [floorId]: !prev[floorId],
    }));
  };

  // Filtered flats according to occupancyFilter
  const filteredOccupancy = useMemo(() => {
    if (!data?.occupancy) return [];
    if (occupancyFilter === "ALL") return data.occupancy;

    return data.occupancy.map((b) => ({
      ...b,
      floors: b.floors.map((f) => ({
        ...f,
        flats: f.flats.filter((flat) =>
          occupancyFilter === "OCCUPIED" ? flat.isOccupied : !flat.isOccupied,
        ),
      })),
    }));
  }, [data?.occupancy, occupancyFilter]);

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-32 rounded-2xl bg-muted/60" />
        {/* KPI Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/60" />
          ))}
        </div>
        {/* Action Skeleton */}
        <div className="h-24 rounded-xl bg-muted/40" />
        {/* Split Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-muted/50" />
          <div className="h-96 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <AlertCircle className="mx-auto size-10 text-destructive mb-3" />
        <h3 className="font-display text-lg font-bold text-destructive">Failed to Load Command Center</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={() => void loadData()}
          className="mt-4 bg-destructive hover:bg-destructive/90 text-white"
        >
          <RefreshCw className="mr-2 size-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { society, kpis, actionRequired, visitorAnalytics, residentAnalytics, securityGate, upcomingAnnouncements, recentActivity } = data;

  if (society.id === 0 || society.name === "No Society Provisioned Yet") {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center shadow-sm max-w-2xl mx-auto space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
          <Building2 className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Society Onboarding Pending
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your society registration request is currently under review by the Platform Management Boss.
          Once reviewed and approved, your society structure, towers, and apartment management portal will be automatically handed over to your account.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => void loadData(true)}
            variant="outline"
            className="h-10 px-4"
          >
            <RefreshCw className="mr-2 size-4" /> Check Status
          </Button>
          <Link to="/register-society">
            <Button className="h-10 px-4 bg-brand-blue hover:bg-brand-blue/90 text-white">
              Track Society Application
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. SOCIETY COMMAND CENTER HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-blue/20 bg-gradient-to-br from-card via-card to-brand-blue/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-bold text-brand-blue uppercase tracking-wider">
                <Sparkles className="size-3.5" /> Society Command Center
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                {society.totalBuildings} Buildings · {society.totalFloors} Floors
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {society.name}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {society.address}, {society.city}, {society.state} {society.postalCode}
            </p>
          </div>

          {/* Controls: Building Filter, Time Range, Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Building Filter */}
            <div className="relative">
              <select
                value={selectedBuildingId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBuildingId(val ? Number(val) : undefined);
                }}
                className="h-9 rounded-xl border border-input bg-background/90 px-3 pr-8 text-xs font-semibold text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">All Buildings</option>
                {data.occupancy.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>
                    {b.buildingName} ({b.totalFlats} flats)
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range Selector */}
            <div className="inline-flex rounded-xl border border-input bg-background/80 p-0.5 shadow-sm">
              {(["TODAY", "WEEK", "MONTH"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                    timeRange === r
                      ? "bg-brand-blue text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r === "TODAY" ? "Today" : r === "WEEK" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="h-9 rounded-xl border-input bg-background/90 shadow-sm hover:bg-accent"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", refreshing && "animate-spin text-brand-blue")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI SUMMARY ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Flats */}
        <div
          onClick={() => {
            const el = document.getElementById("society-occupancy-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-brand-blue/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Flats</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {kpis.totalFlats}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Across {society.totalBuildings} Buildings</span>
            <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-blue" />
          </div>
        </div>

        {/* Occupied Flats */}
        <div
          onClick={() => {
            setOccupancyFilter("OCCUPIED");
            const el = document.getElementById("society-occupancy-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Occupied</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20">
              <Home className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 font-display text-2xl sm:text-3xl font-bold text-foreground">
            {kpis.occupiedFlats}
            <span className="text-xs font-normal text-muted-foreground">/ {kpis.totalFlats}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.occupancyPercentage}% Occupied
            </span>
            <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
          </div>
        </div>

        {/* Available Flats */}
        <div
          onClick={() => {
            setOccupancyFilter("AVAILABLE");
            const el = document.getElementById("society-occupancy-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-cyan-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20">
              <DoorOpen className="size-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {kpis.availableFlats}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">Ready for allocation</span>
            <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500" />
          </div>
        </div>

        {/* Total Residents */}
        <div
          onClick={() => void navigate({ to: "/admin/residents" })}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-purple-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Residents</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20">
              <Users className="size-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {kpis.totalResidents}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{kpis.ownerCount} Owners · {kpis.tenantCount} Tenants</span>
            <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
          </div>
        </div>

        {/* Today's Visitors */}
        <div
          onClick={() => void navigate({ to: "/admin/visitors" })}
          className="group cursor-pointer col-span-2 sm:col-span-1 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Visitors</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20">
              <ClipboardCheck className="size-4" />
            </div>
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {kpis.todayVisitors}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{kpis.currentlyInside} inside · {kpis.waitingAtGate} waiting</span>
            <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
          </div>
        </div>
      </div>

      {/* 3. ACTION REQUIRED SECTION (CRITICAL) */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/15 text-red-600 dark:text-red-400">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Action Required</h2>
              <p className="text-xs text-muted-foreground">Items requiring immediate administrative review or clearance</p>
            </div>
          </div>
          {actionRequired.length > 0 && (
            <Badge variant="destructive" className="font-mono text-xs px-2.5 py-0.5">
              {actionRequired.reduce((acc, item) => acc + item.count, 0)} Pending
            </Badge>
          )}
        </div>

        {actionRequired.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <div className="text-xs font-medium">
              You're all caught up! There are no pending resident onboarding requests, waiting visitors, or urgent approvals.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {actionRequired.map((action) => {
              const isCritical = action.severity === "CRITICAL";
              const isWarning = action.severity === "WARNING";
              return (
                <div
                  key={action.id}
                  onClick={() => void navigate({ to: action.actionUrl as any })}
                  className={cn(
                    "group flex flex-col justify-between rounded-2xl border p-4.5 cursor-pointer transition-all hover:shadow-md",
                    isCritical
                      ? "border-red-500/30 bg-red-500/5 hover:border-red-500"
                      : isWarning
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500"
                        : "border-blue-500/30 bg-blue-500/5 hover:border-blue-500",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isCritical
                            ? "bg-red-500/15 text-red-700 dark:text-red-300"
                            : isWarning
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                        )}
                      >
                        {action.count} {action.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        Count: {action.count}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-brand-blue transition-colors">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs font-semibold text-brand-blue flex items-center gap-1 group-hover:underline">
                      {action.actionLabel}
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. SOCIETY OCCUPANCY / FLAT OVERVIEW (INTERACTIVE HIERARCHY) */}
      <section id="society-occupancy-section" className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Society Occupancy & Flat Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Interactive real-time map of buildings, floors, and resident allocations
              </p>
            </div>
          </div>

          {/* Occupancy Filter Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Filter:
            </span>
            {(["ALL", "OCCUPIED", "AVAILABLE"] as const).map((filterType) => (
              <Button
                key={filterType}
                variant={occupancyFilter === filterType ? "default" : "outline"}
                size="sm"
                onClick={() => setOccupancyFilter(filterType)}
                className={cn(
                  "h-7 rounded-lg text-xs font-semibold px-2.5",
                  occupancyFilter === filterType && "bg-brand-blue hover:bg-brand-blue/90",
                )}
              >
                {filterType === "ALL"
                  ? `All Flats (${kpis.totalFlats})`
                  : filterType === "OCCUPIED"
                    ? `Occupied (${kpis.occupiedFlats})`
                    : `Available (${kpis.availableFlats})`}
              </Button>
            ))}
          </div>
        </div>

        {filteredOccupancy.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No flats match the selected filter.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOccupancy.map((b) => (
              <div
                key={b.buildingId}
                className="rounded-2xl border border-border/80 bg-background/50 p-5 shadow-xs"
              >
                {/* Building Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-secondary font-bold text-foreground">
                      {b.buildingName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          {b.buildingName}
                        </h3>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {b.totalFlats} Total Flats
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.occupiedFlats} Occupied · {b.availableFlats} Available · {b.floors.length} Floors
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full sm:w-56 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="text-foreground">{b.occupancyPercentage}%</span>
                    </div>
                    <Progress value={b.occupancyPercentage} className="h-2" />
                  </div>
                </div>

                {/* Floors Breakdown */}
                <div className="mt-4 space-y-3">
                  {b.floors.map((fl) => {
                    const isCollapsed = collapsedFloors[fl.floorId];
                    return (
                      <div
                        key={fl.floorId}
                        className="rounded-xl border border-border/60 bg-card/60 p-3.5"
                      >
                        <div
                          onClick={() => toggleFloor(fl.floorId)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            {isCollapsed ? (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                            <span>Floor {fl.floorNumber}</span>
                            <span className="text-muted-foreground font-normal">
                              ({fl.occupiedFlats}/{fl.totalFlats} occupied)
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {fl.flats.length} flats shown
                          </span>
                        </div>

                        {/* Flat Badges Grid */}
                        {!isCollapsed && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {fl.flats.map((flat) => (
                              <button
                                key={flat.flatId}
                                onClick={() =>
                                  setInspectingFlat({
                                    flat,
                                    buildingName: b.buildingName,
                                    floorNumber: fl.floorNumber,
                                  })
                                }
                                className={cn(
                                  "group relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all hover:scale-105 hover:shadow-xs",
                                  flat.isOccupied
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 hover:border-emerald-500"
                                    : "border-dashed border-border bg-secondary/40 text-muted-foreground hover:border-primary hover:text-foreground",
                                )}
                              >
                                <span className="font-mono text-xs font-bold">
                                  {flat.flatNumber}
                                </span>
                                <span
                                  className={cn(
                                    "mt-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                    flat.isOccupied
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {flat.isOccupied ? "Occupied" : "Available"}
                                </span>
                                {flat.occupiedBy && (
                                  <span className="mt-1 text-[10px] text-foreground font-medium truncate max-w-full">
                                    {flat.occupiedBy.split(" ")[0]}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. VISITOR ANALYTICS & RECENT VISITOR ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitor 7-Day Trend Chart */}
        <section className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">7-Day Visitor Trend</h2>
                <p className="text-xs text-muted-foreground">Daily incoming visits, check-ins, and clearances</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-brand-blue">
              <Link to="/admin/visitors">
                View All Activity <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {/* CSS/SVG Bar Chart */}
          <div className="h-52 w-full pt-4 flex items-end justify-between gap-2 sm:gap-4 px-2">
            {visitorAnalytics.trend7Days.map((day) => {
              // Scale heights relative to max
              const maxVisits = Math.max(
                1,
                ...visitorAnalytics.trend7Days.map((d) => d.totalVisits),
              );
              const heightPercent = Math.max(8, Math.round((day.totalVisits / maxVisits) * 100));

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* Tooltip Count */}
                  <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-foreground">
                    {day.totalVisits}
                  </span>
                  {/* Bar Container */}
                  <div className="w-full max-w-[36px] bg-secondary/50 rounded-t-lg h-36 flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full rounded-t-md transition-all group-hover:brightness-110",
                        day.totalVisits > 0 ? "bg-brand-blue" : "bg-muted",
                      )}
                    />
                  </div>
                  {/* Day Label */}
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-foreground block">
                      {day.dayLabel}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {day.date.substring(5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand-blue" /> Incoming Visitor Requests
            </span>
            <span className="font-mono">Total in Period: {visitorAnalytics.totalVisitsInPeriod}</span>
          </div>
        </section>

        {/* Visitor Category Breakdown */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Users className="size-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">Visitor Categories</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {timeRange}
            </span>
          </div>

          <div className="space-y-3.5 mt-2">
            {visitorAnalytics.categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{cat.count}</span>
                    <span className="text-muted-foreground text-[10px] w-10 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(cat.count > 0 ? 5 : 0, cat.percentage))}%` }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      cat.category === "GUEST"
                        ? "bg-blue-500"
                        : cat.category === "DELIVERY"
                          ? "bg-amber-500"
                          : cat.category === "DOMESTIC_WORKER"
                            ? "bg-emerald-500"
                            : cat.category === "TECHNICIAN"
                              ? "bg-indigo-500"
                              : "bg-purple-500",
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-border">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
              <Link to="/admin/visitors">
                View All Categories in Visitor Log <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* 6. RESIDENT OVERVIEW & RECENT RESIDENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resident Community Metrics */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="size-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">Resident Community</h2>
            </div>

            {/* Owner vs Tenant Distribution Bar */}
            <div className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-3">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>Tenure Distribution</span>
                <span className="font-mono">{residentAnalytics.totalResidents} Active Residents</span>
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${
                      residentAnalytics.totalResidents > 0
                        ? (residentAnalytics.ownerCount / residentAnalytics.totalResidents) * 100
                        : 50
                    }%`,
                  }}
                  className="bg-emerald-500 h-full"
                />
                <div
                  style={{
                    width: `${
                      residentAnalytics.totalResidents > 0
                        ? (residentAnalytics.tenantCount / residentAnalytics.totalResidents) * 100
                        : 50
                    }%`,
                  }}
                  className="bg-blue-500 h-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Owners: <strong>{residentAnalytics.ownerCount}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Tenants: <strong>{residentAnalytics.tenantCount}</strong>
                </span>
              </div>
            </div>

            {/* Family Members Count Card */}
            <div className="mt-3 rounded-2xl border border-border/80 bg-background/60 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Family Members
                </span>
                <div className="font-display text-2xl font-bold text-foreground mt-0.5">
                  {residentAnalytics.familyMemberCount}
                </div>
                <p className="text-[11px] text-muted-foreground">Registered across allocated units</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Users className="size-5" />
              </div>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="mt-4 w-full text-xs font-semibold">
            <Link to="/admin/residents">
              Manage Residents <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </section>

        {/* Recently Allocated Residents Table */}
        <section className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-blue">
                <Building className="size-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">Recently Allocated Residents</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-brand-blue">
              <Link to="/admin/residents">
                View All <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {residentAnalytics.recentResidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No recent resident allocations recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-semibold">Resident</th>
                    <th className="pb-2.5 font-semibold">Flat & Building</th>
                    <th className="pb-2.5 font-semibold">Role</th>
                    <th className="pb-2.5 font-semibold">Parking Slot</th>
                    <th className="pb-2.5 font-semibold text-right">Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {residentAnalytics.recentResidents.map((r) => (
                    <tr key={r.residentId} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 font-semibold text-foreground">
                        {r.residentName}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        Flat <span className="font-mono font-bold text-foreground">{r.flatNumber}</span> ({r.buildingName})
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            r.residentType === "OWNER"
                              ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                              : "border-blue-500/30 text-blue-600 bg-blue-500/10",
                          )}
                        >
                          {r.residentType}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-mono text-muted-foreground">
                        {r.parkingSlot || "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono text-muted-foreground">
                        {new Date(r.allocatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 7. SECURITY & GATE OPERATIONS */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <Shield className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Gate & Security Operations</h2>
              <p className="text-xs text-muted-foreground">Live security desk metrics, active guards, and gate activity stream</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
            <Link to="/admin/security-staff">
              <ShieldCheck className="size-3.5 mr-1 text-emerald-500" /> Manage Security Staff
            </Link>
          </Button>
        </div>

        {/* Security Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              Waiting at Gate
            </div>
            <div className="font-display text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">
              {securityGate.waitingAtGate}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Approved Waiting
            </div>
            <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {securityGate.approvedWaiting}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Currently Inside
            </div>
            <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {securityGate.currentlyInside}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Checked Out Today
            </div>
            <div className="font-display text-2xl font-bold text-foreground mt-0.5">
              {securityGate.checkedOutToday}
            </div>
          </div>
        </div>

        {/* Guards & Gate Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-border">
          {/* Active Security Staff */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Active Security Guards ({securityGate.activeGuards.length})
            </h3>
            {securityGate.activeGuards.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active security staff registered.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {securityGate.activeGuards.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-background/70 p-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{g.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        @{g.username} · {g.mobileNumber || "No mobile"}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      ON DUTY
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Gate Activity Stream */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Clock className="size-3.5 text-brand-blue" /> Recent Gate Stream
            </h3>
            {securityGate.recentGateActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent gate activity.</p>
            ) : (
              <div className="space-y-2">
                {securityGate.recentGateActivity.slice(0, 4).map((item, idx) => (
                  <div
                    key={`${item.requestId}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          item.eventType === "WAITING"
                            ? "bg-red-500"
                            : item.eventType === "CHECKED_IN"
                              ? "bg-emerald-500"
                              : "bg-slate-400",
                        )}
                      />
                      <span className="font-semibold text-foreground">{item.visitorName}</span>
                      <span className="text-muted-foreground">
                        → Flat {item.flatNumber} ({item.buildingName})
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. UPCOMING ANNOUNCEMENTS & RECENT ACTIVITY (SPLIT ROW) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Society Announcements & Events */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange">
                <Megaphone className="size-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">Announcements & Notices</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-brand-blue">
              <Link to="/admin/announcements">
                View All <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {upcomingAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No active announcements for this society.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAnnouncements.slice(0, 4).map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-1.5 hover:border-brand-blue/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {notice.pinned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                          <Pin className="size-2.5" /> Pinned
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {notice.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{notice.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity Feed (Audit Trail) */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <FileClock className="size-4" />
              </div>
              <h2 className="font-display text-base font-bold text-foreground">Recent Activity</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-brand-blue">
              <Link to="/history">
                Audit History <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No recent activity recorded in the audit log.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground capitalize">{log.actionLabel}</span>
                      <Badge variant="secondary" className="text-[9px] font-mono">
                        {log.entityType}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {log.details || `Performed by ${log.actorName}`}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 9. FLAT INSPECTOR MODAL */}
      {inspectingFlat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue font-bold font-mono">
                  {inspectingFlat.flat.flatNumber}
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Flat {inspectingFlat.flat.flatNumber} Details
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {inspectingFlat.buildingName} · Floor {inspectingFlat.floorNumber}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectingFlat(null)}
                className="size-8 p-0 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Occupancy Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold uppercase text-[10px]",
                    inspectingFlat.flat.isOccupied
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {inspectingFlat.flat.isOccupied ? "Occupied" : "Available"}
                </Badge>
              </div>

              {inspectingFlat.flat.isOccupied ? (
                <>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Primary Resident</span>
                    <span className="font-semibold text-foreground">
                      {inspectingFlat.flat.occupiedBy || "Allocated Resident"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Resident Tenure</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {inspectingFlat.flat.residentType || "RESIDENT"}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-center text-muted-foreground">
                  This flat is currently vacant and available for allocation.
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Flat Unit Type</span>
                <span className="font-mono text-foreground font-semibold">
                  {inspectingFlat.flat.flatType || "Standard Unit"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground font-medium">Assigned Parking</span>
                <span className="font-mono text-foreground font-semibold">
                  {inspectingFlat.flat.parkingSlot || "Not Assigned"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setInspectingFlat(null)}
              >
                Close
              </Button>
              {inspectingFlat.flat.isOccupied ? (
                <Button
                  className="flex-1 bg-brand-blue hover:bg-brand-blue/90"
                  onClick={() => {
                    setInspectingFlat(null);
                    void navigate({ to: "/admin/residents" });
                  }}
                >
                  View Resident
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-brand-blue hover:bg-brand-blue/90"
                  onClick={() => {
                    setInspectingFlat(null);
                    void navigate({ to: "/admin/residents" });
                  }}
                >
                  Allocate Resident
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
