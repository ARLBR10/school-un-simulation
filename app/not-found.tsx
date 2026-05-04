import Link from "next/link";
import { MoveLeft } from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <PageShell className="mx-auto w-full max-w-2xl justify-center">
      <Card className="gap-6 py-6 sm:py-8">
        <CardHeader className="gap-4 px-6 text-center justify-items-center sm:px-8">
          <div className="text-6xl font-semibold tracking-tighter text-muted-foreground">
            404
          </div>
          <CardTitle className="text-balance text-3xl">
            Página não encontrada
          </CardTitle>
          <CardDescription className="max-w-md text-balance leading-6">
            A página que você está procurando não existe, foi removida, ou está
            temporariamente indisponível.
          </CardDescription>
        </CardHeader>
        <div className="flex justify-center px-6 sm:px-8">
          <Button asChild variant="outline" className="group">
            <Link href="/">
              <MoveLeft
                data-icon="inline-start"
                className="transition-transform group-hover:-translate-x-1"
              />
              Voltar para o início
            </Link>
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
