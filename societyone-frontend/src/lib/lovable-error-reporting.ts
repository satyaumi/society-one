export function reportLovableError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined") {
    try {
      window.console.error(
        "[lovable-error-reporting]",
        error,
        context ?? {},
      );
    } catch {
      /* no-op: reporting must never itself break the app */
    }
  }
}
