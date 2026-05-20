"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLang_PT_BR } from "@/lib/better-auth-ui-lang";
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
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    setShowCredentials(
      new URLSearchParams(window.location.search).get("credentials") === "true",
    );
  }, []);

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      localization={AuthLang_PT_BR}
      credentials={showCredentials}
      social={{ providers: ["google"] }}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      Link={Link}
      baseURL={process.env.NEXT_PUBLIC_CONVEX_SITE_URL}
    >
      {children}
    </AuthUIProvider>
  );
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const hasInitialized = useRef(false);
  const previousUserId = useRef<string | null>(null);
  const userId = session?.user.id;
  const authSessionId = session?.session.id;

  useEffect(() => {
    if (isPending || hasInitialized.current) {
      return;
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2026-01-30",
      bootstrap: userId
        ? {
            distinctID: userId,
            isIdentifiedID: true,
          }
        : undefined,
    });

    hasInitialized.current = true;
  }, [isPending, userId]);

  useEffect(() => {
    if (!hasInitialized.current) {
      return;
    }

    if (!userId || !authSessionId) {
      if (previousUserId.current) {
        posthog.reset();
        previousUserId.current = null;
      }
      return;
    }

    posthog.identify(userId);
    posthog.register({
      distinctID: userId,
      sessionID: authSessionId,
    });
    previousUserId.current = userId;
  }, [authSessionId, userId]);

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
