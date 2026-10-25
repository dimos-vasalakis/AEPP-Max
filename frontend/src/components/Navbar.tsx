import type { ReactNode } from "react";
import { AboutMenu } from "@/components/AboutMenu";
import { ExtensionsMenu } from "@/components/extensions/ExtensionsMenu";
import { SettingsMenu } from "@/components/SettingsMenu";
import { UserMenu } from "@/components/UserMenu";

/**
 * The top bar. Left: the page's own actions (`children`, e.g. run), the logo
 * (copyright) and settings. Right: Επεκτάσεις and the account.
 */
export function Navbar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      {children}
      <AboutMenu />
      <SettingsMenu />
      <nav aria-label="Κύριο μενού" className="ml-auto flex items-center gap-1">
        <ExtensionsMenu />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <UserMenu />
      </nav>
    </header>
  );
}
