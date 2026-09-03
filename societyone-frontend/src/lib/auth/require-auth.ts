import { redirect } from "@tanstack/react-router";
import { authService } from "@/services";

/** Shared TanStack Router guard. Backend JWT/session remains the source of truth. */
export async function requireAuth() {
  const authenticated = await authService.isAuthenticated();
  if (!authenticated) {
    throw redirect({ to: "/login" });
  }
}
