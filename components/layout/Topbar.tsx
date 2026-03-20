import Link from "next/link";
import { User } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/20">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-xl tracking-tight text-white">
              Simulação da ONU
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-6 text-sm font-medium text-white/70">
          <nav className="flex items-center space-x-6">
            <Link
              href="/comites"
              className="transition-colors hover:text-white"
            >
              Comitês
            </Link>
            <Link
              href="/delegacoes"
              className="transition-colors hover:text-white"
            >
              Delegações
            </Link>
            <Link href="/sobre" className="transition-colors hover:text-white">
              Sobre
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <User className="h-4 w-4 text-white" />
              <span className="sr-only">Perfil do Usuário</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
