import { redirect } from "@tanstack/react-router";
import type { Role } from "@/types/domain";
import { authService } from "@/services";

/** Shared TanStack Router guard. Backend JWT/session remains the source of truth. */
export async function requireAuth() {
  const authenticated = await authService.isAuthenticated();
  if (!authenticated) {
    throw redirect({ to: "/login", search: { role: undefined as Role | undefined } });
  }
}

/** Guard routes that require specific roles. Redirects to /dashboard if role mismatch. */
export async function requireRole(allowedRoles: Role[]) {
  await requireAuth();
  const user = await authService.getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    throw redirect({ to: "/dashboard" });
  }
}

