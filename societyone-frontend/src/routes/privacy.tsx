import { createFileRoute, Link } from "@tanstack/react-router";

function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">SocietyOne</p>
      <h1 className="mt-3 font-display text-4xl font-bold">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{body}</p>
      <Link to="/" className="mt-8 inline-block text-sm font-semibold text-brand-blue">
        Back home
      </Link>
    </main>
  );
}

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy | SocietyOne" }] }),
  component: () => (
    <LegalPage
      title="Privacy"
      body="SocietyOne stores society, resident, visitor, and audit data for gate management. Authentication uses JWT sessions. This page is a product placeholder, not a legal policy."
    />
  ),
});
