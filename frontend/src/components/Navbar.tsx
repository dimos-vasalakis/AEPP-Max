import type { ReactNode } from "react";
import { AboutMenu } from "@/components/AboutMenu";
import { ExtensionsMenu } from "@/components/extensions/ExtensionsMenu";
import { HelpMenu } from "@/components/HelpMenu";
import { UserMenu } from "@/components/UserMenu";
import { ZoomMenu } from "@/components/ZoomMenu";

/**
 * The top bar. Left: the page's own actions (`children`, e.g. run), the lens
 * (font size), the guide and the logo (copyright). Right: the page's `tools`
 * (Αλγόριθμοι), Επεκτάσεις and the account (its menu holds Ρυθμίσεις). Where they
 * don't fit (phones) the bar takes a second row, so the page never scrolls sideways.
 */
export function Navbar({ children, tools }: { children?: ReactNode; tools?: ReactNode }) {
  return (
    <header className="relative flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-border bg-panel px-1.5 py-2 sm:gap-x-3 sm:px-3">
      {children}
      <ZoomMenu />
      <HelpMenu />
      <AboutMenu />
      <nav aria-label="Κύριο μενού" className="ml-auto flex items-center gap-1">
        {tools}
        <ExtensionsMenu />
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </nav>
    </header>
  );
}
