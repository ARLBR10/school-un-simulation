import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components, internal } from "./_generated/api";
import { DataModel, Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};

export type AuthUser = Awaited<ReturnType<typeof authComponent.getAuthUser>>;

type UserInfoType = AuthUser & {
  member: Doc<"members"> | null;
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<UserInfoType | null> => {
    const userInfo = await authComponent.getAuthUser(ctx).catch(() => {
      return null;
    });

    if (!userInfo) {
      return null;
    }

    const membershipInfo = await ctx.runQuery(internal.members.getByUserId, {
      userId: userInfo._id,
    });

    return {
      ...userInfo,
      member: membershipInfo,
    };
  },
});
