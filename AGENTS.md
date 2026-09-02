<!-- BEGIN:tanstack-start-agent-rules -->
# This Is TanStack Start

This repo uses TanStack Start with React 19, TanStack Router file routes, Vite, Nitro, and Tailwind CSS 4.
Route files live in `src/app/` and must export `Route` from `createFileRoute` or `createRootRoute`.
Do not add Next.js APIs, `next/link`, `next/navigation`, `next/font`, App Router metadata exports, or `page.tsx`/`layout.tsx` route files.
<!-- END:tanstack-start-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`bunx convex ai-files install`.

<!-- convex-ai-end -->

# Agent Notes For `school-onu-panel`

## Repo Snapshot
- Package manager: Bun.
- Frontend: TanStack Start routes in `src/app/`.
- Language: TypeScript with `strict: true`.
- Styling: Tailwind CSS 4, shadcn/radix-nova, and reui data-grid components, all driven by tokens in `src/app/globals.css`.
- Interface architecture: persistent application chrome in `components/layout/AppShell.tsx`, page spacing and headers via `components/layout/PageShell.tsx`.
- Backend: Convex, with generated code under `convex/_generated/`.
- The app has an established admin/public interface style; preserve it for new pages instead of introducing one-off layouts.

## Directory Guide
- `src/app/`: TanStack Start file routes, root route, server routes, and global CSS.
- `src/server/`: server-only helpers used by TanStack Start server routes.
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
- TanStack Start only: `bun run vite:dev`
- Convex only: `bun run convex:dev`
- Production build: `bun run vite:build`
- Production server: `bun run vite:start`
- Full lint: `bun run lint`
- Oxlint only: `bun run lint:oxlint`
- Convex-specific lint: `bun run lint:convex`
- Single-file lint: `bun run lint src/app/index.tsx`
- Tests use Bun's built-in test runner: `bun test`.
- Run a focused test with `bun test path/to/file.test.ts`.
- Prefer `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` so Bun discovers tests.

## Tooling Facts
- `tsconfig.json` uses `strict: true`, `moduleResolution: "bundler"`, and the `@/*` path alias.
- Oxlint is configured in `.oxlintrc.json`; Convex-specific ESLint rules are configured in `eslint.config.mjs` and scoped to `convex/`.
- There is no Prettier, Biome, Jest, Vitest, Playwright, or Cypress config checked in.
- `components.json` uses shadcn aliases, the `radix-nova` style, Lucide icons, and the `@reui` registry.
- Admin tables use `@tanstack/react-table` through `components/reui/data-grid/*`.
- Motion on public-facing list/detail views uses `framer-motion`; keep transitions subtle and short.
- `VITE_CONVEX_URL` is required by the current provider setup; `VITE_CONVEX_SITE_URL` is required for auth and UploadThing.

## Current Validation Status
- `bun run vite:build` succeeds in this repo.
- `bunx tsc --noEmit` succeeds in this repo.
- `bun run lint` succeeds in this repo.

## Code Style Expectations

### General
- Follow the nearest existing file unless there is a clear repo-wide pattern to apply.
- Keep changes small, local, and TanStack Start friendly.
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
- Reuse framework types and `ReactNode` where appropriate.
- Prefer narrow unions and exact object shapes over loose strings or records.
- Use non-null assertions only when a boot-time invariant is truly required and obvious.
- For Convex data, prefer generated types such as `Id<"table">`, `Doc<"table">`, `api`, and `internal`.

### Naming
- Use PascalCase for React components.
- Use camelCase for functions, variables, and helpers.
- Keep code identifiers in English, including variables, functions, components, types, props, tables, and similar names.
- Keep route filenames TanStack Router compatible, such as `index.tsx`, `$id.tsx`, `__root.tsx`, and path segment files.
- Keep shadcn primitive filenames lowercase in `components/ui/` unless the generator requires otherwise.
- Prefer descriptive names over abbreviations.

### React And TanStack Start
- Default to Server Components; add `"use client"` only when state, effects, refs, or browser APIs require it.
- Configure route metadata with the `head` option in TanStack route definitions.
- Put cross-app providers in `components/Providers.tsx` or an equally explicit wrapper.
- Keep global application chrome in `AppShell`; do not recreate sidebars, site headers, auth footers, or shell-level backgrounds in individual pages.
- Auth and error routes are standalone paths in `AppShell`; preserve that split when adding more auth/error screens.
- Use TanStack Router APIs such as `Link`, `useNavigate`, `useLocation`, route params, and route search instead of Next.js APIs.

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
- Reuse tokens from `src/app/globals.css` instead of inventing ad hoc color variables.
- Prefer semantic classes and design tokens such as `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-sidebar`, `text-sidebar-foreground`, and status tokens over one-off raw colors.
- Preserve the dark-first visual language: neutral black/foreground foundation, subtle blue-violet primary accents, rounded card surfaces, light borders/rings, and restrained hover states like `hover:bg-muted/30`.
- Keep layout rhythm close to the existing shells: `gap-4`, `md:gap-6`, `px-4`, `py-4`, `lg:px-6`, rounded `xl` cards, and compact `h-9` sidebar/menu controls.
- Prefer responsive flex/grid utilities already used in the app, such as `flex flex-col gap-* sm:flex-row`, `grid gap-4 md:grid-cols-*`, `min-w-0`, `truncate`, and `max-w-*` content widths.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Keep all custom components in `src/app/` and `components/` (except `components/ui/*`) shadcn-compliant by accepting `className`, merging with `cn()`, and preferring shadcn primitives for interactive UI when available.
- Keep `components/ui/*` compatible with `class-variance-authority`, Radix Slot, and shadcn conventions.
- Preserve vendored formatting in `components/ui/*` and `components/reui/*`, even when it differs from project-authored files.

### State, Data, And Environment
- Treat `events` as the boundary for every edition of the simulation. Event-owned records such as members, committees, news, grades, attendance, and documents must retain their `eventId`; never infer an edition from `_creationTime` or the current calendar year.
- Member rows represent participation in one event, not a permanent person profile. The same authenticated user may have separate member rows and different roles in 2026 and 2027, but must never have two roles in the same event.
- The `unassigned` member type means the participant is registered for an event but their role has not been defined yet. Do not treat it as a delegate or grant operational permissions.
- Administrators are global and intentionally do not follow an event date. Admin member rows must keep `eventId` unset; event-scoped access must resolve the active membership while global admin access remains available across editions.
- Use explicit event lifecycle status: `planned`, `active`, or `past`. Keep at most one active event. Public event-owned content must always show the event name and visibly identify `past` content as an event from the past.
- During the 2026 production rollout, event fields remain optional only for widen/backfill compatibility. New writes must include or resolve an event, and legacy fallbacks must be removed when the backfill is verified and the schema is narrowed.
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
- For frontend work, inspect `src/app/__root.tsx`, `src/app/globals.css`, `components/layout/AppShell.tsx`, `components/layout/PageShell.tsx`, and nearby components before inventing patterns.
- For new pages, first decide whether the page is shell-managed, standalone auth/error content, public centered content, or admin content, then follow the matching existing route.
- For new admin CRUD pages, inspect `components/admin/DynamicTable.tsx` and the closest `src/app/admin/*.tsx` before adding custom table or form code.
- Before adding tests, choose and configure a test runner explicitly; do not assume one exists.
- Keep general lint configuration in `.oxlintrc.json`; keep ESLint limited to Convex-specific rules unless explicitly requested.
- If you add new workflow rules, update this file immediately so later agents see them.

## Validation Checklist
- Run `bunx tsc --noEmit` after TS/TSX changes.
- Run `bun run lint` after lint configuration changes.
- Run `bun run vite:build` before shipping larger frontend work.
- If tests are added later, document both full-suite and single-test commands here right away.
