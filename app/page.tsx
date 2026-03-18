export default function Home() {
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
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-px w-[32rem] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-[rgba(244,246,250,0.14)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[var(--background)] animate-[page-fadeout_900ms_ease-out_forwards]"
      />
      <h1 className="relative z-10 animate-[welcome-reveal_700ms_ease-out_120ms_both] text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
        Welcome
      </h1>
    </section>
  );
}
