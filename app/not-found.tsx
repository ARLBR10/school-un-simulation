import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(154,167,189,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(154,167,189,0.08) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 top-16 h-64 w-64 rounded-full border border-[var(--border)] bg-[radial-gradient(circle,rgba(244,246,250,0.12),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-12 h-80 w-80 rounded-full border border-[rgba(255,255,255,0.08)] bg-[radial-gradient(circle,rgba(236,239,244,0.08),transparent_68%)]"
      />

      <div className="relative z-10 max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-8 text-center backdrop-blur-sm">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
          Erro 404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Página não encontrada
        </h1>
        <p className="mt-4 text-base text-[var(--foreground-muted)]">
          A página que você tentou acessar não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[rgba(255,255,255,0.28)] hover:bg-[rgba(216,221,231,0.18)]"
        >
          Voltar para o início
        </Link>
      </div>
    </section>
  );
}
