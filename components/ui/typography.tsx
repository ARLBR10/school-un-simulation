import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function TypographyH1({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      data-slot="typography-h1"
      className={cn(
        "scroll-m-20 text-balance text-4xl font-bold tracking-tight lg:text-5xl",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH2({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="typography-h2"
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH3({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="typography-h3"
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH4({ className, ...props }: ComponentProps<"h4">) {
  return (
    <h4
      data-slot="typography-h4"
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function TypographyP({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-p"
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  );
}

function TypographyLead({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-lead"
      className={cn("text-xl text-muted-foreground", className)}
      {...props}
    />
  );
}

function TypographyLarge({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="typography-large"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function TypographySmall({ className, ...props }: ComponentProps<"small">) {
  return (
    <small
      data-slot="typography-small"
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  );
}

function TypographyMuted({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-muted"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function TypographyList({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="typography-list"
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  );
}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  TypographyList,
};
