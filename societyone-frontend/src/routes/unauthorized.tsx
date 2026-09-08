import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Home, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access Restricted | SocietyOne" },
      { name: "description", content: "You do not have permission to access this page." },
    ],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center selection:bg-primary/20">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card p-8 shadow-2xl backdrop-blur-sm sm:p-10">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
          <ShieldAlert className="size-10" />
        </div>

        <div className="inline-block rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          401 Unauthorized / Access Restricted
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Access Restricted
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          You are not currently authorized to view this page. This could be because you are not logged in, or your account does not have administrator privileges for this section.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2 shadow-md">
            <Link to="/">
              <Home className="size-4" />
              Go to Home Page
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link to="/login" search={{ role: undefined }}>
              <LogIn className="size-4" />
              Log In with Another Account
            </Link>
          </Button>
        </div>

        <div className="mt-6 border-t border-border/50 pt-4 text-xs text-muted-foreground">
          Need access? Contact your building administrator or society office.
        </div>
      </div>
    </div>
  );
}
