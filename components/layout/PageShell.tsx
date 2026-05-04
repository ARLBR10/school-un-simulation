import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function PageShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        "@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6",
        className,
      )}
      {...props}
    />
  );
}

function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export { PageHeader, PageShell };
