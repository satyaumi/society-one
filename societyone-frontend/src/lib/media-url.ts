/**
 * Resolves media URLs (such as uploaded avatar images).
 * If the path starts with `/uploads/`, ensures it resolves to the backend server origin
 * or relative proxy path without breaking.
 */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path || !path.trim()) return undefined;
  const trimmed = path.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const apiBase = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  if (apiBase && apiBase.startsWith("http")) {
    try {
      const url = new URL(apiBase);
      const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      return `${url.origin}${normalizedPath}`;
    } catch {
      // fallback to relative path
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
