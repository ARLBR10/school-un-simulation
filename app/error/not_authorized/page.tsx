import type { Metadata } from "next";

import { NotAuthorizedContent } from "./NotAuthorizedContent";

export const metadata: Metadata = {
  title: "Acesso não autorizado | Simulação da ONU",
  description: "Orientações para usuários que ainda não possuem autorização de acesso.",
};

export default function NotAuthorizedPage() {
  return <NotAuthorizedContent />;
}
