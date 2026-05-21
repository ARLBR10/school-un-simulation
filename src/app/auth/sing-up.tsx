import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sing-up")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/$path", params: { path: "sign-up" } });
  },
});
