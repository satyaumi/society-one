/**
 * Centralized HTTP client for the auth module.
 *
 * - Reads/writes the JWT from a single tokenStore.
 * - Applies consistent request body parsing.
 * - Unwraps the common API response envelope.
 * - Maps backend errors into ApiError.
 * - The rest of the app should not hard-code API URLs.
 *
 * Backend:
 * VITE_API_BASE_URL=http://localhost:8082/api
 */

import { mapHttpErrorToUserMessage } from "./error-mapper";

const DEFAULT_BASE_URL = "/api";
const TOKEN_KEY = "societyone.token.v1";

// ---------------------- Token storage ----------------------

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore localStorage errors.
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore localStorage errors.
    }
  },
};

// ---------------------- API response envelope ----------------------

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// ---------------------- API error ----------------------

export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{
    field: string;
    message: string;
  }> = [];

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------- API base URL ----------------------

function readEnvBaseUrl(): string {
  const env = (
    import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }
  ).env;

  const baseUrl =
    env?.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL;

  // Remove trailing slash.
  return baseUrl.replace(/\/+$/, "");
}

// ---------------------- HTTP client ----------------------

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {

  const baseUrl = readEnvBaseUrl();

  // Make sure path begins with exactly one slash.
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = `${baseUrl}${normalizedPath}`;

  const token = tokenStore.get();

  const headers: Record<string, string> = {
    Accept: "application/json",

    ...(typeof init.json !== "undefined"
      ? {
          "Content-Type": "application/json",
        }
      : {}),

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),

    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    ...init,
    headers,

    body:
      typeof init.json !== "undefined"
        ? JSON.stringify(init.json)
        : init.body,
  });

  // Try to parse the common backend envelope.
  let envelope: ApiEnvelope<T> | null = null;

  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Backend returned no valid JSON.
  }

  // ---------------------- Error response ----------------------

  if (!res.ok) {

    const code =
      envelope?.error?.code ??
      `HTTP_${res.status}`;

    const message =
      envelope?.error?.message ??
      mapHttpErrorToUserMessage(res.status) ??
      res.statusText ??
      "Request failed";

    const error = new ApiError(
      res.status,
      code,
      message,
    );

    if (envelope?.error?.details) {
      error.details = envelope.error.details;
    }

    throw error;
  }

  // ---------------------- Success response ----------------------

  return (
    envelope?.data as T
  ) ?? (null as unknown as T);
}