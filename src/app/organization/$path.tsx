import { OrganizationView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/organization/$path")({
  head: () => ({
    meta: [
      { title: "Organização — Simulação da ONU" },
      {
        name: "description",
        content: "Gerencie dados da organização e configurações da conta.",
      },
    ],
  }),
  component: OrganizationPage,
});

function OrganizationPage() {
  const { path } = Route.useParams();

  return (
    <main className="container p-4 md:p-6">
      <OrganizationView path={path} />
    </main>
  );
}
