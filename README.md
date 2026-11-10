# School ONU Panel

Web panel for organizing a school Model UN simulation. It brings public pages, authentication, participant management, committees, news, documents, attendance, and grading into one application.

## Goal

This system was built to help run an internal educational event, keeping things less scattered and making more of the operation work without headaches. The focus is stability, clear permissions, and simple maintenance.

It is not a social network, it is not a surveillance platform, and it should not store data that is not necessary to run the simulation.

## Statement

After the 2026 edition, I wrote a personal note about what I learned while building this project, the problems that showed up during the event, and some ideas to make everything better in 2027.

Read it here: [Statement from the developer of this project](./Statement.md).

## Features

- Public area with simulation information, committees, news, rules, terms, and privacy pages.
- Login and authorization based on member links.
- Admin panel for managing members, users, committees, news, documents, attendance, and grades.
- Specific flows for press, grading, operations, and delegates.
- Real-time backend with Convex.
- Interface built with TanStack Start, React 19, TanStack Router, and Tailwind CSS 4.
- Korean War theater map with category-specific markers, themed hover/focus tooltips with labeled description, category, faction, personnel, capacity, and coordinates, and live personnel counts. GLUCON/admins can set optional personnel capacity; counts and capacities must be nonnegative safe integers, and counts cannot exceed a configured capacity.
- Theater markers can be public, limited to factions, limited to selected participants in the same event, or GLUCON/admin-only. Restricted markers can be hidden or shown without identifying details; permissions and redaction are enforced on the backend.
- TO delegations assigned to a faction can add markers. The server binds these markers to their own event/faction and limits visibility to that faction plus GLUCON/admins, regardless of submitted ownership or access settings. Editing, moving, and deleting remain operator-only; past events remain read-only.
- Historical map labels prefer English names from OpenHistoricalMap, then international/Latin names, with the original name retained when no translation is available. The historical date filter remains active.
- Infantry markers support normal and heavy variants with distinct icons; other categories retain their own icons. To reposition a marker, an operator must select it and choose **Mover** first. Only that marker unlocks, and it locks again after the move attempt or when movement mode is canceled.

## Privacy

This repository should contain only the code and data needed to help run the simulation. No private school information, unnecessary personal data, or surveillance mechanisms.

Technical and analytics data, when used, should only support diagnostics, security, auditing, and operational improvement for the event. The platform should not sell data or use analytics for behavioral advertising.

## Stack

- Runtime and package manager: Bun.
- Frontend: TanStack Start, React 19, TanStack Router, Vite, and Nitro.
- Backend: Convex.
- UI: Tailwind CSS 4, shadcn/radix-nova, reui data-grid, and Lucide icons.
- Auth: Better Auth 1.7 with the bundled Convex Better Auth 0.13 component. No Local Install schema generation is needed; deploy the backend and frontend together when upgrading.
- Planned deploy: Convex and Cloudflare Workers.
- Admin tables: TanStack Table 9 with shared feature registration in `components/reui/data-grid/data-grid-features.ts`.
- AI: AI SDK 7 with explicit `@ai-sdk/otel` tracing; Mistral OCR uses its dedicated SDK entrypoint.
- Tooling: TypeScript 7 runs `tsc`; the `typescript` alias supplies TypeScript 6's API for ESLint.
- Worker SSR bundles its dependency graph (`environments.ssr.resolve.noExternal`) so React hooks and the renderer use the same React instance in development and production.

## Requirements

- Bun installed.
- Convex account and project.
- Environment variables configured.

Important variables:

- `VITE_CONVEX_URL`: Convex deployment URL used by the frontend.
- `VITE_CONVEX_SITE_URL`: Public site URL used by auth and UploadThing.

## Development

To get started, install the dependencies:

```bash
bun install
```

Then run the full app in development:

```bash
bun run dev
```

If you prefer, you can also run each part separately:

```bash
bun run vite:dev
bun run convex:dev
```

## Validation

Useful commands before sending changes or touching important parts:

```bash
bunx tsc --noEmit
bun run lint
bun run vite:build
```

Tests use Bun's built-in runner: `bun test`. Run the marker permission and personnel regressions with `bun test tests/theater-markers.test.ts`.

## Deploy

The project already includes scripts for building and deploying with Cloudflare Workers and Convex:

```bash
bun run cf-build
bun run cf-deploy
```

Before publishing, check the environment variables and the Convex deployment.
