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

## Privacy

This repository should contain only the code and data needed to help run the simulation. No private school information, unnecessary personal data, or surveillance mechanisms.

Technical and analytics data, when used, should only support diagnostics, security, auditing, and operational improvement for the event. The platform should not sell data or use analytics for behavioral advertising.

## Stack

- Runtime and package manager: Bun.
- Frontend: TanStack Start, React 19, TanStack Router, Vite, and Nitro.
- Backend: Convex.
- UI: Tailwind CSS 4, shadcn/radix-nova, reui data-grid, and Lucide icons.
- Auth: Better Auth integrated with Convex.
- Planned deploy: Convex and Cloudflare Workers.

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

There is no test suite configured yet.

## Deploy

The project already includes scripts for building and deploying with Cloudflare Workers and Convex:

```bash
bun run cf-build
bun run cf-deploy
```

Before publishing, check the environment variables and the Convex deployment.
