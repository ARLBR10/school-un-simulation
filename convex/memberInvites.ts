import { v } from "convex/values";

import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getPostHog } from "./posthog";

import type { Doc } from "./_generated/dataModel";

const inviteDurationMs = 15 * 60 * 1000;

type MemberInviteWithMember = Doc<"memberInvites"> & {
  memberInfo: Doc<"members"> | null;
};

type InvitePreview = {
  invite: Doc<"memberInvites">;
  member: Doc<"members">;
  status: "valid" | "expired" | "assigned";
};

export const getAllForAdmin = query({
  args: {},
  async handler(ctx): Promise<MemberInviteWithMember[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      return null;
    }

    const invites = await ctx.db.query("memberInvites").take(999);
    const invitesWithMembers: MemberInviteWithMember[] = [];

    for (const invite of invites) {
      invitesWithMembers.push({
        ...invite,
        memberInfo: await ctx.db.get("members", invite.member),
      });
    }

    return invitesWithMembers;
  },
});

export const createForMember = mutation({
  args: {
    member: v.id("members"),
  },
  async handler(ctx, args): Promise<Doc<"memberInvites"> | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "memberInvites.createForMember",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const member = await ctx.db.get("members", args.member);

    if (!member) {
      throw new Error("Membro não encontrado.");
    }

    if (member.userId) {
      throw new Error("Este membro já está vinculado a uma conta.");
    }

    const existingInvite = await ctx.db
      .query("memberInvites")
      .withIndex("by_member", (q) => q.eq("member", args.member))
      .unique();

    if (existingInvite) {
      return existingInvite;
    }

    const inviteId = await ctx.db.insert("memberInvites", {
      member: args.member,
      token: crypto.randomUUID(),
      expiresAt: Date.now() + inviteDurationMs,
      createdBy: userInfo._id,
    });

    await getPostHog().capture(ctx, {
      event: "admin_create_member_invite",
      properties: {
        inviteId,
        memberId: args.member,
      },
    });

    return await ctx.db.get("memberInvites", inviteId);
  },
});

export const deleteForMember = mutation({
  args: {
    member: v.id("members"),
  },
  async handler(ctx, args): Promise<boolean | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "memberInvites.deleteForMember",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const invite = await ctx.db
      .query("memberInvites")
      .withIndex("by_member", (q) => q.eq("member", args.member))
      .unique();

    if (!invite) {
      return false;
    }

    await ctx.db.delete("memberInvites", invite._id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_member_invite",
      properties: {
        inviteId: invite._id,
        memberId: args.member,
      },
    });

    return true;
  },
});

export const preview = query({
  args: {
    token: v.string(),
  },
  async handler(ctx, args): Promise<InvitePreview | null> {
    const invite = await ctx.db
      .query("memberInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      return null;
    }

    const member = await ctx.db.get("members", invite.member);

    if (!member) {
      return null;
    }

    return {
      invite,
      member,
      status: member.userId
        ? "assigned"
        : invite.expiresAt <= Date.now()
          ? "expired"
          : "valid",
    };
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
  },
  async handler(
    ctx,
    args,
  ): Promise<"accepted" | "expired" | "invalid" | "already_assigned" | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo) {
      return null;
    }

    if (userInfo.member) {
      return "already_assigned";
    }

    const invite = await ctx.db
      .query("memberInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      return "invalid";
    }

    if (invite.expiresAt <= Date.now()) {
      return "expired";
    }

    const member = await ctx.db.get("members", invite.member);

    if (!member || member.userId) {
      return "already_assigned";
    }

    await ctx.db.patch("members", member._id, {
      userId: userInfo._id,
    });
    await ctx.db.delete("memberInvites", invite._id);

    await getPostHog().capture(ctx, {
      event: "member_accept_invite",
      properties: {
        memberId: member._id,
        userId: userInfo._id,
      },
    });

    return "accepted";
  },
});
