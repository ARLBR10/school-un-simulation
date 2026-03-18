import Link from "next/link";

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(3,5,8,0.85)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">
          Painel da simulação da ONU como projeto escolar independente. {currentYear}
        </p>

        <div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]">
          <Link className="transition-colors hover:text-[var(--foreground)]" href="/">
            Início
          </Link>
          <span aria-hidden="true" className="text-[var(--border)]">
            /
          </span>
          <Link
            className="transition-colors hover:text-[var(--foreground)]"
            href="#"
          >
            Comitês
          </Link>
          <span aria-hidden="true" className="text-[var(--border)]">
            /
          </span>
          <Link
            className="transition-colors hover:text-[var(--foreground)]"
            href="/auth/sign-in"
          >
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
