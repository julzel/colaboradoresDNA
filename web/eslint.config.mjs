import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const repositoryImportRestrictions = [
  {
    group: [
      "@/features/*/server/*repository",
      "@/features/*/server/**/*repository",
      "**/server/*repository",
      "**/server/**/*repository",
    ],
    message:
      "Access repositories through the owning feature's query or service boundary.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/features/**/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: repositoryImportRestrictions,
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
