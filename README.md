# UN Panel

This is an panel made (planned) for an school simulation of an UN (ONU in Portuguese) committee. There is a lot of committees, press, logistics and evaluation going around. So this panel needs to be the most stable possible

# Hosting

Any way of free hosting is welcome, me ([@ARLBR10](https://github.com/ARLBR10)) is planning to use the free tier of [Convex](https://www.convex.dev/) and [Cloudflare Workers](https://workers.cloudflare.com/).

If shit happen it should be able to easily use a drop-in replacement on a VPS (from [ApexCloud](https://apexcloud.cc/vps)).

# Privacy

This repo should include only code data used to help the simulation, surveillance of any kind is prohibited. Any data that could pinpoint or expose personal data, or private school data is also prohibited.

AI detection could be implemented. (Maybe [AISDK](https://ai-sdk.dev/)?)

# Development

1. Have [bun](https://bun.com/) installed.
2. Have an [convex](https://dashboard.convex.dev/) account
3. Run the commands:
```bash
bun install
bun convex:dev # Make sure to setup an Cloud account and create a new repo
bun run dev # This runs TanStack Start and Convex at dev simultaneously
```
