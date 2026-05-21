import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { isRunMutationCtx } from "@convex-dev/better-auth/utils";
import {
  detectBrowser,
  detectBrowserVersion,
  detectDevice,
  detectDeviceType,
  detectOS,
} from "@posthog/core";
import { createAuthMiddleware } from "better-auth/api";
import { auditLog } from "better-auth-audit-logs";
import { betterAuth } from "better-auth/minimal";

import { components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { getPostHog } from "./posthog";

import type { GenericCtx } from "@convex-dev/better-auth";
import type { AuditLogEntry } from "better-auth-audit-logs";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";

const siteUrl = process.env.SITE_URL!;
const studentEmailDomains = process.env.ALLOWED_DOMAIN?.split(",") ?? [];

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    hooks: {
      after: createAuthMiddleware(async (hookCtx) => {
        const newSession = hookCtx.context.newSession;
        const email = newSession?.user.email.trim().toLowerCase();

        if (
          !newSession ||
          !email ||
          !studentEmailDomains.some((domain) => email.endsWith(`@${domain}`))
        ) {
          return;
        }

        if (!isRunMutationCtx(ctx)) {
          hookCtx.context.logger.warn(
            "Skipping student membership assignment outside a Convex mutation/action context.",
          );
          return;
        }

        try {
          await ctx.runMutation(
            internal.members.assignStudentMembershipFromEmail,
            {
              userId: newSession.session.userId,
              email,
            },
          );
        } catch (error) {
          hookCtx.context.logger.error(
            "Failed to assign student membership after auth session creation.",
            error,
          );
        }
      }),
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            }
          : undefined,
    },
    plugins: [
      convex({ authConfig }),
      auditLog({
        capture: {
          ipAddress: true,
          userAgent: true,
        },
        piiRedaction: { enabled: true, strategy: "hash" },
        storage: {
          write: async (entry: AuditLogEntry) => {
            if (!entry.userId) {
              return;
            }

            const posthog = getPostHog();

            let userAgentInfo;
            if (entry.userAgent) {
              const [os_name, os_version] = detectOS(entry.userAgent);
              userAgentInfo = {
                $browser: detectBrowser(entry.userAgent, undefined),
                $browser_version: detectBrowserVersion(
                  entry.userAgent,
                  undefined,
                ),
                $os: os_name,
                $os_version: os_version,
                $device: detectDevice(entry.userAgent),
                $device_type: detectDeviceType(entry.userAgent),
                $raw_user_agent:
                  entry.userAgent.length > 1000
                    ? entry.userAgent.substring(0, 997) + "..."
                    : entry.userAgent,
              };
            }

            try {
              await posthog.capture(ctx as GenericActionCtx<DataModel>, {
                event: `auth:${entry.action}`,
                timestamp: entry.createdAt,
                distinctId: entry.userId,
                properties: {
                  $ip: entry.ipAddress,
                  $geoip_disable: false,
                  ...userAgentInfo,
                  status: entry.status,
                  severity: entry.severity,
                  ...entry.metadata,
                },
              });
            } catch (error) {
              console.error(
                "Failed to capture auth audit log in PostHog",
                error,
              );
              await posthog.captureException(
                ctx as GenericActionCtx<DataModel>,
                {
                  error,
                  distinctId: entry.userId,
                  additionalProperties: {
                    entry,
                  },
                },
              );
            }
          },
        },
      }),
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
