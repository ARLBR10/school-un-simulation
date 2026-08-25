import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import {
  detectBrowser,
  detectBrowserVersion,
  detectDevice,
  detectDeviceType,
  detectOS,
} from "@posthog/core";
import { auditLog } from "better-auth-audit-logs";
import { betterAuth } from "better-auth/minimal";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import authConfig from "./auth.config";
import { getPostHog } from "./posthog";

import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import type { AuditLogEntry } from "better-auth-audit-logs";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";

const siteUrl = process.env.SITE_URL!;
const studentEmailDomains =
  process.env.ALLOWED_DOMAIN?.split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean) ?? [];

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        const email = user.email.trim().toLowerCase();

        if (
          !studentEmailDomains.some((domain) => email.endsWith(`@${domain}`))
        ) {
          return;
        }

        await ctx.runMutation(
          internal.members.assignStudentMembershipFromEmail,
          {
            userId: user._id,
            email,
            name: user.name,
          },
        );
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
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
  memberships: Array<{
    member: Doc<"members">;
    event: Doc<"events"> | null;
  }>;
};

export const ensureStudentMembership = mutation({
  args: {},
  returns: v.union(
    v.literal("ready"),
    v.literal("ineligible"),
    v.literal("unavailable"),
    v.literal("error"),
  ),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const email = user.email.trim().toLowerCase();
    const posthog = getPostHog();

    const captureOutcome = async (
      outcome: "ready" | "ineligible" | "unavailable" | "error",
    ) => {
      try {
        await posthog.capture(ctx, {
          event: "student_membership_reconciliation",
          distinctId: user._id,
          properties: {
            outcome,
            allowed_domain_configured: studentEmailDomains.length > 0,
          },
        });
      } catch (error) {
        console.error(
          "Failed to capture student membership reconciliation in PostHog",
          error,
        );
      }
    };

    if (!studentEmailDomains.some((domain) => email.endsWith(`@${domain}`))) {
      await captureOutcome("ineligible");
      return "ineligible" as const;
    }

    try {
      await ctx.runMutation(internal.members.assignStudentMembershipFromEmail, {
        userId: user._id,
        email,
        name: user.name,
      });

      const membershipInfo = await ctx.runQuery(internal.members.getByUserId, {
        userId: user._id,
      });
      const outcome = membershipInfo.member ? "ready" : "unavailable";

      await captureOutcome(outcome);
      return outcome;
    } catch (error) {
      console.error("Failed to reconcile student membership", error);
      try {
        await posthog.captureException(ctx, {
          error,
          distinctId: user._id,
          additionalProperties: {
            module: "student_membership",
            operation: "reconcile",
          },
        });
      } catch (telemetryError) {
        console.error(
          "Failed to capture student membership exception in PostHog",
          telemetryError,
        );
      }

      return "error" as const;
    }
  },
});

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
      member: membershipInfo.member,
      memberships: membershipInfo.memberships,
    };
  },
});
