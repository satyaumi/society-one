import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
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
import type { User, VisitRequest } from "@/types/domain";

export const Route = createFileRoute("/security/online")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Online visitors | SocietyOne Security" },
      { name: "description", content: "Online visitor requests for security verification." },
    ],
  }),
  component: SecurityOnlinePage,
});

function SecurityOnlinePage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      visitorService.listRequests("SECURITY"),
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

  const onlineApproved = requests.filter((r) => r.requestStatus === "APPROVED_BY_RESIDENT");
  const pendingSecurity = requests.filter((r) => r.requestStatus === "PENDING_SECURITY");

  return (
    <AppShell title="Online visitors" eyebrow="Security">
      <PageIntro
        eyebrow="Security · Online"
        title="Online visitor requests"
        description="Visitors and residents who submitted a request online. Approved items are ready for gate verification; pending ones need your action first."
        action={
          <Button asChild variant="outline">
            <Link to="/security/at-security">
              <ClipboardCheck /> At security desk
            </Link>
          </Button>
        }
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading
            title={`Approved (${onlineApproved.length})`}
            action={
              <Link
                to="/security/at-security"
                className="flex items-center gap-1 text-sm font-semibold text-brand-blue"
              >
                Check in <ArrowRight className="size-4" />
              </Link>
            }
          />
          {loading ? (
            <LoadingState />
          ) : onlineApproved.length === 0 ? (
            <EmptyState
              title="No approved arrivals"
              description="Resident-approved requests will show up here when the expected time is near."
            />
          ) : (
            <div>
              {onlineApproved.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  actions={
                    <Button size="sm" className="bg-success text-primary-foreground">
                      <CheckCircle2 /> Check in
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <SectionHeading title={`Pending security (${pendingSecurity.length})`} />
          {loading ? (
            <LoadingState />
          ) : pendingSecurity.length === 0 ? (
            <EmptyState
              title="Nothing pending"
              description="Requests created by residents (without online approval) land here for a quick security review."
            />
          ) : (
            <div>
              {pendingSecurity.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  actions={
                    <>
                      <Button size="sm" variant="outline">Review</Button>
                      <Button size="sm" className="bg-brand-blue">Accept</Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}