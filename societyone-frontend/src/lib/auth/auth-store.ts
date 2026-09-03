/**
 * Centralized authentication store.
 *
 * We intentionally AVOID Zustand/Jotai here:
 *   - No new deps, tiny footprint
 *   - Subscribe() model maps 1:1 into React Query invalidation later
 *   - Can be migrated 1 file at a time if needed
 *
 * 4 responsibilities:
 *   1. Hold `isAuthenticated`, `user`, `role`, `token` in memory
 *   2. Persist to localStorage (user + role only via JSON; token via tokenStore)
 *   3. Restore state from storage on first read (session restore)
 *   4. Validate session via /api/auth/me (caller is `main.tsx` boot)
 */

import { useEffect, useState } from "react";
import { apiFetch, tokenStore } from "./auth-api-client";
import type { Role, User } from "@/types/domain";

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  restoring: boolean;
  initialBootDone: boolean;
}

type Listener = (state: AuthState) => void;

const USER_KEY = "societyone.user.v1";

// -------------------- in-memory store --------------------
let state: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  restoring: true,
  initialBootDone: false,
};
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(state);
}

export const authStore = {
  getState: (): AuthState => Object.freeze({ ...state }),

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  },

  /** Called exactly once during app boot. */
  async restoreSession(): Promise<{ authenticated: boolean }> {
    const token = tokenStore.get();
    let user: User | null = null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) user = JSON.parse(raw) as User;
    } catch {
      /* ignore */
    }

    if (token && user) {
      state = { ...state, token, user, isAuthenticated: true };
    }
    state = { ...state, restoring: false, initialBootDone: true };
    notify();

    // Validate persisted token against the backend IF we have one.
    // If backend says 401 → logout locally. If backend is offline → keep optimistic cache.
    if (token) {
      try {
        const freshUser = await apiFetch<User>("/auth/me");
        if (freshUser) {
          authStore.setAuthenticated(freshUser, token);
        } else {
          authStore.clear();
        }
      } catch (err) {
        const status = (err as { status?: number })?.status ?? 0;
        if (status === 401 || status === 403) authStore.clear();
      }
    }
    return { authenticated: state.isAuthenticated };
  },

  setAuthenticated(user: User, token: string) {
    tokenStore.set(token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* quota */
    }
    state = {
      ...state,
      isAuthenticated: true,
      user,
      token,
    };
    notify();
  },

  setUser(user: User) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* quota */
    }
    // Keep identity in sync after /auth/me or profile updates. Authentication
    // still requires a stored token from login/signup/OTP.
    state = {
      ...state,
      user,
      isAuthenticated: Boolean(state.token),
    };
    notify();
  },

  clear() {
    tokenStore.clear();
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    state = {
      isAuthenticated: false,
      user: null,
      token: null,
      restoring: false,
      initialBootDone: state.initialBootDone,
    };
    notify();
  },
};

// -------------------- tiny React convenience hook --------------------

/** One-line: `const { user, isAuthenticated } = useAuth();` */
export function useAuth(): AuthState {
  const [snapshot, setSnapshot] = useState<AuthState>(() => authStore.getState());
  useEffect(() => authStore.subscribe(setSnapshot), []);
  return snapshot;
}
