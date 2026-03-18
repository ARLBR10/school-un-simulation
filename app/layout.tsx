import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import AuthProvider from "@/components/AuthProvider";
import { UserButton } from "@daveyplate/better-auth-ui";

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
        <AuthProvider>
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
                      <a
                        className="rounded-full px-4 py-2 text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                        href="#"
                      >
                        Inicio
                      </a>
                      <a
                        className="rounded-full px-4 py-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                        href="#"
                      >
                        Comites
                      </a>
                      <a
                        className="rounded-full px-4 py-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                        href="#"
                      >
                        Agenda
                      </a>
                    </nav>
                    <UserButton size="icon" />
                  </div>
                </div>
              </header>
              <main className="flex flex-1 flex-col">{children}</main>
            </div>
          </ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
