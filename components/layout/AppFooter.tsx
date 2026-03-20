export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(3,5,8,0.85)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">
          Painel da simulação da ONU como projeto escolar independente. {currentYear}
        </p>

        <a
          aria-label="Repositório no GitHub"
          className="text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          href="https://github.com/ARLBR10/school-un-simulation"
          rel="noreferrer"
          target="_blank"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.12.82-.26.82-.58 0-.28-.02-1.24-.02-2.24-3.34.72-4.04-1.42-4.04-1.42-.54-1.4-1.34-1.76-1.34-1.76-1.1-.76.08-.74.08-.74 1.22.08 1.86 1.24 1.86 1.24 1.08 1.86 2.84 1.32 3.54 1 .1-.8.42-1.32.76-1.62-2.66-.3-5.46-1.32-5.46-5.88 0-1.3.46-2.36 1.24-3.2-.12-.3-.54-1.52.12-3.16 0 0 1-.32 3.3 1.22A11.3 11.3 0 0 1 12 5.6c1.02 0 2.06.14 3.02.4 2.3-1.56 3.3-1.22 3.3-1.22.66 1.64.24 2.86.12 3.16.76.84 1.24 1.9 1.24 3.2 0 4.58-2.8 5.58-5.48 5.88.44.38.82 1.1.82 2.24 0 1.62-.02 2.92-.02 3.32 0 .32.22.7.82.58A12.04 12.04 0 0 0 24 12c0-6.64-5.38-12-12-12Z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
