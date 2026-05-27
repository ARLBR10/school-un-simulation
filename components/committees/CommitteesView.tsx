"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const SKELETON_ROW_COUNT = 4;

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

export function CommitteesView() {
  const committees = useQuery(api.committees.list);
  const isLoading = committees === undefined;

  return (
    <PageShell className="mx-auto w-full max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <PageHeader
          title="Comitês"
          description="Conheça os comitês da simulação, seus temas e tópicos em debate."
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
        ) : committees === null ? (
          <motion.div
            key="forbidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ForbiddenState />
          </motion.div>
        ) : committees.length === 0 ? (
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
            className="grid gap-4 md:grid-cols-2"
          >
            {committees.map((committee) => (
              <motion.div key={committee._id} variants={itemVariants}>
                <CommitteeCard
                  id={committee._id}
                  theme={committee.theme}
                  description={committee.description}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function CommitteeCard({
  id,
  theme,
  description,
}: {
  id: string;
  theme: string;
  description: string;
}) {
  return (
    <Card className="h-full transition-colors hover:bg-muted/30">
      <Link
        to="/committees/$id"
        params={{ id }}
        className="group flex h-full flex-col gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="px-0">
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{theme}</span>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </CardTitle>
          <CardDescription className="line-clamp-3 whitespace-pre-line leading-6">
            {description}
          </CardDescription>
        </CardHeader>
      </Link>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
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
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
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
        <CardTitle>Nenhum comitê instalado.</CardTitle>
        <CardDescription>
          Volte mais tarde para acompanhar as próximas convocações.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
