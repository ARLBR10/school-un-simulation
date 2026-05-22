import { SiGithub } from '@icons-pack/react-simple-icons'
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Footer({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      data-slot="footer"
      className={cn(
        "border-t border-white/5 bg-black/50 py-4 text-white/50",
        className,
      )}
      {...props}
    >
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:px-8 md:flex-row">
        <p className="text-center text-xs md:text-left">
          Um projeto independente.
        </p>
        <div className="flex items-center space-x-4">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <a
              href="https://github.com/ARLBR10/school-un-simulation"
              target="_blank"
              rel="noreferrer"
            >
              <SiGithub />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
}
