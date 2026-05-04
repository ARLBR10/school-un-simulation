<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js 16.2.4 with App Router, React 19, and Tailwind CSS 4.
Before changing framework code, read the relevant guide in `node_modules/next/dist/docs/`.
Assume APIs, conventions, and file structure may differ from older Next.js versions.
Heed deprecation notices and prefer current framework patterns over training-data habits.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

# Agent Notes For `school-onu-panel`

## Repo Snapshot
- Package manager: Bun.
- Frontend: Next.js App Router in `app/`.
- Language: TypeScript with `strict: true`.
- Styling: Tailwind CSS 4, shadcn/radix-nova, and reui data-grid components, all driven by tokens in `app/globals.css`.
- Interface architecture: persistent application chrome in `components/layout/AppShell.tsx`, page spacing and headers via `components/layout/PageShell.tsx`.
- Backend: Convex, with generated code under `convex/_generated/`.
- The app has an established admin/public interface style; preserve it for new pages instead of introducing one-off layouts.

## Directory Guide
- `app/`: routes, layouts, and global CSS.
- `components/`: shared React components and providers.
- `components/layout/`: app shell, footer, membership guard, and page scaffolding primitives.
- `components/ui/`: shadcn-style primitives; preserve upstream structure when possible.
- `components/reui/`: reui registry components, especially data-grid pieces; treat these as vendored-style primitives.
- `components/admin/`: admin CRUD and table abstractions built on shadcn, reui, and TanStack Table.
- `hooks/`: shared client hooks used by primitives such as the sidebar.
- `lib/`: small shared helpers such as `cn()`.
- `convex/`: Convex code; do not hand-edit `convex/_generated/*`.
- `public/`: static assets.

## Commands
- Install: `bun install`
- Full dev stack: `bun run dev`
- Next.js only: `bun run next:dev`
- Convex only: `bun run convex:dev`
- Production build: `bun run next:build`
- Production server: `bun run next:start`
- Full lint: `bun run lint .`
- Single-file lint: `bun run lint app/page.tsx`
- There is no configured test suite yet.
- `bun test` currently fails with "0 test files matching ..." because no tests exist.
- There is no meaningful single-test command today because there are no tests.
- If Bun tests are added later, use `bun test path/to/file.test.ts` for a single file.
- Prefer `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` so Bun discovers tests.

## Tooling Facts
- `tsconfig.json` uses `strict: true`, `moduleResolution: "bundler"`, and the `@/*` path alias.
- ESLint is configured in `eslint.config.mjs` with Next core-web-vitals and TypeScript presets.
- There is no Prettier, Biome, Jest, Vitest, Playwright, or Cypress config checked in.
- `components.json` uses shadcn aliases, the `radix-nova` style, Lucide icons, and the `@reui` registry.
- Admin tables use `@tanstack/react-table` through `components/reui/data-grid/*`.
- Motion on public-facing list/detail views uses `framer-motion`; keep transitions subtle and short.
- `NEXT_PUBLIC_CONVEX_URL` is required by the current provider setup.

## Current Validation Status
- `bun run next:build` succeeds in this repo.
- `bun run lint .` is clean for app code but shows 3 warnings in generated Convex files.
- Treat those warnings as generated/config noise unless the repo later ignores `convex/_generated`.

## Code Style Expectations

### General
- Follow the nearest existing file unless there is a clear repo-wide pattern to apply.
- Keep changes small, local, and App Router friendly.
- Prefer straightforward code over abstraction-heavy helpers.
- Do not edit generated output unless the task is specifically about generation.

### Formatting
- Use 2-space indentation.
- In project-authored TS/TSX, prefer double quotes and semicolons.
- Preserve nearby formatting in generated or vendored-style files, especially `components/ui/*`.
- Break long JSX props across lines and keep one prop per line once wrapping starts.
- Use trailing commas in multiline literals when the surrounding file already does.

### Imports
- Order imports as: framework/external, internal alias, then relative imports.
- Keep side-effect imports like `"./globals.css"` near the top.
- Prefer the `@/` alias over deep relative paths for app code.
- Use `import type` for type-only imports when practical.
- Keep blank lines between major import groups.

### Types
- Do not weaken `strict` settings.
- Avoid `any`; use explicit props, unions, utility types, or framework types.
- Reuse framework types such as `Metadata` and `ReactNode` where appropriate.
- Prefer narrow unions and exact object shapes over loose strings or records.
- Use non-null assertions only when a boot-time invariant is truly required and obvious.
- For Convex data, prefer generated types such as `Id<"table">`, `Doc<"table">`, `api`, and `internal`.

### Naming
- Use PascalCase for React components.
- Use camelCase for functions, variables, and helpers.
- Keep code identifiers in English, including variables, functions, components, types, props, tables, and similar names.
- Keep Next route filenames framework-standard: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and similar.
- Keep shadcn primitive filenames lowercase in `components/ui/` unless the generator requires otherwise.
- Prefer descriptive names over abbreviations.

### React And Next.js
- Default to Server Components; add `"use client"` only when state, effects, refs, or browser APIs require it.
- Keep route metadata typed and exported from route/layout files.
- Put cross-app providers in `components/Providers.tsx` or an equally explicit wrapper.
- Keep global application chrome in `AppShell`; do not recreate sidebars, site headers, auth footers, or shell-level backgrounds in individual pages.
- Auth and error routes are standalone paths in `AppShell`; preserve that split when adding more auth/error screens.
- Prefer App Router APIs and current Next.js patterns over Pages Router habits.
- Use `next/image` and other built-ins when they fit the feature.

### Interface Architecture
- Build normal route content with `PageShell`; use `PageShell className="mx-auto w-full max-w-*"` for centered public/detail pages and plain `PageShell` for admin sections.
- Start content pages with `PageHeader` using a concise title and one-sentence description; put primary actions in the `action` prop.
- Default to shadcn primitives for UI composition; before creating custom controls or importing a new UI library, check whether `components/ui/*` already provides the needed primitive.
- Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` for content surfaces instead of custom bordered panels.
- Use `Button asChild` for navigational actions and keep Lucide icons inline with `data-icon="inline-start"` when matching existing buttons.
- Use `Sheet` for side-edit forms, `Dialog` for focused secondary details, `AlertDialog` for destructive confirmation, and `DropdownMenu` for row actions.
- Use `Skeleton` for loading states, dashed `Card` surfaces for empty or restricted states, and clear `aria-live`/`aria-busy` on async content swaps.
- Use `AnimatePresence` and small `motion` transitions only where the surrounding page already uses motion; prefer opacity plus 6-12px translate and 0.2-0.4s duration.
- Keep navigation labels, page titles, empty states, and form copy in Brazilian Portuguese.

### Admin Tables
- Prefer the existing `DynamicTable` abstraction for CRUD-like admin pages before creating a new table implementation.
- Define admin table columns with `AdminTableColumn<T>` and keep labels/form labels user-facing in `pt-BR`.
- Use `showInTable`, `showInForm`, `showInCreateForm`, `showInEditForm`, `formRender`, and `formSelectOptions` instead of branching around `DynamicTable` externally.
- Keep search, column visibility, pagination, row actions, copy ID, and delete confirmation consistent with `DynamicTable`.
- For tabular read-only detail sections, use `components/ui/table`; for admin data grids, use `components/reui/data-grid/*` through `DynamicTable`.

### Product Language
- Chat responses should use the same language as the user.
- User-facing interface copy should be written in Brazilian Portuguese (`pt-BR`).
- Treat chat language and interface language as separate concerns.
- Keep code, identifiers, filenames, and technical structure in English even when the UI text is Portuguese.
- If text is shared between frontend and backend, keep the code key/name in English and the rendered label/message in `pt-BR`.

### Styling
- Use Tailwind utilities for component-level styling.
- Reuse tokens from `app/globals.css` instead of inventing ad hoc color variables.
- Prefer semantic classes and design tokens such as `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-sidebar`, `text-sidebar-foreground`, and status tokens over one-off raw colors.
- Preserve the dark-first visual language: neutral black/foreground foundation, subtle blue-violet primary accents, rounded card surfaces, light borders/rings, and restrained hover states like `hover:bg-muted/30`.
- Keep layout rhythm close to the existing shells: `gap-4`, `md:gap-6`, `px-4`, `py-4`, `lg:px-6`, rounded `xl` cards, and compact `h-9` sidebar/menu controls.
- Prefer responsive flex/grid utilities already used in the app, such as `flex flex-col gap-* sm:flex-row`, `grid gap-4 md:grid-cols-*`, `min-w-0`, `truncate`, and `max-w-*` content widths.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Keep all custom components in `app/` and `components/` (except `components/ui/*`) shadcn-compliant by accepting `className`, merging with `cn()`, and preferring shadcn primitives for interactive UI when available.
- Keep `components/ui/*` compatible with `class-variance-authority`, Radix Slot, and shadcn conventions.
- Preserve vendored formatting in `components/ui/*` and `components/reui/*`, even when it differs from project-authored files.

### State, Data, And Environment
- Keep environment variable usage centralized and intentional.
- Prefer validating required env vars early if you expand bootstrap logic.
- Never hardcode secrets, deployment URLs, or personal data.
- Respect the privacy constraints documented in `README.md`.
- Do not commit `.env.local` or other private `.env*` files.

### Error Handling
- Do not swallow errors with empty `catch` blocks.
- Fail fast for missing required configuration.
- Surface actionable messages for invalid input and expected failure states.
- Prefer framework-native boundaries and UI error states over ad hoc `console.log` debugging.
- Let unexpected async failures propagate with context instead of hiding them.

## Convex-Specific Rules
- Read `convex/_generated/ai/guidelines.md` before making Convex changes.
- Always define validators for Convex function arguments.
- Use `query`, `mutation`, `action`, `internalQuery`, `internalMutation`, and `internalAction` appropriately.
- Prefer indexed queries over `filter`.
- Prefer bounded reads with `take` or pagination over unbounded `collect()`.
- Derive identity with `ctx.auth.getUserIdentity()`; do not accept user IDs for auth decisions.
- Do not mix Node-only actions with queries or mutations in the same file.

## Practical Agent Workflow
- Read `package.json`, this file, and nearby config before changing behavior.
- For frontend work, inspect `app/layout.tsx`, `app/globals.css`, `components/layout/AppShell.tsx`, `components/layout/PageShell.tsx`, and nearby components before inventing patterns.
- For new pages, first decide whether the page is shell-managed, standalone auth/error content, public centered content, or admin content, then follow the matching existing route.
- For new admin CRUD pages, inspect `components/admin/DynamicTable.tsx` and the closest `app/admin/*/page.tsx` before adding custom table or form code.
- Before adding tests, choose and configure a test runner explicitly; do not assume one exists.
- Before changing lint behavior, remember the current warnings come from generated Convex files.
- If you add new workflow rules, update this file immediately so later agents see them.

## Validation Checklist
- Run `bun run lint .` after TS/TSX changes.
- Run `bun run next:build` before shipping larger frontend work.
- If tests are added later, document both full-suite and single-test commands here right away.
