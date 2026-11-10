"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lock, Map as MapIcon, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { TheaterOrderComposeSheet } from "@/components/theater/TheaterOrderComposeSheet";
import {
  TheaterFactionBadge,
  TheaterLoadingState,
  TheaterOptionSelect,
  TheaterPageHeader,
  TheaterRestrictedState,
} from "@/components/theater/TheaterShared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { TheaterOrderView } from "@/convex/theaterOrders";
import {
  theaterOrderClassificationDescriptions,
  theaterOrderClassificationLabels,
  theaterOrderStatusLabels,
  type TheaterOrderStatus,
} from "@/lib/theater";

export const Route = createFileRoute("/theater/orders")({
  validateSearch: (search) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ordens — Teatro de Operações" },
      {
        name: "description",
        content: "Envie e acompanhe ordens entre as delegações e o GLUCON.",
      },
    ],
  }),
  component: TheaterOrdersPage,
});

type OrdersTab = "received" | "sent" | "all";

const statusOptions = Object.entries(theaterOrderStatusLabels).map(
  ([value, label]) => ({ value, label }),
);

function TheaterOrdersPage() {
  const { event: requestedEventId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const viewer = useQuery(api.theater.getViewer, { eventId: requestedEventId });
  const eventId = viewer?.event._id;
  const canUseDirectory = viewer !== undefined && viewer !== null && viewer.role !== "observer";
  const factions = useQuery(api.theater.listFactions, eventId ? { eventId } : "skip");
  const directory = useQuery(
    api.theater.listDirectory,
    eventId && canUseDirectory ? { eventId } : "skip",
  );
  const orders = useQuery(api.theaterOrders.list, eventId ? { eventId } : "skip");

  const [tab, setTab] = useState<OrdersTab>("received");
  const [isComposing, setIsComposing] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<Id<"theaterOrders"> | null>(null);

  const factionsById = useMemo(
    () => new Map((factions ?? []).map((faction) => [faction._id, faction])),
    [factions],
  );

  const isOperator = viewer?.role === "admin" || viewer?.role === "glucon";
  useEffect(() => {
    if (isOperator) setTab("all");
  }, [isOperator]);

  if (viewer === undefined) {
    return (
      <PageShell>
        <TheaterLoadingState />
      </PageShell>
    );
  }

  if (viewer === null) {
    return (
      <PageShell>
        <PageHeader
          title="Ordens"
          description="Envie e acompanhe ordens entre as delegações e o GLUCON."
        />
        <TheaterRestrictedState />
      </PageShell>
    );
  }

  const canSend = viewer.role !== "observer" && viewer.event.status !== "past";
  const visibleOrders = (orders ?? []).filter(
    (order) => tab === "all" || order.direction === tab,
  );
  const openOrder = orders?.find((order) => order._id === openOrderId) ?? null;

  return (
    <PageShell>
      <TheaterPageHeader
        viewer={viewer}
        factionsById={factionsById}
        title="Ordens"
        description={
          isOperator
            ? "Receba as ordens das delegações, responda e registre o que foi executado."
            : "Envie ordens ao GLUCON e a outros participantes; o sigilo é respeitado por classificação."
        }
        onEventChange={(nextEventId) => {
          setOpenOrderId(null);
          void navigate({ search: { event: nextEventId } });
        }}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link to="/theater" search={{ event: viewer.event._id }} />}
              variant="outline"
            >
              <MapIcon data-icon="inline-start" />
              Mapa
            </Button>
            {canSend ? (
              <Button type="button" onClick={() => setIsComposing(true)}>
                <Send data-icon="inline-start" />
                Nova ordem
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as OrdersTab)}>
        <TabsList>
          <TabsTrigger value="received">Recebidas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="all">Todas visíveis</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3" aria-busy={orders === undefined} aria-live="polite">
        {orders === undefined ? (
          <p className="text-sm text-muted-foreground">Carregando ordens...</p>
        ) : visibleOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhuma ordem nesta lista.
            </CardContent>
          </Card>
        ) : (
          visibleOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              factionsById={factionsById}
              onOpen={() => setOpenOrderId(order._id)}
            />
          ))
        )}
      </div>

      {eventId && canSend ? (
        <TheaterOrderComposeSheet
          open={isComposing}
          eventId={eventId}
          viewerMemberId={viewer.memberId}
          factions={factions ?? []}
          directory={directory ?? []}
          onClose={() => setIsComposing(false)}
        />
      ) : null}

      <OrderDialog
        order={openOrder}
        factionsById={factionsById}
        canReview={isOperator && viewer.event.status !== "past"}
        onClose={() => setOpenOrderId(null)}
      />
    </PageShell>
  );
}

function OrderRouting({
  order,
  factionsById,
}: {
  order: TheaterOrderView;
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
}) {
  const hasRecipients =
    order.recipientFactionIds.length > 0 || order.recipients.length > 0;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">De:</span>
        <span className="font-medium">{order.sender.name}</span>
        {order.sender.isGlucon ? <Badge variant="secondary">GLUCON</Badge> : null}
        {order.sender.factionId ? (
          <TheaterFactionBadge faction={factionsById.get(order.sender.factionId)} />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">Para:</span>
        <Badge variant="secondary">GLUCON</Badge>
        {order.recipientFactionIds.map((factionId) => (
          <TheaterFactionBadge key={factionId} faction={factionsById.get(factionId)} />
        ))}
        {order.recipients.map((recipient) => (
          <Badge key={recipient.memberId} variant="outline">
            {recipient.name}
          </Badge>
        ))}
        {!hasRecipients ? (
          <span className="text-xs text-muted-foreground">(somente o GLUCON)</span>
        ) : null}
      </div>
    </div>
  );
}

function OrderBadges({ order }: { order: TheaterOrderView }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={order.classification === "secret" ? "destructive" : "outline"}>
        {order.classification === "secret" ? <Lock data-icon="inline-start" /> : null}
        {theaterOrderClassificationLabels[order.classification]}
      </Badge>
      <Badge variant={order.status === "sent" ? "default" : "secondary"}>
        {theaterOrderStatusLabels[order.status]}
      </Badge>
    </div>
  );
}

function OrderCard({
  order,
  factionsById,
  onOpen,
}: {
  order: TheaterOrderView;
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
  onOpen: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="break-words">{order.subject}</CardTitle>
        <CardDescription>
          {format(order._creationTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
        </CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            Abrir
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <OrderBadges order={order} />
        <OrderRouting order={order} factionsById={factionsById} />
        <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {order.body}
        </p>
      </CardContent>
    </Card>
  );
}

function OrderDialog({
  order,
  factionsById,
  canReview,
  onClose,
}: {
  order: TheaterOrderView | null;
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
  canReview: boolean;
  onClose: () => void;
}) {
  const reviewOrder = useMutation(api.theaterOrders.review);
  const [status, setStatus] = useState<TheaterOrderStatus>("sent");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setNote(order.gluconNote ?? "");
  }, [order?._id]);

  async function handleReview() {
    if (!order) return;
    setIsSaving(true);
    try {
      await reviewOrder({ orderId: order._id, status, gluconNote: note || null });
      toast.success("Ordem atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar a ordem.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="break-words">{order.subject}</DialogTitle>
              <DialogDescription>
                {format(order._creationTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ·{" "}
                {theaterOrderClassificationDescriptions[order.classification]}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <OrderBadges order={order} />
              <OrderRouting order={order} factionsById={factionsById} />
              <p className="text-sm whitespace-pre-wrap break-words">{order.body}</p>

              {order.gluconNote && !canReview ? (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">Resposta do GLUCON</p>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    {order.gluconNote}
                  </p>
                </div>
              ) : null}

              {canReview ? (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <Field>
                    <FieldLabel htmlFor="theater-order-status">Situação</FieldLabel>
                    <TheaterOptionSelect
                      id="theater-order-status"
                      value={status}
                      options={statusOptions}
                      onChange={(value) => setStatus(value as TheaterOrderStatus)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="theater-order-note">Resposta do GLUCON</FieldLabel>
                    <Textarea
                      id="theater-order-note"
                      value={note}
                      maxLength={2000}
                      rows={3}
                      placeholder="Visível para quem pode ler a ordem."
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button type="button" disabled={isSaving} onClick={() => void handleReview()}>
                      Salvar situação
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
