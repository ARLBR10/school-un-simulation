"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, User } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { EventBadges } from "@/components/events/EventBadges";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { NewsListItem } from "@/convex/news";

const SKELETON_ROW_COUNT = 6;

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function groupPastNews(items: NewsListItem[]) {
  const groups = new Map<string, NewsListItem[]>();
  for (const item of items) {
    const eventName = item.eventName ?? "Evento anterior";
    groups.set(eventName, [...(groups.get(eventName) ?? []), item]);
  }
  return groups;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function NewsView() {
  const news = useQuery(api.news.list);
  const isLoading = news === undefined;
  const currentNews = news?.filter((item) => !item.isPastEvent) ?? [];
  const pastNewsByEvent = groupPastNews(
    news?.filter((item) => item.isPastEvent) ?? [],
  );

  return (
    <PageShell className="mx-auto w-full max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <PageHeader
          title="Notícias"
          description="Acompanhe as últimas notícias e comunicados da simulação."
        />
      </motion.header>

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
            aria-busy="true"
          >
            <ListSkeleton />
          </motion.div>
        ) : news === null ? (
          <motion.div
            key="forbidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ForbiddenState />
          </motion.div>
        ) : news.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {currentNews.map((item) => (
              <NewsCardMotion key={item._id} item={item} />
            ))}
            {pastNewsByEvent.size > 0 ? (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle>Eventos passados</CardTitle>
                    <CardDescription>
                      Consulte as notícias preservadas de edições anteriores.
                    </CardDescription>
                  </CardHeader>
                  <Accordion className="border-t px-4">
                    {[...pastNewsByEvent.entries()].map(([eventName, items]) => (
                      <AccordionItem key={eventName} value={eventName}>
                        <AccordionTrigger>
                          <span>{eventName}</span>
                          <span className="ml-auto mr-3 text-xs text-muted-foreground">
                            {items.length} {items.length === 1 ? "notícia" : "notícias"}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-3 pt-2">
                          {items.map((item) => (
                            <NewsCard
                              key={item._id}
                              id={item._id}
                              title={item.title}
                              authorName={item.authorName}
                              createdAt={item._creationTime}
                              eventName={item.eventName}
                              isPastEvent={item.isPastEvent}
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function NewsCardMotion({
  item,
}: {
  item: NewsListItem;
}) {
  return (
    <motion.div variants={itemVariants}>
      <NewsCard
        id={item._id}
        title={item.title}
        authorName={item.authorName}
        createdAt={item._creationTime}
        eventName={item.eventName}
        isPastEvent={item.isPastEvent}
      />
    </motion.div>
  );
}

function NewsCard({
  id,
  title,
  authorName,
  createdAt,
  eventName,
  isPastEvent,
}: {
  id: string;
  title: string;
  authorName: string | null;
  createdAt: number;
  eventName: string | null;
  isPastEvent: boolean;
}) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <Link
        to="/news/$id"
        params={{ id }}
        className="group flex items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="flex-1 px-0">
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="line-clamp-2">{title}</span>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </CardTitle>
          <CardDescription className="flex items-center gap-3">
            <span>{formatDate(createdAt)}</span>
            {authorName ? (
              <>
                <span aria-hidden="true" className="text-border">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <User aria-hidden="true" className="size-3.5" />
                  {authorName}
                </span>
              </>
            ) : null}
          </CardDescription>
          <EventBadges eventName={eventName} isPastEvent={isPastEvent} />
        </CardHeader>
      </Link>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  );
}

function RowSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
    </Card>
  );
}

function ForbiddenState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Acesso restrito a membros da simulação.</CardTitle>
        <CardDescription>
          Entre em contato com a coordenação para vincular sua conta.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Nenhuma notícia publicada.</CardTitle>
        <CardDescription>
          Volte mais tarde para acompanhar as últimas atualizações da simulação.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
