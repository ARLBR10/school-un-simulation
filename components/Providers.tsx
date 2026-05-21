"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { AuthLang_PT_BR } from "@/lib/better-auth-ui-lang";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is required");
}

const convex = new ConvexReactClient(convexUrl);

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
  const navigate = useNavigate();
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    setShowCredentials(
      new URLSearchParams(window.location.search).get("credentials") === "true",
    );
  }, []);

  function goTo(url: string) {
    void navigate({ to: url });
  }

  function replaceWith(url: string) {
    void navigate({ to: url, replace: true });
  }

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={goTo}
      replace={replaceWith}
      localization={AuthLang_PT_BR}
      credentials={showCredentials}
      social={{ providers: ["google"] }}
      onSessionChange={() => {
        void router.invalidate();
      }}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
      baseURL={import.meta.env.VITE_CONVEX_SITE_URL}
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

export default function AllProviders({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
