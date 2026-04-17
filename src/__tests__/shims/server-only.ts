// Test shim: `server-only` is a Next.js marker package that throws at build time
// if imported from a client bundle. In vitest we alias it to this noop so
// `@/lib/wix/*` server modules can be imported directly in unit tests.
export {};
