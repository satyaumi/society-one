import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Megaphone,
  Pin,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, notificationService, realtimeEvents } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Notification, User, Announcement } from "@/types/domain";
import {
  AnnouncementDetailsModal,
  getAnnouncementMeta,
  getAudienceLabel,
} from "@/components/notifications/AnnouncementDetailsModal";
import { AnnouncementStrip } from "@/components/notifications/AnnouncementStrip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Notifications | SocietyOne" },
      { name: "description", content: "Society announcements and activity notifications." },
    ],
  }),
  component: NotificationsPage,
});

type FilterTab = "ALL" | "UNREAD" | "ANNOUNCEMENTS" | "WORKFLOW";

function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const loadNotifications = async () => {
    try {
      const [currentUser, list] = await Promise.all([
        authService.getCurrentUser(),
        notificationService.list(),
      ]);
      setUser(currentUser);
      setItems(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();

    const unsubscribe = realtimeEvents.subscribe((event) => {
      if (
        event.type === "announcement:changed" ||
        event.type === "notification:read" ||
        event.type === "notification:all-read"
      ) {
        void loadNotifications();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function markRead(id: string) {
    try {
      await notificationService.markRead(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function markAllRead() {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case "UNREAD":
        return items.filter((item) => !item.read);
      case "ANNOUNCEMENTS":
        return items.filter((item) => item.category === "ANNOUNCEMENT");
      case "WORKFLOW":
        return items.filter((item) => item.category !== "ANNOUNCEMENT");
      case "ALL":
      default:
        return items;
    }
  }, [items, activeTab]);

  const handleOpenDetails = (item: Notification) => {
    // If it's an announcement, build an Announcement-compatible object for the modal
    if (item.category === "ANNOUNCEMENT") {
      const parsedId = Number(item.id.replace("ann_", "")) || 0;
      setSelectedAnnouncement({
        id: parsedId,
        title: item.title,
        message: item.description,
        type: (item.type as any) || "GENERAL_NOTICE",
        audience: (item.audience as any) || "ALL_MEMBERS",
        eventDate: item.eventDate,
        eventTime: item.eventTime,
        purpose: item.purpose,
        active: true,
        pinned: item.pinned ?? false,
        read: item.read,
        createdAt: item.timestamp,
      });
    }
    // Also mark as read when opened
    if (!item.read) {
      void markRead(item.id);
    }
  };

  return (
    <AppShell title="Notifications & Announcements" eyebrow="Society Communication">
      <AnnouncementStrip />
      <PageIntro
        eyebrow="Notification Center"
        title="Updates & Notices"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread update${unreadCount === 1 ? "" : "s"} waiting for your attention.`
            : "All announcements, notices, and activity updates relevant to your role."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
                <CheckCheck className="size-4 mr-1.5" /> Mark all read
              </Button>
            )}
            {user?.role === "ADMIN" && (
              <Button asChild size="sm" className="bg-brand-blue hover:bg-brand-blue/90">
                <Link to="/admin/announcements">
                  <Megaphone className="size-4 mr-1.5" /> Manage Announcements
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={activeTab === "ALL" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold rounded-full"
            onClick={() => setActiveTab("ALL")}
          >
            All
            <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.2 text-[10px]">
              {items.length}
            </span>
          </Button>

          <Button
            variant={activeTab === "UNREAD" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold rounded-full"
            onClick={() => setActiveTab("UNREAD")}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-orange text-white px-1.5 py-0.2 text-[10px]">
                {unreadCount}
              </span>
            )}
          </Button>

          <Button
            variant={activeTab === "ANNOUNCEMENTS" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold rounded-full"
            onClick={() => setActiveTab("ANNOUNCEMENTS")}
          >
            Announcements & Notices
            <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.2 text-[10px]">
              {items.filter((i) => i.category === "ANNOUNCEMENT").length}
            </span>
          </Button>

          <Button
            variant={activeTab === "WORKFLOW" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold rounded-full"
            onClick={() => setActiveTab("WORKFLOW")}
          >
            Activity & Visitors
            <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.2 text-[10px]">
              {items.filter((i) => i.category !== "ANNOUNCEMENT").length}
            </span>
          </Button>
        </div>
      </div>

      {/* Main List */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading notifications..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={
              activeTab === "UNREAD"
                ? "You are all caught up!"
                : activeTab === "ANNOUNCEMENTS"
                ? "No announcements found"
                : "No notifications"
            }
            description={
              activeTab === "UNREAD"
                ? "No unread notifications at the moment."
                : "Activity and notices matching this category will appear here."
            }
            icon={activeTab === "UNREAD" ? <Check className="size-6 text-success" /> : <Bell className="size-6" />}
          />
        ) : (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <SectionHeading
              title={`${filteredItems.length} notification${filteredItems.length === 1 ? "" : "s"}`}
            />
            <ol className="divide-y divide-border/60">
              {filteredItems.map((item) => {
                const isAnnouncement = item.category === "ANNOUNCEMENT";
                const meta = isAnnouncement
                  ? getAnnouncementMeta(item.type)
                  : {
                      label: item.type,
                      icon: <Bell className="size-4 text-brand-blue" />,
                      color: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
                    };

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-2.5 rounded-xl transition-colors",
                      !item.read ? "bg-muted/40 font-medium" : "hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Read/Unread dot indicator */}
                      <span
                        className={cn(
                          "mt-1.5 size-2.5 shrink-0 rounded-full",
                          !item.read ? "bg-brand-orange ring-4 ring-brand-orange/20" : "bg-muted-foreground/30"
                        )}
                        aria-hidden="true"
                      />

                      <div className="min-w-0 flex-1">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              meta.color
                            )}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>

                          {item.pinned && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue">
                              <Pin className="size-2.5" /> Pinned
                            </span>
                          )}

                          {item.audience && (
                            <span className="text-[10px] text-muted-foreground">
                              • {getAudienceLabel(item.audience)}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3
                          className={cn(
                            "text-sm font-bold tracking-tight text-foreground transition-colors",
                            isAnnouncement && "cursor-pointer hover:text-brand-blue"
                          )}
                          onClick={() => isAnnouncement && handleOpenDetails(item)}
                        >
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                          {item.description}
                        </p>

                        {/* Event Date/Time if present */}
                        {(item.eventDate || item.eventTime) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-foreground/80">
                            {item.eventDate && (
                              <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded">
                                <Calendar className="size-3 text-brand-blue" />
                                {item.eventDate}
                              </span>
                            )}
                            {item.eventTime && (
                              <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded">
                                <Clock className="size-3 text-brand-orange" />
                                {item.eventTime}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isAnnouncement && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-brand-blue hover:text-brand-blue hover:bg-brand-blue/10"
                          onClick={() => handleOpenDetails(item)}
                        >
                          Details
                        </Button>
                      )}

                      {!item.read && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium"
                          onClick={() => void markRead(item.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
        <AnnouncementDetailsModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </AppShell>
  );
}