"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        router.refresh();
      }}
      organization={{
        pathMode: "slug",
        basePath: "/organization",
        slug,
      }}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
}
