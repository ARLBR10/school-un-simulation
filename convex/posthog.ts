import { PostHog } from "@posthog/convex";
import { components } from "./_generated/api";

let posthog: PostHog | undefined;

export function getPostHog() {
  posthog ??= new PostHog(components.posthog, {
    identify: async (ctx) => {
      const identity = await ctx.auth?.getUserIdentity();
      if (!identity) return null;
      return { distinctId: identity.subject };
    },
    beforeSend: (event) => {
      return {
        ...event,
        properties: {
          ...event.properties,
          deployment: process.env.CONVEX_DEPLOYMENT,
        },
      };
    },
  });

  return posthog;
}
