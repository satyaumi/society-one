import { Loader2 } from "lucide-react";

/**
 * Google Sign-In UI + integration point.
 *
 * The actual OAuth flow lives behind `authService.loginWithGoogle()`.
 * Today the service throws "Not configured yet" so the UX explicitly tells the user
 * that they'll be able to sign in once backend/n8n is wired up.
 *
 * To connect later:
 *   - set VITE_GOOGLE_CLIENT_ID=xxxx in .env
 *   - open popup / redirect to backend at /api/auth/google
 *   - callback lands and returns JWT envelope
 */
export function GoogleButton({
  onClick,
  loading = false,
  label = "Continue with Google",
  disabled,
}: {
  onClick: () => Promise<unknown> | void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => void Promise.resolve(onClick())}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue/40 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 48 48" aria-hidden className="size-5">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.3l-6.3-5.3C28.9 34.8 26.6 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.4-4.1 5.4l6.3 5.3C41.5 35.3 44 30 44 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {label}
    </button>
  );
}
