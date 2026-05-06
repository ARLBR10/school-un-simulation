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

type NewsPatch = Partial<Omit<Doc<"news">, "_id" | "_creationTime">>;

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
};

export type NewsDetail = Doc<"news"> & {
  authorName: string | null;
  committeeNames: string[];
};

function canSeeAllNews(member: Doc<"members">) {
  return member.type === "admin" || member.type === "press";
}

function canSeeNews(news: Doc<"news">, member: Doc<"members">) {
  if (canSeeAllNews(member)) {
    return true;
  }

  const committeeIds = news.committee ?? [];
  if (committeeIds.length === 0) {
    return true;
  }

  return member.committee ? committeeIds.includes(member.committee) : false;
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
    const visibleNews = canSeeAllNews(member)
      ? news
      : news.filter((newsItem) => canSeeNews(newsItem, member));

    const authorIds = [
      ...new Set(visibleNews.map((n) => n.author).filter(Boolean)),
    ] as Id<"members">[];

    const authorsById = new Map<Id<"members">, string>();
    for (const authorId of authorIds) {
      const author = await ctx.db.get(authorId);
      if (author) {
        authorsById.set(author._id, author.name);
      }
    }

    return visibleNews.map((n) => ({
      _id: n._id,
      _creationTime: n._creationTime,
      title: n.title,
      authorName: n.author ? (authorsById.get(n.author) ?? null) : null,
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

    const news = await ctx.db.get(newsId);
    if (!news) {
      return null;
    }

    if (!canSeeNews(news, member)) {
      return null;
    }

    let authorName: string | null = null;
    if (news.author) {
      const author = await ctx.db.get(news.author);
      authorName = author?.name ?? null;
    }

    const committeeNames: string[] = [];
    if (news.committee) {
      for (const committeeId of news.committee) {
        const committee = await ctx.db.get(committeeId);
        if (committee) {
          committeeNames.push(committee.theme);
        }
      }
    }

    return {
      ...news,
      authorName,
      committeeNames,
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

export const create = mutation({
  args: {
    author: v.optional(v.id("members")),
    committee: v.optional(v.array(v.id("committees"))),
    title: v.string(),
    body: v.string(),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.create",
          user_type_required: "admin",
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

    const newNews: Omit<Doc<"news">, "_id" | "_creationTime"> = {
      title: args.title,
      body: sanitizedBody,
      ...(args.author !== undefined ? { author: args.author } : {}),
      ...(args.committee !== undefined && args.committee.length > 0
        ? { committee: args.committee }
        : {}),
    };
    const newsId = await ctx.db.insert("news", newNews);

    await getPostHog().capture(ctx, {
      event: "admin_create_news",
      properties: {
        createdNewsId: newsId,
        createdNewsInfo: newNews,
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
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.update",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const sanitizedBody =
      "body" in args && args.body !== undefined
        ? await sanitizeNewsMarkdown(args.body)
        : undefined;

    if ("body" in args && !sanitizedBody) {
      throw new Error("News body cannot be empty after sanitization.");
    }

    const newsPatch: NewsPatch = {
      ...("title" in args ? { title: args.title } : {}),
      ...("body" in args ? { body: sanitizedBody } : {}),
    };

    if ("author" in args) {
      newsPatch.author = args.author ?? undefined;
    }

    if ("committee" in args) {
      const committee = args.committee ?? [];
      newsPatch.committee = committee.length > 0 ? committee : undefined;
    }

    await ctx.db.patch("news", args.id, newsPatch);
    await getPostHog().capture(ctx, {
      event: "admin_update_news",
      properties: {
        id: args.id,
        dataReceived: args,
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

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "news.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    await ctx.db.delete("news", args.id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_news",
      properties: {
        id: args.id,
      },
    });

    return true;
  },
});
