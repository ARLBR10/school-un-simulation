import { Link } from "@tanstack/react-router";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LegalBackButton } from "@/components/legal/LegalBackButton";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

export type RelatedLegalLink = {
  href: "/terms" | "/privacy";
  label: string;
};

export function LegalDocument({
  title,
  description,
  updatedAt,
  sections,
  relatedLink,
}: {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  relatedLink: RelatedLegalLink;
}) {
  return (
    <PageShell className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={title}
        description={description}
        action={<LegalBackButton />}
      />

      <Card>
        <CardHeader>
          <CardDescription>Última atualização: {updatedAt}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 text-sm leading-7 text-muted-foreground">
          {sections.map((section, index) => (
            <section key={section.title} className="scroll-mt-16">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                {index + 1}. {section.title}
              </h2>
              <div className="flex flex-col gap-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-muted/20">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Consulte também{" "}
          <Link
            to={relatedLink.href}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {relatedLink.label}
          </Link>
          .
        </CardContent>
      </Card>
    </PageShell>
  );
}
