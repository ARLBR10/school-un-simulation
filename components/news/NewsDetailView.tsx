"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Globe, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Streamdown } from "streamdown";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const sectionVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const blockVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function NewsDetailView({ id }: { id: string }) {
  const news = useQuery(api.news.getById, { id });

  return (
    <PageShell className="mx-auto w-full max-w-5xl">
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link
          to="/news"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4"
        >
          <ArrowLeft />
          Todas as notícias
        </Link>
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {news === undefined ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
            aria-busy="true"
          >
            <DetailSkeleton />
          </motion.div>
        ) : news === null ? (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <NotFoundState />
          </motion.div>
        ) : (
          <motion.article
            key="content"
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            <motion.header variants={blockVariants}>
              <PageHeader title={news.title} />
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  {formatDate(news._creationTime)}
                </span>
                {news.authorName ? (
                  <>
                    <span aria-hidden="true" className="text-border">|</span>
                    <span className="inline-flex items-center gap-1.5">
                      <User aria-hidden="true" className="size-3.5" />
                      {news.authorName}
                    </span>
                  </>
                ) : null}
              </div>
              {news.committeeNames.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Globe
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground"
                  />
                  {news.committeeNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </motion.header>

            <motion.div variants={blockVariants}>
              <Card>
                <CardContent className="prose prose-neutral dark:prose-invert max-w-none pt-6">
                  <Streamdown mode="static" linkSafety={{ enabled: false }}>
                    {news.body}
                  </Streamdown>
                </CardContent>
              </Card>
            </motion.div>
          </motion.article>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/6" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotFoundState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Notícia indisponível.</CardTitle>
        <CardDescription>
          Pode não existir ou você não possui acesso. Verifique sua vinculação
          como membro da simulação.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
