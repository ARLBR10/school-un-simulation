import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      ".output/**",
      ".nitro/**",
      ".vinxi/**",
      "node_modules/**",
      "src/routeTree.gen.ts",
      "convex/_generated/**",
    ],
  },
  ...tanstackConfig,
];
