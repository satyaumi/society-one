import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './styles.css'
import { getRouter } from './router'
import { authStore } from '@/lib/auth/auth-store'

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

/**
 * App boot.
 * 1. Restore session from localStorage (JWT + cached user)
 * 2. Optionally validate cached token against /api/auth/me (done inside restoreSession)
 * 3. Only then mount React Router so route guards don't flash "unauthenticated → redirect"
 */
const rootEl = document.getElementById('root')!;
const root = createRoot(rootEl);

// Show a single centered loading spinner while auth state is hydrating.
// This replaces: flash of LoginPage → then Dashboard.
root.render(
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--background, #0b1324)',
    color: 'var(--foreground, #e5e7eb)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 22, height: 22, border: '2.5px solid #2563eb', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 's1-spin 0.9s linear infinite'
      }} />
      <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.2 }}>
        Starting SocietyOne…
      </span>
    </div>
    <style>{`@keyframes s1-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

void authStore.restoreSession().then(() => {
  const router = getRouter();
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
