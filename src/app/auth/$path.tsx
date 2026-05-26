import { AuthView } from "@daveyplate/better-auth-ui";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";

import { getToken } from "@/src/server/auth";

const getAuthToken = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export const Route = createFileRoute("/auth/$path")({
  validateSearch: (search) => ({
    redirectTo: typeof search.redirectTo === "string" ? search.redirectTo : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const token = await getAuthToken().catch(() => null);

    if (token) {
      throw redirect({
        to: getSafeRedirectTo(search.redirectTo),
        replace: true,
      });
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${getAuthPageTitle(params.path)} — Simulação da ONU`,
      },
      {
        name: "description",
        content: "Acesse sua conta para continuar na plataforma.",
      },
    ],
  }),
  component: AuthPage,
});

function getSafeRedirectTo(redirectTo: string | undefined) {
  if (
    redirectTo &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//") &&
    !redirectTo.includes("://") &&
    !redirectTo.startsWith("/auth")
  ) {
    return redirectTo;
  }

  return "/";
}

function getAuthPageTitle(path: string) {
  if (path === "sign-up") {
    return "Criar conta";
  }

  if (path === "forgot-password") {
    return "Recuperar senha";
  }

  return "Entrar";
}

const pathsWithLegalLinks = new Set(["sign-in", "sign-up"]);
const pathsWithSchoolEmailWarning = new Set(["sign-in", "sign-up"]);

function AuthPage() {
  const { path } = Route.useParams();

  return (
    <main className="container flex grow flex-col items-center justify-center gap-4 self-center p-4 md:p-6">
      {pathsWithSchoolEmailWarning.has(path) ? (
        <div className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 shadow-sm shadow-yellow-950/10">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p className="leading-5">
            Use seu e-mail escolar para acessar a plataforma.
          </p>
        </div>
      ) : null}
      <AuthView path={path} />
      {pathsWithLegalLinks.has(path) ? (
        <p className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
          Ao entrar ou criar uma conta, você concorda com os{" "}
          <Link
            to="/terms"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Termos de Serviço
          </Link>{" "}
          e entende a{" "}
          <Link
            to="/privacy"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
