"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { EventBadges } from "@/components/events/EventBadges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const sortedClerks = useMemo(() => {
    if (!committee) return [];
    return [...committee.clerks].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [committee]);

  return (
    <PageShell className="mx-auto w-full max-w-5xl">
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link
          to="/committees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4"
        >
          <ArrowLeft />
          Todos os comitês
        </Link>
      </motion.div>

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
            className="flex flex-col gap-6"
          >
            <motion.header variants={blockVariants}>
              <PageHeader title={committee.theme} />
              <EventBadges
                eventName={committee.event?.name ?? null}
                isPastEvent={committee.isPastEvent}
                className="mt-2"
              />
            </motion.header>

            <motion.div variants={blockVariants}>
              <Section title="Descrição">
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {committee.description}
                </p>
              </Section>
            </motion.div>

            <motion.div variants={blockVariants}>
              <Section title="Tópicos em debate">
                {committee.topics.length === 0 ? (
                  <CardDescription>Nenhum tópico cadastrado.</CardDescription>
                ) : (
                  <div className="flex flex-col gap-2">
                    {committee.topics.map((topic, index) => (
                      <div
                        key={`${topic}-${index}`}
                        className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed"
                      >
                        {topic}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </motion.div>

            <motion.div variants={blockVariants}>
              <Section
                title="Mesários"
              >
                {sortedClerks.length === 0 ? (
                  <CardDescription>
                    Nenhum mesário vinculado a este comitê.
                  </CardDescription>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedClerks.map((clerk) => (
                      <div
                        key={clerk._id}
                        className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed"
                      >
                        {clerk.name}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </motion.div>

            <motion.div variants={blockVariants}>
              <Section
                title="Delegações"
                description={`${sortedDelegates.length} ${
                  sortedDelegates.length === 1 ? "delegação" : "delegações"
                }`}
              >
                {sortedDelegates.length === 0 ? (
                  <CardDescription>
                    Nenhum delegado vinculado a este comitê.
                  </CardDescription>
                ) : (
                  <div className="overflow-hidden rounded-md border">
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
    </PageShell>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-3/4" />
      </div>

      <SectionSkeleton>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </SectionSkeleton>

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
        <div className="overflow-hidden rounded-md border border-border bg-card/40">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-2/5" />
            </div>
          ))}
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
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ForbiddenOrNotFoundState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Comitê indisponível.</CardTitle>
        <CardDescription>
          Pode não existir ou você não possui acesso. Verifique sua vinculação
          como membro da simulação.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
