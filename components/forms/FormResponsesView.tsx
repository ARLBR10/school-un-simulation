"use client";

import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { FormDefinition } from "@/lib/forms";

const chartConfig = {
  votes: {
    label: "Votos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function truncateLabel(label: string) {
  return label.length > 28 ? `${label.slice(0, 25)}...` : label;
}

export function FormResponsesView({
  definition,
}: {
  definition: FormDefinition;
}) {
  const responses = useQuery(api.forms.listResponses, {
    formKey: definition.key,
  });
  const optionFields = definition.fields.filter(
    (field) => "options" in field,
  );

  return (
    <PageShell>
      <PageHeader
        title="Respostas do formulário"
        description={definition.title}
        action={
          responses && responses.length > 0 ? (
            <Badge variant="secondary">
              {responses.length}{" "}
              {responses.length === 1 ? "resposta" : "respostas"}
            </Badge>
          ) : null
        }
      />

      {responses === undefined ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : responses === null ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Apenas administradores podem consultar as respostas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : responses.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Nenhuma resposta recebida</CardTitle>
            <CardDescription>
              As respostas aparecerão aqui assim que o formulário for
              preenchido.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {optionFields.map((field) => {
            const voteCounts = new Map(
              field.options.map((option) => [option.value, 0]),
            );

            for (const response of responses) {
              const value = response.answers.find(
                (answer) => answer.fieldId === field.id,
              )?.value;
              const selections = Array.isArray(value)
                ? value
                : typeof value === "string"
                  ? [value]
                  : [];

              for (const selection of selections) {
                voteCounts.set(
                  selection,
                  (voteCounts.get(selection) ?? 0) + 1,
                );
              }
            }

            const chartData = field.options
              .map((option) => ({
                option: option.label,
                votes: voteCounts.get(option.value) ?? 0,
              }))
              .sort((a, b) => b.votes - a.votes);

            return (
              <Card key={field.id}>
                <CardHeader>
                  <CardTitle>{field.name}</CardTitle>
                  <CardDescription>
                    Total de escolhas por opção. A porcentagem considera os{" "}
                    {responses.length} {responses.length === 1
                      ? "participante"
                      : "participantes"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[32rem] w-full"
                    initialDimension={{ width: 640, height: 512 }}
                  >
                    <BarChart
                      accessibilityLayer
                      data={chartData}
                      layout="vertical"
                      margin={{ left: 0, right: 20 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="option"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={156}
                        tickFormatter={truncateLabel}
                      />
                      <XAxis type="number" allowDecimals={false} hide />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            formatter={(value) => {
                              const votes = Number(value);
                              const percentage = Math.round(
                                (votes / responses.length) * 100,
                              );

                              return (
                                <div className="flex flex-1 items-center justify-between gap-4">
                                  <span className="text-muted-foreground">
                                    {votes === 1 ? "Voto" : "Votos"}
                                  </span>
                                  <span className="font-mono font-medium tabular-nums">
                                    {votes} ({percentage}%)
                                  </span>
                                </div>
                              );
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="votes"
                        fill="var(--color-votes)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            );
          })}

          <Card className="gap-0">
            <CardHeader className="border-b">
              <CardTitle>Participantes</CardTitle>
              <CardDescription>
                Cada participante pode atualizar a própria resposta; somente a
                versão mais recente é exibida.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <Accordion>
                {responses.map((response) => (
                  <AccordionItem key={response._id} value={response._id}>
                    <AccordionTrigger className="px-2 hover:no-underline sm:px-3">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate">
                          {response.respondent.name}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {response.respondent.schoolClass ??
                            "Turma não informada"}{" "}
                          ·{" "}
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(response.submittedAt)}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 sm:px-3">
                      <dl className="grid gap-4 rounded-lg bg-muted/20 p-4">
                        {response.answers.map((answer) => (
                          <div key={answer.fieldId} className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                              {answer.fieldName}
                            </dt>
                            <dd className="whitespace-pre-wrap leading-6">
                              {answer.displayValue}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
