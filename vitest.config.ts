import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    // CI standards parity (cf-s5cs) — coverage with v8 provider, thresholds
    // ratcheted to current measured floor so any regression fails CI. Raise
    // the numbers as coverage improves; never lower them.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "src/**/__mocks__/**",
        "e2e/**",
      ],
      thresholds: {
        statements: 81,
        branches: 74,
        functions: 78,
        lines: 83,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/__tests__/shims/server-only.ts"),
    },
  },
});
