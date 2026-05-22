import convexPlugin from "@convex-dev/eslint-plugin";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "convex/_generated/**",
      "convex/betterAuth/generatedSchema.ts",
    ],
  },
  {
    files: ["convex/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  ...convexPlugin.configs.recommended,
]);
