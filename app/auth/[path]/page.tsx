import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(154,167,189,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(154,167,189,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-16 top-8 h-64 w-64 rounded-full border border-[var(--border)] bg-[radial-gradient(circle,rgba(244,246,250,0.14),transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-16 bottom-8 h-72 w-72 rounded-full border border-[rgba(255,255,255,0.08)] bg-[radial-gradient(circle,rgba(236,239,244,0.1),transparent_72%)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <AuthView
          path={path}
          className="w-full"
          classNames={{
            base: "rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,rgba(20,24,33,0.96),rgba(10,12,18,0.94))] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur",
            content: "space-y-6 p-6 sm:p-8",
            title:
              "text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]",
            description:
              "text-center text-sm leading-relaxed text-[var(--foreground-muted)]",
            continueWith:
              "text-xs uppercase tracking-[0.14em] text-[var(--foreground-muted)]",
            separator: "bg-[var(--border)]",
            footer: "text-sm text-[var(--foreground-muted)]",
            footerLink:
              "font-medium text-[var(--foreground)] transition-colors hover:text-[var(--accent)]",
            form: {
              label: "text-sm font-medium text-[var(--foreground)]",
              input:
                "h-11 rounded-xl border border-[var(--border)] bg-[rgba(6,8,12,0.72)] text-[var(--foreground)] placeholder:text-[rgba(156,163,176,0.72)] focus-visible:border-[rgba(216,221,231,0.45)] focus-visible:ring-2 focus-visible:ring-[rgba(216,221,231,0.18)]",
              checkbox:
                "border-[var(--border)] data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--accent)] data-[state=checked]:text-[#0a0d13]",
              primaryButton:
                "h-11 rounded-xl bg-[linear-gradient(135deg,#d8dde7,#b6becd)] font-semibold text-[#0a0d13] transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0",
              secondaryButton:
                "h-11 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground)] hover:bg-[rgba(216,221,231,0.08)]",
              outlineButton:
                "h-11 rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[rgba(216,221,231,0.08)]",
              providerButton:
                "h-11 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground)] hover:bg-[rgba(216,221,231,0.08)]",
              forgotPasswordLink:
                "text-sm text-[var(--foreground-muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline",
              error:
                "rounded-lg border border-[rgba(255,106,106,0.45)] bg-[rgba(255,90,90,0.12)] px-3 py-2 text-sm text-[rgb(255,188,188)]",
            },
          }}
        />
      </div>
    </main>
  );
}
