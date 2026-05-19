import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import Link from "next/link";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const pathsWithLegalLinks = new Set(["sign-in", "sign-up"]);

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container flex grow flex-col items-center justify-center gap-4 self-center p-4 md:p-6">
      <AuthView path={path} />
      {pathsWithLegalLinks.has(path) ? (
        <p className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
          Ao entrar ou criar uma conta, você concorda com os{" "}
          <Link
            href="/terms"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Termos de Serviço
          </Link>{" "}
          e entende a{" "}
          <Link
            href="/privacy"
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
