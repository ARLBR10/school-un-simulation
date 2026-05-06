import type { Metadata } from "next";

import { NewsView } from "@/components/news/NewsView";

export const metadata: Metadata = {
  title: "Notícias — Simulação da ONU",
  description:
    "Acompanhe as últimas notícias e comunicados oficiais da simulação.",
};

export default function NewsPage() {
  return <NewsView />;
}
