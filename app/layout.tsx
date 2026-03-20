import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AllProviders from "@/components/Providers";
import { Topbar } from "@/components/layout/Topbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simulação da ONU",
  description: "Painel para simulação das Nações Unidas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <AllProviders>
          <div className="flex flex-col min-h-screen relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 z-[-1] pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,90,0.15),transparent_60%),radial-gradient(circle_at_100%_100%,rgba(20,20,40,0.4),transparent_50%)]"></div>
            <Topbar />
            <main className="flex-1 flex flex-col relative z-0">{children}</main>
            <Footer />
          </div>
        </AllProviders>
      </body>
    </html>
  );
}
