"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { Link } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { AuthLang_PT_BR } from "@/lib/better-auth-ui-lang";
import { AppNotifications } from "@/components/AppNotifications";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is required");
}

const convex = new ConvexReactClient(convexUrl);

function getSafeRedirectTo(redirectTo: string | null) {
  if (!redirectTo) {
    return "/";
  }

  if (
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//") &&
    !redirectTo.includes("://")
  ) {
    return redirectTo;
  }

  return "/";
}

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
      <AppNotifications />
      {children}
    </ConvexBetterAuthProvider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [nextRedirectTo, setNextRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get("redirectTo");

    setNextRedirectTo(getSafeRedirectTo(redirectTo));
    setShowCredentials(searchParams.get("credentials") === "true");
  }, []);

  return (
    <AuthUIProvider
      authClient={authClient}
      localization={AuthLang_PT_BR}
      redirectTo={nextRedirectTo || "/"}
      credentials={showCredentials}
      social={{ providers: ["google"] }}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
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

    posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
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

export default function AllProviders({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <ConvexClientProvider initialToken={initialToken}>
          {children}
        </ConvexClientProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
