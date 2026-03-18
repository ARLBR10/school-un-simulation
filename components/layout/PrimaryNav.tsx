import Link from "next/link";

import { primaryNavItems } from "@/components/layout/navigation";

type PrimaryNavProps = {
  mobile?: boolean;
};

export function PrimaryNav({ mobile = false }: PrimaryNavProps) {
  return (
    <nav
      aria-label="Principal"
      className={
        mobile
          ? "flex w-full items-center justify-between gap-1 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(7,9,13,0.96)] p-1 text-sm shadow-[0_10px_24px_rgba(0,0,0,0.34)]"
          : "hidden items-center rounded-full border border-[rgba(255,255,255,0.04)] bg-[rgba(7,9,13,0.96)] px-2 py-2 text-sm shadow-[0_10px_24px_rgba(0,0,0,0.34)] sm:flex"
      }
    >
      {primaryNavItems.map((item, index) => (
        <Link
          key={item.id}
          href={item.href}
          className={
            index === 0
              ? "rounded-full px-3 py-2 text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)] sm:px-4"
              : "rounded-full px-3 py-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)] sm:px-4"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
