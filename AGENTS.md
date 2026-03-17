# AGENTS.md

This file is for coding agents working in `school-onu-panel`.

## Project Snapshot

- Stack: Next.js 16 App Router, React 19, TypeScript 5, Convex, Tailwind CSS 4.
- Package manager: Bun (`bun.lock` is present, README uses Bun commands).
- App structure is currently small: `app/`, `components/`, `convex/`.
- TypeScript is strict in both root `tsconfig.json` and `convex/tsconfig.json`.
- ESLint uses `eslint-config-next` with `core-web-vitals` and `typescript` presets.
- No dedicated test runner is configured yet.
- No existing `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files were found.

## Repository Priorities

- Favor stability over cleverness; the README explicitly says the panel should be as stable as possible.
- Protect privacy: do not add surveillance behavior or code that exposes personal or private school data.
- Prefer practical, maintainable solutions that fit free-tier deployment constraints.
- Keep changes small, readable, and easy to host on Next.js + Convex.
- Treat Brazilian Portuguese (`pt-BR`) as the current interface language unless the repository is later expanded for localization.

## Source Of Truth

- Runtime scripts: `package.json`
- Lint rules: `eslint.config.mjs`
- App TypeScript config: `tsconfig.json`
- Convex TypeScript config: `convex/tsconfig.json`
- High-level project intent and constraints: `README.md`

## Commands

## Install

- `bun install`

## Local Development

- `bun run dev` - runs Next.js dev server and Convex dev together via `concurrently`
- `bun run next:dev` - runs only the Next.js app
- `bun run convex:dev` - runs only Convex dev

## Build And Production

- `bun run next:build` - production build for the Next.js app
- `bun run next:start` - starts the production server after a build

## Lint

- There is no dedicated `lint` script in `package.json`.
- Use `bunx eslint .` for a repo-wide lint run.
- Use `bunx eslint app/page.tsx` to lint a single file.
- If you add a script, prefer `"lint": "eslint ."` rather than introducing new tooling.

## Type Checking

- There is no dedicated `typecheck` script in `package.json`.
- Use `bunx tsc --noEmit` for app type-checking.
- Use `bunx tsc --noEmit -p convex/tsconfig.json` for Convex-only type-checking.
- Run both when touching shared typing assumptions or Convex code.

## Tests

- No test framework, test script, or test files are currently present.
- There is currently no repository-native command for running all tests.
- There is currently no repository-native command for running a single test.
- Do not invent Jest/Vitest/Playwright commands in automation unless you first add that tool.
- If you add tests in the future, document both:
  - the full test command
  - the single-test command by file path and, if supported, by test name

## Before You Finish A Change

- For UI/code changes in the app: run `bunx eslint .` and `bunx tsc --noEmit`.
- For Convex changes: also run `bunx tsc --noEmit -p convex/tsconfig.json`.
- For release-sensitive changes: run `bun run next:build`.
- If a command cannot run because required env vars are missing, say so explicitly.

## Architecture Notes

- `app/` uses the App Router.
- `app/layout.tsx` is the root layout and wires global providers.
- `components/ConvexClientProvider.tsx` is the current client-side Convex provider wrapper.
- `app/globals.css` imports Tailwind and defines CSS theme variables.
- The `@/*` path alias maps to the repository root.
- `convex/` is reserved for Convex code and has its own TS config.

## General Coding Style

- Match existing repository style before introducing new patterns.
- Prefer TypeScript-first code; avoid plain `.js` unless there is a strong reason.
- Use strict, explicit types when they improve correctness.
- Keep functions and components small and single-purpose.
- Prefer clear names over abbreviations.
- Avoid speculative abstractions in this early-stage codebase.
- Remove dead code, unused imports, and placeholder scaffolding when replacing it.

## Formatting

- Follow the formatting already present in the repo:
  - double quotes
  - semicolons
  - trailing commas where valid
  - compact object literals unless readability suffers
- Keep line length reasonable; wrap JSX props across lines when they become dense.
- Let ESLint and TypeScript constraints drive consistency.
- No Prettier config exists today, so do not assume Prettier-specific rules.

## Imports

- Put imports at the top of the file.
- Group imports logically:
  - framework/library imports
  - internal imports via `@/`
  - side-effect imports like `./globals.css`
- Prefer `import type` for type-only imports when appropriate.
- Prefer the `@/` alias for internal app imports instead of long relative paths.
- Do not leave unused imports behind.

## Naming

- Use `PascalCase` for React components and exported component files.
- Use `camelCase` for variables, functions, and helpers.
- Use descriptive names for providers, hooks, and utility functions.
- Use `SCREAMING_SNAKE_CASE` only for true constants or environment-variable-like values.
- Name files to match their main export when practical.
- Keep code identifiers, function names, and variable names in English even when UI copy is in Portuguese.

## Types

- Respect `strict: true`; do not weaken TS settings to make errors disappear.
- Avoid `any`; use specific types, generics, unions, or `unknown` plus narrowing.
- Type component props explicitly.
- Use `Readonly<{ ... }>` patterns only when they add value, not by reflex.
- Prefer framework-provided types like `Metadata` and `NextConfig` when available.
- Keep Convex code compatible with `convex/tsconfig.json` rather than app-only assumptions.

## React And Next.js

- Default to Server Components; add `"use client"` only when client behavior is required.
- Keep client boundaries as small as possible.
- Put global providers in `app/layout.tsx` or a focused wrapper component.
- Use `next/image` for app images when it fits the use case.
- Use metadata exports for page metadata instead of ad hoc head management.
- Prefer App Router conventions over legacy Pages Router patterns.

## UI Copy And Localization

- Write user-facing text in Brazilian Portuguese (`pt-BR`).
- Keep spelling, grammar, punctuation, and accent usage correct in all visible UI text.
- Do not mix English UI labels into the interface unless the term is intentionally technical or comes from an external brand/product.
- When changing copy, review surrounding labels and messages for consistency in tone and terminology.
- Keep internal code, filenames, and identifiers in English unless an existing API or dataset requires otherwise.

## Styling

- Use Tailwind utilities for most styling.
- Reuse CSS variables from `app/globals.css` for theme-aware values.
- Prefer composition over large custom CSS blocks.
- Keep global CSS minimal and intentional.
- Preserve responsive behavior; test both mobile and desktop layouts conceptually.
- Avoid adding a second styling system unless there is a strong need.

## Convex Guidelines

- Keep Convex-specific code inside `convex/` unless an integration layer clearly belongs in the app.
- Keep provider setup isolated in dedicated components like `ConvexClientProvider`.
- Treat `NEXT_PUBLIC_CONVEX_URL` as required for Convex-enabled flows.
- Do not hardcode deployment URLs, tokens, or environment-specific secrets.
- If Convex generated files appear, avoid hand-editing generated output.

## Environment And Secrets

- `.env*` files are gitignored; never commit secrets.
- `NEXT_PUBLIC_*` variables are exposed to the client; do not put secrets in them.
- When adding a new env var, document whether it is server-only or client-exposed.
- Fail clearly when required env vars are missing.

## Error Handling

- Fail fast on missing required configuration.
- Prefer explicit guards and readable error messages over silent fallbacks.
- Handle async failures at the boundary where the user or caller can recover.
- Do not swallow errors just to keep the UI quiet.
- For user-visible failures, return actionable messages when possible.

## What To Avoid

- Do not introduce a new formatter, state library, or test framework casually.
- Do not bypass lint or type errors with blanket disables unless absolutely necessary.
- Do not replace `@/` imports with deeper relative paths without a reason.
- Do not add surveillance or privacy-invasive features.
- Do not commit generated secrets, `.env` files, or personal data.

## Agent Workflow Tips

- Start by checking `package.json`, `README.md`, and the touched files.
- If changing behavior, prefer updating the smallest relevant surface first.
- When adding tooling, update `package.json` scripts so future agents have stable commands.
- If you add tests or lint/typecheck scripts, update this file.
- If the repository later gains Cursor or Copilot instruction files, merge their rules into this document.
