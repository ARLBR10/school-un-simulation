import {
  AuthLoading,
  SignedIn,
  SignedOut,
  UserButton,
} from "@daveyplate/better-auth-ui";
import Link from "next/link";

function AuthButtonSkeleton() {
  return (
    <div className="h-10 w-24 animate-pulse rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]" />
  );
}

export function AuthActions() {
  return (
    <>
      <AuthLoading>
        <AuthButtonSkeleton />
      </AuthLoading>
      <SignedIn>
        <UserButton
          classNames={{
            trigger: {
              base: "h-10 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,24,0.92)] px-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(19,24,33,0.98)]",
            },
            content: {
              base: "rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,9,14,0.98)] text-[var(--foreground)] shadow-[0_18px_45px_rgba(0,0,0,0.42)] backdrop-blur-xl",
              menuItem:
                "text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]",
              separator: "bg-[var(--border)]",
            },
          }}
        />
      </SignedIn>
      <SignedOut>
        <Link
          href="/auth/sign-in"
          className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(216,221,231,0.2),rgba(216,221,231,0.06))] px-4 text-sm font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.24)] hover:bg-[linear-gradient(135deg,rgba(216,221,231,0.28),rgba(216,221,231,0.1))] active:translate-y-0"
        >
          Entrar
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            {"->"}
          </span>
        </Link>
      </SignedOut>
    </>
  );
}
