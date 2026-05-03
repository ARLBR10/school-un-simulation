"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TypographyH1,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";
import { api } from "@/convex/_generated/api";
import { countryCodeToFlagUrl, getCountryByCode } from "@/lib/country-list";

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

function describeCountry(code: string | null) {
  if (!code) {
    return { flagUrl: null, name: "País não atribuído" };
  }

  const country = getCountryByCode(code);
  return {
    flagUrl: countryCodeToFlagUrl(code),
    name: country?.name ?? code,
  };
}

function CountryFlag({ code, name }: { code: string | null; name: string }) {
  const url = code ? countryCodeToFlagUrl(code) : null;

  if (!url) {
    return (
      <span
        aria-hidden="true"
        className="flex h-4 w-6 items-center justify-center rounded-sm border border-dashed border-border text-[0.6rem] text-muted-foreground"
      >
        ?
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={24}
      height={16}
      loading="lazy"
      className="h-4 w-6 rounded-sm border border-border object-cover"
    />
  );
}

export function CommitteeDetailView({ id }: { id: string }) {
  const committee = useQuery(api.committees.getById, { id });

  const sortedDelegates = useMemo(() => {
    if (!committee) return [];
    return [...committee.delegates].sort((a, b) => {
      const aName = describeCountry(a.delegatedCountry).name;
      const bName = describeCountry(b.delegatedCountry).name;
      return aName.localeCompare(bName, "pt-BR");
    });
  }, [committee]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 md:py-16">
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link
          href="/committees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Todos os comitês
        </Link>
      </motion.div>

      <div className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          {committee === undefined ? (
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
          ) : committee === null ? (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ForbiddenOrNotFoundState />
            </motion.div>
          ) : (
            <motion.article
              key="content"
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <motion.header variants={blockVariants} className="space-y-4">
                <TypographyH1 className="text-balance">
                  {committee.theme}
                </TypographyH1>
                {committee.description ? (
                  <TypographyLead className="text-pretty">
                    {committee.description}
                  </TypographyLead>
                ) : null}
              </motion.header>

              <motion.div variants={blockVariants}>
                <Section title="Tópicos em debate">
                  {committee.topics.length === 0 ? (
                    <TypographyMuted>Nenhum tópico cadastrado.</TypographyMuted>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card/40">
                      {committee.topics.map((topic, index) => (
                        <li
                          key={`${topic}-${index}`}
                          className="px-4 py-3 text-sm leading-relaxed"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </motion.div>

              {/* Clerks wont be in this page (at least for now)*/}
              {/*<motion.div variants={blockVariants}> 
                <Section title="Mesarios">
                  {committee.clerks.length === 0 ? (
                    <TypographyMuted>Sem mesários nomeados.</TypographyMuted>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {committee.clerks.map((clerk) => (
                        <li
                          key={clerk._id}
                          className="inline-flex items-center rounded-md border border-border bg-muted/30 px-3 py-1 text-sm font-medium"
                        >
                          {clerk.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </motion.div>*/}

              <motion.div variants={blockVariants}>
                <Section
                  title="Delegações"
                  aside={
                    <TypographyMuted>
                      {sortedDelegates.length}{" "}
                      {sortedDelegates.length === 1
                        ? "delegação"
                        : "delegações"}
                    </TypographyMuted>
                  }
                >
                  {sortedDelegates.length === 0 ? (
                    <TypographyMuted>
                      Nenhum delegado vinculado a este comitê.
                    </TypographyMuted>
                  ) : (
                    <div className="overflow-hidden rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12" />
                            <TableHead>País</TableHead>
                            <TableHead>Delegado(a)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDelegates.map((delegate) => {
                            const country = describeCountry(
                              delegate.delegatedCountry,
                            );
                            return (
                              <TableRow key={delegate._id}>
                                <TableCell>
                                  <CountryFlag
                                    code={delegate.delegatedCountry}
                                    name={country.name}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {country.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {delegate.name}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Section>
              </motion.div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <TypographyH3>{title}</TypographyH3>
        {aside ?? null}
      </div>
      {children}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </div>

      <SectionSkeleton>
        <div className="overflow-hidden rounded-md border border-border bg-card/40">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-3/5" />
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-24" />
        </div>
      </SectionSkeleton>

      <SectionSkeleton>
        <div className="overflow-hidden rounded-md border border-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-6 rounded-sm" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-4 w-32" />
            </div>
          ))}
        </div>
      </SectionSkeleton>
    </div>
  );
}

function SectionSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-48" />
      {children}
    </div>
  );
}

function ForbiddenOrNotFoundState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <TypographyLead className="text-balance">
        Comitê indisponível.
      </TypographyLead>
      <TypographyP className="mt-3 text-muted-foreground">
        Pode não existir ou você não possui acesso. Verifique sua vinculação
        como membro da simulação.
      </TypographyP>
    </div>
  );
}
