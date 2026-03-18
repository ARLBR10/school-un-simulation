import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import AuthProvider from "@/components/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import "./globals.css";

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
              <AppHeader />
              <main className="flex flex-1 flex-col">{children}</main>
              <AppFooter />
            </div>
          </ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
