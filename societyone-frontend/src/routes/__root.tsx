import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center selection:bg-primary/20">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
          <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          404 / Unauthorized
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
          Page Not Found or Access Restricted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you requested doesn't exist, may have moved, or requires you to log in with an authorized resident or admin account.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Home
          </Link>
          <Link
            to="/login"
            search={{ role: undefined }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Unable to Load Page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {error?.message?.includes("UNAUTHORIZED") || error?.message?.includes("Authentication")
            ? "Your session may have expired or you are not authorized to view this page. Please log in to continue."
            : "An unexpected error occurred while loading this page. You can try refreshing or go back to home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Log In
          </a>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SocietyOne | Visitor & Security Management" },
      {
        name: "description",
        content:
          "Simple visitor and security management for modern residential societies.",
      },
      { name: "author", content: "SocietyOne" },
      {
        property: "og:title",
        content: "SocietyOne | Visitor & Security Management",
      },
      {
        property: "og:description",
        content:
          "Simple visitor and security management for modern residential societies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@SocietyOne" },
    ],
    links: [{ rel: "icon", href: "/favicon.png", type: "image/png" }],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
