import rehypeRaw from "rehype-raw";
import rehypeRemark from "rehype-remark";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { parseMarkdownIntoBlocks } from "streamdown";
import { unified } from "unified";
import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getPostHog } from "./posthog";
import {
  getOperationalEventId,
  isEventInOperationalScope,
  resolveEventId,
} from "./events";

type NewsPatch = Partial<Omit<Doc<"news">, "_id" | "_creationTime">>;
type NewsApprovalStatus = "pending" | "approved" | "denied";

const newsBodyProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize)
  .use(rehypeRemark)
  .use(remarkStringify, {
    bullet: "-",
    fences: true,
    listItemIndent: "one",
  });

async function sanitizeNewsMarkdown(markdown: string) {
  const parsedMarkdown = parseMarkdownIntoBlocks(markdown).join("\n\n").trim();

  if (!parsedMarkdown) {
    return "";
  }

  const sanitizedMarkdown = await newsBodyProcessor.process(parsedMarkdown);

  return String(sanitizedMarkdown).trim();
}

export type NewsListItem = {
  _id: Doc<"news">["_id"];
  _creationTime: number;
  title: string;
  authorName: string | null;
  eventName: string | null;
  isPastEvent: boolean;
};

export type NewsDetail = Doc<"news"> & {
  authorName: string | null;
  committeeNames: string[];
  eventName: string | null;
  isPastEvent: boolean;
};

export type NewsManageItem = NewsDetail;

function canSeeAllNews(member: Doc<"members">) {
  return member.type === "admin" || isPressApprover(member);
}

function canManageNews(member: Doc<"members">) {
  return member.type === "admin" || member.type === "press";
}

function isPressApprover(member: Doc<"members">) {
  return member.type === "admin" || member.pressRole === "media";
}

function isPublishedNews(news: Doc<"news">) {
  return news.approvalStatus === undefined || news.approvalStatus === "approved";
}

function getApprovalStatus(news: Doc<"news">): NewsApprovalStatus {
  return news.approvalStatus ?? "approved";
}

function getNewsAuditEventName(
  member: Doc<"members">,
  action: "create" | "update" | "delete",
) {
  return `${member.type}_${action}_news`;
}

function serializeNewsAuditValue(value: unknown) {
  return value === undefined ? null : value;
}

function getNewsAuditSnapshot(news: Doc<"news">) {
  return {
    id: news._id,
    createdAt: news._creationTime,
    title: news.title,
    body: news.body,
    author: news.author ?? null,
    committee: news.committee ?? null,
    approvalStatus: getApprovalStatus(news),
    reviewedBy: news.reviewedBy ?? null,
    reviewedAt: news.reviewedAt ?? null,
    denialReason: news.denialReason ?? null,
    eventId: news.eventId ?? null,
  };
}

async function getNewsEvent(
  ctx: Pick<import("./_generated/server").QueryCtx, "db">,
  news: Doc<"news">,
) {
  return news.eventId
    ? await ctx.db.get("events", news.eventId)
    : await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", "school-onu-2026"))
        .first();
}

async function resolveNewsEventId(
  ctx: import("./_generated/server").MutationCtx,
  args: {
    eventId?: Id<"events">;
    author?: Id<"members">;
    committee?: Id<"committees">[];
  },
) {
  const referencedEventIds = new Set<Id<"events">>();
  if (args.author) {
    const author = await ctx.db.get("members", args.author);
    if (author?.eventId) referencedEventIds.add(author.eventId);
  }
  for (const committeeId of args.committee ?? []) {
    const committee = await ctx.db.get("committees", committeeId);
    if (committee?.eventId) referencedEventIds.add(committee.eventId);
  }
  if (args.eventId) referencedEventIds.add(args.eventId);
  if (referencedEventIds.size > 1) {
    throw new Error("Autor e comitês da notícia precisam pertencer ao mesmo evento.");
  }

  return await resolveEventId(ctx, referencedEventIds.values().next().value);
}

function getNewsAuditChanges(news: Doc<"news">, patch: NewsPatch) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const [field, nextValue] of Object.entries(patch)) {
    const currentValue = news[field as keyof NewsPatch];

    if (JSON.stringify(currentValue ?? null) === JSON.stringify(nextValue ?? null)) {
      continue;
    }

    changes[field] = {
      before: serializeNewsAuditValue(currentValue),
      after: serializeNewsAuditValue(nextValue),
    };
  }

  return changes;
}

function canSeeNews(news: Doc<"news">, member: Doc<"members">) {
  if (canSeeAllNews(member)) {
    return true;
  }

  if (!isPublishedNews(news)) {
    return news.author === member._id;
  }

  return true;
}

export const list = query({
  args: {},
  async handler(ctx): Promise<NewsListItem[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    const member = userInfo?.member;
    if (!member) {
      return null;
    }

    const news = await ctx.db.query("news").order("desc").take(999);
    const visibleNews = news.filter(
      (newsItem) => isPublishedNews(newsItem) && canSeeNews(newsItem, member),
    );

    const authorIds = [
      ...new Set(visibleNews.map((n) => n.author).filter(Boolean)),
    ] as Id<"members">[];

    const authorsById = new Map<Id<"members">, string>();
    for (const authorId of authorIds) {
      const author = await ctx.db.get("members", authorId);
      if (author) {
        authorsById.set(author._id, author.name);
      }
    }

    return await Promise.all(visibleNews.map(async (n) => {
      const event = await getNewsEvent(ctx, n);
      return {
        _id: n._id,
        _creationTime: n._creationTime,
        title: n.title,
        authorName: n.author ? (authorsById.get(n.author) ?? null) : null,
        eventName: event?.name ?? null,
        isPastEvent: event?.status === "past",
      };
    }));
  },
});

export const getById = query({
  args: {
    id: v.string(),
  },
  async handler(ctx, args): Promise<NewsDetail | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    const member = userInfo?.member;
    if (!member) {
      return null;
    }

    const newsId = ctx.db.normalizeId("news", args.id);
    if (!newsId) {
      return null;
    }

    const news = await ctx.db.get("news", newsId);
    if (!news) {
      return null;
    }

    if (!isPublishedNews(news) || !canSeeNews(news, member)) {
      return null;
    }

    let authorName: string | null = null;
    if (news.author) {
      const author = await ctx.db.get("members", news.author);
      authorName = author?.name ?? null;
    }

    const committeeNames: string[] = [];
    if (news.committee) {
      for (const committeeId of news.committee) {
        const committee = await ctx.db.get("committees", committeeId);
        if (committee) {
          committeeNames.push(committee.theme);
        }
      }
    }

    const event = await getNewsEvent(ctx, news);
    return {
      ...news,
      authorName,
      committeeNames,
      eventName: event?.name ?? null,
      isPastEvent: event?.status === "past",
    };
  },
});

export const getAll = query({
  args: {},
  async handler(ctx): Promise<Doc<"news">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      return null;
    }

    return await ctx.db.query("news").order("desc").take(999);
  },
});

export const getManageList = query({
  args: {},
  async handler(ctx): Promise<NewsManageItem[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !canManageNews(userInfo.member)) {
      return null;
    }

    const member = userInfo.member;
    const operationalEventId = await getOperationalEventId(ctx, member);
    if (!operationalEventId) return null;
    const candidateNews = isPressApprover(member)
      ? await ctx.db.query("news").order("desc").take(999)
      : await ctx.db
          .query("news")
          .withIndex("by_author", (q) => q.eq("author", member._id))
          .order("desc")
          .take(999);
    const news: Doc<"news">[] = [];
    for (const newsItem of candidateNews) {
      if (
        await isEventInOperationalScope(
          ctx,
          newsItem.eventId,
          operationalEventId,
        )
      ) {
        news.push(newsItem);
      }
    }
    const authorIds = [...new Set(news.map((n) => n.author).filter(Boolean))] as Id<"members">[];
    const committeeIds = [
      ...new Set(news.flatMap((n) => n.committee ?? [])),
    ] as Id<"committees">[];

    const authorsById = new Map<Id<"members">, string>();
    for (const authorId of authorIds) {
      const author = await ctx.db.get("members", authorId);
      if (author) {
        authorsById.set(author._id, author.name);
      }
    }

    const committeesById = new Map<Id<"committees">, string>();
    for (const committeeId of committeeIds) {
      const committee = await ctx.db.get("committees", committeeId);
      if (committee) {
        committeesById.set(committee._id, committee.theme);
      }
    }

    return await Promise.all(news.map(async (newsItem) => {
      const event = await getNewsEvent(ctx, newsItem);
      return {
        ...newsItem,
        authorName: newsItem.author
          ? (authorsById.get(newsItem.author) ?? null)
          : null,
        committeeNames: (newsItem.committee ?? [])
          .map((committeeId) => committeesById.get(committeeId))
          .filter((name): name is string => Boolean(name)),
        eventName: event?.name ?? null,
        isPastEvent: event?.status === "past",
      };
    }));
  },
});

export const getPendingApprovalSummary = query({
  args: {},
  async handler(ctx): Promise<{
    count: number;
    latest: Pick<Doc<"news">, "_id" | "_creationTime" | "title"> | null;
  } | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !isPressApprover(userInfo.member)) {
      return null;
    }

    const pendingNews = await ctx.db
      .query("news")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .take(50);
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (!operationalEventId) return null;
    const scopedPendingNews: Doc<"news">[] = [];
    for (const newsItem of pendingNews) {
      if (
        await isEventInOperationalScope(
          ctx,
          newsItem.eventId,
          operationalEventId,
        )
      ) {
        scopedPendingNews.push(newsItem);
      }
    }

    const latest = scopedPendingNews[0] ?? null;

    return {
      count: scopedPendingNews.length,
      latest: latest
        ? {
            _id: latest._id,
            _creationTime: latest._creationTime,
            title: latest.title,
          }
        : null,
    };
  },
});

export const create = mutation({
  args: {
    author: v.optional(v.union(v.id("members"), v.null())),
    committee: v.optional(v.array(v.id("committees"))),
    title: v.string(),
    body: v.string(),
    eventId: v.optional(v.id("events")),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !canManageNews(userInfo.member)) {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.create",
          user_type_required: "admin_or_press",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const sanitizedBody = await sanitizeNewsMarkdown(args.body);

    if (!sanitizedBody) {
      throw new Error("News body cannot be empty after sanitization.");
    }

    const author =
      "author" in args
        ? (args.author ?? undefined)
        : userInfo.member.type === "press"
          ? userInfo.member._id
          : undefined;
    if (
      userInfo.member.type === "press" &&
      !isPressApprover(userInfo.member) &&
      author !== userInfo.member._id
    ) {
      return null;
    }

    const approvalStatus = isPressApprover(userInfo.member) ? "approved" : "pending";
    const reviewedBy = approvalStatus === "approved" ? userInfo.member._id : undefined;
    const reviewedAt = approvalStatus === "approved" ? Date.now() : undefined;

    const eventId = await resolveNewsEventId(ctx, {
      eventId: args.eventId,
      author,
      committee: args.committee,
    });
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (
      !operationalEventId ||
      !(await isEventInOperationalScope(ctx, eventId, operationalEventId))
    ) {
      throw new Error("A notícia precisa pertencer ao evento atual.");
    }

    const newNews: Omit<Doc<"news">, "_id" | "_creationTime"> = {
      title: args.title,
      body: sanitizedBody,
      approvalStatus,
      ...(reviewedBy !== undefined ? { reviewedBy } : {}),
      ...(reviewedAt !== undefined ? { reviewedAt } : {}),
      ...(author !== undefined ? { author } : {}),
      ...(args.committee !== undefined && args.committee.length > 0
        ? { committee: args.committee }
        : {}),
      eventId,
    };
    const newsId = await ctx.db.insert("news", newNews);
    const createdNews = await ctx.db.get("news", newsId);

    await getPostHog().capture(ctx, {
      event: getNewsAuditEventName(userInfo.member, "create"),
      properties: {
        mutation: "news.create",
        actorMemberType: userInfo.member.type,
        newsId,
        after: createdNews
          ? getNewsAuditSnapshot(createdNews)
          : {
              id: newsId,
              createdAt: null,
              title: newNews.title,
              body: newNews.body,
              author: newNews.author ?? null,
              committee: newNews.committee ?? null,
            },
        changedFields: Object.keys(newNews),
        changes: Object.fromEntries(
          Object.entries(newNews).map(([field, value]) => [
            field,
            { before: null, after: serializeNewsAuditValue(value) },
          ]),
        ),
      },
    });

    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("news"),
    author: v.optional(v.union(v.id("members"), v.null())),
    committee: v.optional(v.array(v.id("committees"))),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    approvalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    ),
    eventId: v.optional(v.id("events")),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !canManageNews(userInfo.member)) {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.update",
          user_type_required: "admin_or_press",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const existingNews = await ctx.db.get("news", args.id);
    if (!existingNews) {
      return null;
    }
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (
      !operationalEventId ||
      !(await isEventInOperationalScope(
        ctx,
        existingNews.eventId,
        operationalEventId,
      ))
    ) {
      return null;
    }

    if (!isPressApprover(userInfo.member) && existingNews.author !== userInfo.member._id) {
      return null;
    }

    const sanitizedBody =
      "body" in args && args.body !== undefined
        ? await sanitizeNewsMarkdown(args.body)
        : undefined;

    if ("body" in args && !sanitizedBody) {
      throw new Error("News body cannot be empty after sanitization.");
    }

    const newsPatch: NewsPatch = {};

    if ("title" in args && args.title !== undefined) {
      newsPatch.title = args.title;
    }

    if ("body" in args && sanitizedBody !== undefined) {
      newsPatch.body = sanitizedBody;
    }

    if (userInfo.member.type === "admin" && "author" in args) {
      newsPatch.author = args.author ?? undefined;
    }

    if ("committee" in args) {
      const committee = args.committee ?? [];
      newsPatch.committee = committee.length > 0 ? committee : undefined;
    }

    if (
      args.eventId !== undefined ||
      "author" in args ||
      "committee" in args
    ) {
      newsPatch.eventId = await resolveNewsEventId(ctx, {
        eventId: args.eventId ?? existingNews.eventId,
        author: newsPatch.author ?? existingNews.author,
        committee: newsPatch.committee ?? existingNews.committee,
      });
    }

    if (isPressApprover(userInfo.member) && "approvalStatus" in args) {
      newsPatch.approvalStatus = args.approvalStatus;
      newsPatch.reviewedBy =
        args.approvalStatus === "pending" ? undefined : userInfo.member._id;
      newsPatch.reviewedAt =
        args.approvalStatus === "pending" ? undefined : Date.now();
      newsPatch.denialReason = undefined;
    }

    if (!isPressApprover(userInfo.member)) {
      newsPatch.approvalStatus = "pending";
      newsPatch.reviewedBy = undefined;
      newsPatch.reviewedAt = undefined;
      newsPatch.denialReason = undefined;
    }

    const changes = getNewsAuditChanges(existingNews, newsPatch);

    await ctx.db.patch("news", args.id, newsPatch);
    await getPostHog().capture(ctx, {
      event: getNewsAuditEventName(userInfo.member, "update"),
      properties: {
        mutation: "news.update",
        actorMemberType: userInfo.member.type,
        newsId: args.id,
        before: getNewsAuditSnapshot(existingNews),
        after: {
          ...getNewsAuditSnapshot(existingNews),
          ...Object.fromEntries(
            Object.entries(newsPatch).map(([field, value]) => [
              field,
              serializeNewsAuditValue(value),
            ]),
          ),
        },
        changedFields: Object.keys(changes),
        changes,
      },
    });

    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.id("news"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !canManageNews(userInfo.member)) {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.purge",
          user_type_required: "admin_or_press",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const existingNews = await ctx.db.get("news", args.id);
    if (!existingNews) {
      return null;
    }
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (
      !operationalEventId ||
      !(await isEventInOperationalScope(
        ctx,
        existingNews.eventId,
        operationalEventId,
      ))
    ) {
      return null;
    }

    if (!isPressApprover(userInfo.member) && existingNews.author !== userInfo.member._id) {
      return null;
    }

    await ctx.db.delete("news", args.id);
    await getPostHog().capture(ctx, {
      event: getNewsAuditEventName(userInfo.member, "delete"),
      properties: {
        mutation: "news.purge",
        actorMemberType: userInfo.member.type,
        newsId: args.id,
        before: getNewsAuditSnapshot(existingNews),
        after: null,
        changedFields: ["title", "body", "author", "committee"],
        changes: Object.fromEntries(
          Object.entries(getNewsAuditSnapshot(existingNews))
            .filter(([field]) => field !== "id" && field !== "createdAt")
            .map(([field, value]) => [field, { before: value, after: null }]),
        ),
      },
    });

    return true;
  },
});

export const approve = mutation({
  args: {
    id: v.id("news"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !isPressApprover(userInfo.member)) {
      return null;
    }

    const existingNews = await ctx.db.get("news", args.id);
    if (!existingNews) {
      return null;
    }
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (
      !operationalEventId ||
      !(await isEventInOperationalScope(
        ctx,
        existingNews.eventId,
        operationalEventId,
      ))
    ) {
      return null;
    }

    await ctx.db.patch("news", args.id, {
      approvalStatus: "approved",
      reviewedBy: userInfo.member._id,
      reviewedAt: Date.now(),
      denialReason: undefined,
    });

    return true;
  },
});

export const deny = mutation({
  args: {
    id: v.id("news"),
    reason: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || !isPressApprover(userInfo.member)) {
      return null;
    }

    const existingNews = await ctx.db.get("news", args.id);
    if (!existingNews) {
      return null;
    }
    const operationalEventId = await getOperationalEventId(ctx, userInfo.member);
    if (
      !operationalEventId ||
      !(await isEventInOperationalScope(
        ctx,
        existingNews.eventId,
        operationalEventId,
      ))
    ) {
      return null;
    }

    const denialReason = args.reason?.trim();

    await ctx.db.patch("news", args.id, {
      approvalStatus: "denied",
      reviewedBy: userInfo.member._id,
      reviewedAt: Date.now(),
      denialReason: denialReason || undefined,
    });

    return true;
  },
});
