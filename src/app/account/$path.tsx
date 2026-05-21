import { AccountView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account/$path")({
  component: AccountPage,
});

function AccountPage() {
  const { path } = Route.useParams();

  return (
    <main className="container p-4 md:p-6">
      <AccountView path={path} />
    </main>
  );
}
