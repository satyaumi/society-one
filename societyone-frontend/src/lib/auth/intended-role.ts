import type { Role } from "@/types/domain";

const ROLES: Role[] = ["RESIDENT", "VISITOR", "SECURITY", "ADMIN"];

/** Parse a UI role hint from search params. Never treat this as authorization. */
export function parseIntendedRole(value: unknown): Role | undefined {
  if (typeof value !== "string") return undefined;
  return ROLES.includes(value as Role) ? (value as Role) : undefined;
}

export function isPublicSelfServeRole(
  role: Role | undefined,
): role is "RESIDENT" | "VISITOR" {
  return role === "RESIDENT" || role === "VISITOR";
}
