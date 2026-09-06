import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms | SocietyOne" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">SocietyOne</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Terms</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        SocietyOne is a residential visitor and security management product. This page is a product placeholder.
      </p>
      <Link to="/" className="mt-8 inline-block text-sm font-semibold text-brand-blue">
        Back home
      </Link>
    </main>
  );
}
