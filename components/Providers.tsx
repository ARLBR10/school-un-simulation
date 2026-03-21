"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLang_PT_BR } from "@/lib/better-auth-ui-lang";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      localization={AuthLang_PT_BR}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2026-01-30",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export default function AllProviders({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
