"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { Link } from "@tanstack/react-router";
import { ConvexReactClient, useQuery } from "convex/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/convex/_generated/api";
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

function PostHogUserProperties() {
  const { data: session } = authClient.useSession();
  const userInfo = useQuery(api.auth.getCurrentUser);
  const userId = session?.user.id;
  const member = userInfo?.member;
  const committee = useQuery(
    api.committees.getById,
    member?.committee ? { id: member.committee } : "skip",
  );

  useEffect(() => {
    if (!userId || userInfo === undefined) {
      return;
    }

    const name = member?.name ?? session?.user.name ?? null;
    const email = session?.user.email ?? null;

    posthog.identify(userId, {
      $name: name,
      $email: email,
      "member.id": member?._id ?? null,
      "member.name": member?.name ?? null,
      "member.tuitionId": member?.tuitionId ?? null,
      "member.type": member?.type ?? null,
      "member.mediaFunction": member?.pressRole ?? null,
      "member.committee": committee?.theme ?? member?.committee ?? null,
      "member.committeeId": member?.committee ?? null,
      name,
      email,
      emailVerified: session?.user.emailVerified ?? null,
    });
  }, [
    committee?.theme,
    member?._id,
    member?.committee,
    member?.name,
    member?.pressRole,
    member?.tuitionId,
    member?.type,
    session?.user.email,
    session?.user.emailVerified,
    session?.user.name,
    userId,
    userInfo,
  ]);

  return null;
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
      <PostHogUserProperties />
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
