import { v } from "convex/values";

import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth, type AuthUser } from "./auth";
import { getPostHog } from "./posthog";

export const getAll = query({
  async handler(ctx): Promise<AuthUser[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      return null;
    }

    return (
      await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 999,
        },
      })
    ).page;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    username: v.optional(v.string()),
    cellphone: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "auth_admin.create",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const authContext = await auth.$context;

    const { id: createdUserId } = await authContext.internalAdapter.createUser({
      updatedAt: new Date(),
      name: args.name,
      email: args.email,
      username: args.username,
      cellphone: args.cellphone,
    });
    const { id: createdAccountId } =
      await authContext.internalAdapter.createAccount({
        accountId: createdUserId,
        userId: createdUserId,
        providerId: "credential",
        createdAt: new Date(),
        password: await authContext.password.hash(args.password),
      });

    await getPostHog().capture(ctx, {
      event: "admin_create_user",
      properties: {
        userId: createdUserId,
        accountId: createdAccountId,
        createdUserInfo: {
          name: args.name,
          email: args.email,
          username: args.username,
          cellphone: args.cellphone,
          // No password here. Otherwise it wouldn't be a secret...
        },
      },
    });
    return true;
  },
});

export const edit = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    password: v.optional(v.string()),
    twoFactorEnabled: v.optional(v.boolean()),
    username: v.optional(v.string()),
    cellphone: v.optional(v.string()),
    cellphoneVerified: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "auth_admin.edit",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    // Auth Interface
    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const authContext = await auth.$context;

    await Promise.all([
      authContext.internalAdapter.updateUser(args.id, {
        updatedAt: new Date(),
        name: args.name,
        email: args.email,
        emailVerified: args.emailVerified,
        twoFactorEnabled: args.twoFactorEnabled,
        username: args.username,
        cellphone: args.cellphone,
        cellphoneVerified: args.cellphoneVerified,
      }),
      args.password && args.password !== ""
        ? await authContext.internalAdapter.updatePassword(
            args.id,
            await authContext.password.hash(args.password),
          )
        : null,
    ]);

    // Logs need to only be executed on a successful mutation.
    await getPostHog().capture(ctx, {
      event: "admin_edit_user",
      properties: {
        userId: args.id,
        dataUpdated: {
          name: args.name,
          email: args.email,
          emailVerified: args.emailVerified,
          passwordUpdated: args.password && args.password !== "" ? true : false,
          twoFactorEnabled: args.twoFactorEnabled,
          username: args.username,
          cellphone: args.cellphone,
          cellphoneVerified: args.cellphoneVerified,
        },
      },
    });
    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.string(),
  },
  async handler(ctx, args) {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "auth_admin.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    // Auth Interface
    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const authContext = await auth.$context;

    const accountId = (
      await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "account",
        where: [
          {
            field: "userId",
            value: args.id,
          },
        ],
      })
    )._id;

    await Promise.all([
      authContext.internalAdapter.deleteUser(args.id),
      authContext.internalAdapter.deleteAccount(accountId),
    ]);
    await getPostHog().capture(ctx, {
      event: "admin_delete_user",
      properties: {
        userId: args.id,
        accountId
      },
    });
    return true;
  },
});
