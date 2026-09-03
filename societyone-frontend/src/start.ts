// Stub for TanStack Start compatibility.
// This project uses plain Vite client-side rendering, not TanStack Start SSR.
// The stub exists only to satisfy `routeTree.gen.ts` type imports.

export const startInstance = {
  getOptions: () => ({}),
} as const;
