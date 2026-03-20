import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/50 py-4 text-white/50">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:px-8 md:flex-row">
        <p className="text-center text-xs md:text-left">
          Um projeto independente.
        </p>
        <div className="flex items-center space-x-4">
          <Link
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/5 p-1.5 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="sr-only">GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
