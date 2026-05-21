import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // cfw-4x7: test files routinely mock `next/image` as a plain `<img>` so
  // unit tests don't drag the next/image runtime + Image component
  // optimisation pipeline into vitest. The Next perf rule
  // (@next/next/no-img-element) and jsx-a11y/alt-text are aimed at
  // production-rendered markup, not vi.mock scaffolding — silence them
  // for test files only so future test authors don't need per-line
  // eslint-disable comments.
  {
    files: [
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    rules: {
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
  // logError migration guard-rail. Direct `console.error(...)` is the
  // legacy pattern; the canonical path is `logError(scope, message, err)`
  // from `@/lib/observability/log` so failures fan out to Sentry in
  // production via the helper's forwarder. The helper itself is
  // unavoidably exempt (it's the call site that writes to console.error
  // on purpose); tests are also exempt because they spy on console.error
  // by design.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/observability/log.ts",
      "src/lib/wix/errors.ts",
      "src/lib/logging/log-error.ts",
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name='error']",
          message:
            "Prefer logError(scope, message, err) from @/lib/observability/log over direct console.error — keeps prod failures wired to Sentry via the helper's forwarder.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
