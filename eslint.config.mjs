import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Components must not VALUE-import the content schema module: it drags
    // the whole zod graph (~286 KB measured) into the client bundle. Runtime
    // constants live in @/content/tracks; `import type` stays allowed.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/content/types",
              message:
                "Value imports pull zod into the client bundle — use @/content/tracks for constants or `import type`.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".e2e/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
