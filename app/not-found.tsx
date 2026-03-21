import Link from "next/link";
import { MoveLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center relative min-h-[calc(100vh-8rem)] text-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] bg-red-900/10 pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center">
        <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 mb-4">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-medium text-white/80 mb-6">
          Página não encontrada
        </h2>
        <p className="text-white/50 max-w-[400px] mb-8">
          A página que você está procurando não existe, foi removida, ou está temporariamente indisponível.
        </p>
        <Button
          asChild
          variant="outline"
          className="group rounded-full border-white/10 bg-white/5 px-6 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Link href="/">
            <MoveLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Voltar para o início
          </Link>
        </Button>
      </div>
    </div>
  );
}
