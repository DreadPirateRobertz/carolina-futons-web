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
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
