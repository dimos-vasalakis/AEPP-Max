import type { ReactNode } from "react";
import { AboutMenu } from "@/components/AboutMenu";
import { ExtensionsMenu } from "@/components/extensions/ExtensionsMenu";
import { UserMenu } from "@/components/UserMenu";
import { ZoomMenu } from "@/components/ZoomMenu";

/**
 * The top bar. Left: the page's own actions (`children`, e.g. run), the logo
 * (copyright) and the lens (font size). Right: Επεκτάσεις and the account
 * (its menu holds Ρυθμίσεις).
 */
export function Navbar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      {children}
      <AboutMenu />
      <ZoomMenu />
      <nav aria-label="Κύριο μενού" className="ml-auto flex items-center gap-1">
        <ExtensionsMenu />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <UserMenu />
      </nav>
    </header>
  );
}
