"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import {
  TypographyH1,
  TypographyLead,
  TypographyMuted,
} from "@/components/ui/typography";
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
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 md:py-16">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        <TypographyH1>Comitês</TypographyH1>
        <TypographyLead>
          Conheça os comitês da simulação, seus temas e tópicos em debate.
        </TypographyLead>
      </motion.header>

      <div className="mt-12">
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
            <motion.ul
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
            >
              {committees.map((committee) => (
                <motion.li key={committee._id} variants={itemVariants}>
                  <CommitteeRow
                    id={committee._id}
                    theme={committee.theme}
                    description={committee.description}
                  />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CommitteeRow({
  id,
  theme,
  description,
}: {
  id: string;
  theme: string;
  description: string;
}) {
  return (
    <Link
      href={`/committees/${id}`}
      className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40 sm:px-6"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          <span className="bg-[length:0_1px] bg-bottom bg-no-repeat bg-[linear-gradient(currentColor,currentColor)] transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
            {theme}
          </span>
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="size-4 shrink-0 rounded-full" />
    </div>
  );
}

function ForbiddenState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <TypographyLead className="text-balance">
        Acesso restrito a membros da simulação.
      </TypographyLead>
      <TypographyMuted className="mt-3">
        Entre em contato com a coordenação para vincular sua conta.
      </TypographyMuted>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <TypographyLead className="text-balance">
        Nenhum comitê instalado.
      </TypographyLead>
      <TypographyMuted className="mt-3">
        Volte mais tarde para acompanhar as próximas convocações.
      </TypographyMuted>
    </div>
  );
}
