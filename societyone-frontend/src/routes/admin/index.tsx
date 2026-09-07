import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/societyone";
import { SocietyCommandCenter } from "@/components/admin/SocietyCommandCenter";
import { requireAuth } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/admin/")({
  beforeLoad: requireAuth,

  head: () => ({
    meta: [
      { title: "Admin Society Command Center | SocietyOne" },
      {
        name: "description",
        content: "Data-driven Society Command Center for apartment administration.",
      },
    ],
  }),

  component: AdminIndexPage,
});

function AdminIndexPage() {
  return (
    <AppShell title="Society Command Center" eyebrow="Admin">
      <SocietyCommandCenter />
    </AppShell>
  );
}