import { v } from "convex/values";

import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth, type AuthUser } from "./auth";

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
      return null;
    }

    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const authContext = await auth.$context;

    const { id: userCreatedId } = await authContext.internalAdapter.createUser({
      updatedAt: new Date(),
      name: args.name,
      email: args.email,
      username: args.username,
      cellphone: args.cellphone,
    });
    await authContext.internalAdapter.createAccount({
      accountId: userCreatedId,
      userId: userCreatedId,
      providerId: "credential",
      createdAt: new Date(),
      password: await authContext.password.hash(args.password),
    });
    return true;
  },
});

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
      return null;
    }

    // Auth Interface
    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const authContext = await auth.$context;


    await Promise.all([
      authContext.internalAdapter.deleteUser(args.id),
      authContext.internalAdapter.deleteAccount(
        (await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "account",
          where: [
            {
              field: "userId",
              value: args.id,
            },
          ],
        }))._id,
      ),
    ]);
    return true;
  },
});
