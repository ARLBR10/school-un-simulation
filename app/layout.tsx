import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ONU Simulation",
  description: "Painel inicial da simulacao da ONU.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <div className="flex min-h-screen flex-col text-[var(--foreground)]">
            <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(2,3,5,0.96)] backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                <span className="text-base font-medium tracking-[0.08em] text-[var(--foreground)]">
                  ONU Simulation
                </span>
                <div className="flex items-center gap-4 sm:gap-6">
                  <nav
                    aria-label="Primary"
                    className="hidden items-center rounded-full border border-[rgba(255,255,255,0.04)] bg-[rgba(7,9,13,0.96)] px-2 py-2 text-sm shadow-[0_10px_24px_rgba(0,0,0,0.34)] sm:flex"
                  >
                    <a className="rounded-full px-4 py-2 text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]" href="#">
                      Inicio
                    </a>
                    <a className="rounded-full px-4 py-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]" href="#">
                      Comites
                    </a>
                    <a className="rounded-full px-4 py-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]" href="#">
                      Agenda
                    </a>
                  </nav>
                  <button
                    aria-label="User profile"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(255,255,255,0.04)] bg-[linear-gradient(180deg,#11141b,#0a0d12)] text-[var(--foreground)] shadow-[0_10px_24px_rgba(0,0,0,0.36)] transition-colors hover:bg-[#141820] hover:text-[var(--accent)]"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M5.75 18.25C6.8 15.9 9.15 14.5 12 14.5C14.85 14.5 17.2 15.9 18.25 18.25"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </header>
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
