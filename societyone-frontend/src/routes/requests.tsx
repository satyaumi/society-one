import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppShell,
  EmptyState,
  LoadingState,
  PageIntro,
  RequestRow,
  SectionHeading,
} from "@/components/societyone";
import { authService, visitorService } from "@/services";
import { requireAuth } from "@/lib/auth/require-auth";
import type { Role, User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/requests")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Visitor requests | SocietyOne" },
      { name: "description", content: "Review and act on visitor requests." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      visitorService.listRequests("RESIDENT"),
    ]).then(([currentUser, items]) => {
      if (mounted) {
        setUser(currentUser);
        setRequests(items);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const role: Role = user?.role ?? "RESIDENT";
  const sectionTitle =
    role === "SECURITY"
      ? "Visitors needing attention"
      : role === "VISITOR"
        ? "Your visit requests"
        : "Requests for your flat";

  return (
    <AppShell title="Visitor requests" eyebrow="Requests">
      <PageIntro
        eyebrow="Requests"
        title="Visitor requests"
        description={
          role === "VISITOR"
            ? "Track the status of your visit requests in one place."
            : "Every visit request that needs your attention, in one clear list."
        }
        action={
          <Button asChild className="bg-brand-blue">
            <Link to="/invite">
              <DoorOpen /> {role === "VISITOR" ? "Request a visit" : "Invite visitor"}
            </Link>
          </Button>
        }
      />
      <div className="mt-7">
        {loading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description={
              role === "VISITOR"
                ? "Request a visit and you'll see it here with its status."
                : "When a visitor or security creates a request, you'll see it here."
            }
          />
        ) : (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SectionHeading
              title={sectionTitle}
              action={
                <Link  to="/history"
                  className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
                >
                  View history <ArrowRight className="size-4" />
                </Link>
              }
            />
            <div>
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  actions={
                    role === "RESIDENT" &&
                    request.requestStatus === "PENDING_RESIDENT" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/30 text-destructive"
                        >
                          Deny
                        </Button>
                        <Button size="sm" className="bg-brand-blue">
                          <Check /> Approve
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}