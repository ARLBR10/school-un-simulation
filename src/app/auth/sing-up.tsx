import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sing-up")({
  head: () => ({
    meta: [
      { title: "Criar conta — Simulação da ONU" },
      {
        name: "description",
        content: "Crie sua conta para acessar o painel da simulação.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth/$path", params: { path: "sign-up" } });
  },
});
