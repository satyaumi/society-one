import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AppShell,
  ComingSoon,
  EmptyState,
  PageIntro,
  SectionHeading,
} from "@/components/societyone";
import { authService, societyService, visitorService } from "@/services";
import type {
  CreateVisitRequestInput,
  Flat,
  Resident,
  Role,
  Society,
  User,
  Visitor,
  VisitorType,
} from "@/types/domain";
import { requireAuth } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/invite")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Invite a visitor | SocietyOne" },
      { name: "description", content: "Create a new visitor request." },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      authService.getCurrentUser(),
      societyService.getSociety(),
    ]).then(([currentUser, soc]) => {
      if (mounted) {
        setUser(currentUser);
        setSociety(soc);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const role: Role = user?.role ?? "RESIDENT";
  const flat = society?.buildings[0]?.floors[0]?.flats[0];
  const resident: Resident | undefined =
    user && flat ? ({ ...user, role: "RESIDENT", flatId: flat.id } as Resident) : undefined;

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("GUEST");
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !society || !flat || !resident) return;
    setSaving(true);
    try {
      const visitor: Visitor = {
        id: `visitor-${Date.now()}`,
        name,
        email: "",
        mobile,
        role: "VISITOR",
        visitorType,
      };
      const input: CreateVisitRequestInput = {
        visitor,
        resident,
        society,
        flat: flat as Flat,
        source: role === "VISITOR" ? "VISITOR" : role === "SECURITY" ? "SECURITY" : "RESIDENT",
        visitorType,
        expectedDate: expectedDate || "Today",
        expectedTime: expectedTime || "As arranged",
        purpose: purpose || undefined,
      };
      await visitorService.createRequest(input);
      await navigate({ to: "/requests" });
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = role === "VISITOR" ? "Request a visit" : "Invite a visitor";

  return (
    <AppShell title={pageTitle} eyebrow="Invite">
      <PageIntro
        eyebrow="Invite"
        title={pageTitle}
        description={
          role === "VISITOR"
            ? "Share a few details so the resident and security team know you're coming."
            : "Add a visitor ahead of time so security and the gate team are ready."
        }
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <SectionHeading title="Visitor details" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "VISITOR" ? "Your full name" : "Visitor full name"}
                required
                className="mt-2"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="type">Visitor type</Label>
              <select
                id="type"
                value={visitorType}
                onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              >
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="COURIER">Courier</option>
                <option value="CAB_AUTO">Cab / Auto</option>
                <option value="DRIVER">Driver</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="VENDOR_CONTRACTOR">Vendor / Contractor</option>
                <option value="DOMESTIC_WORKER">Domestic worker</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="purpose">Purpose (optional)</Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Meeting, delivery, etc."
                className="mt-2"
              />
            </div>
          </div>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="date">
                <CalendarDays className="mr-2 inline size-4" /> Expected date
              </Label>
              <Input
                id="date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="time">
                <Clock3 className="mr-2 inline size-4" /> Expected time
              </Label>
              <Input
                id="time"
                type="time"
                value={expectedTime}
                onChange={(e) => setExpectedTime(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <Button type="submit" className="bg-brand-blue" disabled={saving}>
              <UserPlus /> {saving ? "Creating..." : pageTitle}
            </Button>
          </div>
        </form>
        <div className="space-y-5">
          {role === "VISITOR" ? (
            <EmptyState
              title="What happens next?"
              description="Once submitted, the resident is asked to approve. You'll see the status update in requests."
            />
          ) : (
            <ComingSoon
              title="Invite repeats"
              description="A future release will let you invite regular domestic workers and drivers on a repeating schedule."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}