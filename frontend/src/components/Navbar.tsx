import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExtensionsMenu } from "@/components/extensions/ExtensionsMenu";
import { UserMenu } from "@/components/UserMenu";

/** The top bar: logo, the page's own actions (`children`), Επεκτάσεις and the account. */
export function Navbar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo-cloud.png" alt="" width={28} height={28} priority />
        <span className="font-semibold tracking-tight">AEPP Max</span>
      </Link>
      {children}
      <nav aria-label="Κύριο μενού" className="ml-auto flex items-center gap-1">
        <ExtensionsMenu />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <UserMenu />
      </nav>
    </header>
  );
}
