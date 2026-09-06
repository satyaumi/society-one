import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, notificationService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Notification, User } from "@/types/domain";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Notifications | SocietyOne" },
      { name: "description", content: "Your activity notifications." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      notificationService.list("RESIDENT"),
    ]).then(([currentUser, list]) => {
      if (mounted) {
        setUser(currentUser);
        setItems(list);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function markRead(id: string) {
    await notificationService.markRead(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <AppShell title="Notifications" eyebrow="Alerts">
      <PageIntro
        eyebrow="Notifications"
        title="Activity for you"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread update${unreadCount === 1 ? "" : "s"}.`
            : "Requests, approvals, entries, and exits that touch your role."
        }
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              onClick={async () => {
                await notificationService.markAllRead();
                setItems((prev) => prev.map((item) => ({ ...item, read: true })));
              }}
            >
              <BellOff /> Mark all read
            </Button>
          ) : undefined
        }
      />
      <div className="mt-7">
        {loading ? (
          <LoadingState label="Loading notifications..." />
        ) : items.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="When there's activity that touches your role, it will appear here."
            icon={<Bell />}
          />
        ) : (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading title={`${items.length} notification${items.length === 1 ? "" : "s"}`} />
            <ol className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex gap-3">
                    <div className="mt-1 size-2 shrink-0 rounded-full">
                      <span
                        className={
                          "block size-2 rounded-full " +
                          (item.read ? "bg-secondary" : "bg-brand-orange")
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.timestamp}</p>
                    </div>
                  </div>
                  {!item.read && (
                    <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </AppShell>
  );
}