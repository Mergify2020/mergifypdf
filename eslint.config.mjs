import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Studio and workspace shells predate strict no-explicit-any. Keep the
  // exception file-scoped while their behavior-preserving modularization proceeds.
  {
    files: [
      "src/app/**/studio/StudioClient.tsx",
      "src/components/WorkspaceShell.tsx",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Intentional underscore prefixes mark deliberately unused compatibility fields.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // HTML img tags are required by transactional email clients.
  {
    files: ["src/emails/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  // CommonJS is intentional for standalone operational scripts.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // cloneElement inspects a child element that may carry a ref; no ref value is read.
  {
    files: ["src/components/UiTooltip.tsx"],
    rules: { "react-hooks/refs": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
