import type { Metadata } from "next";
import { Ide } from "@/components/ide/Ide";

export const metadata: Metadata = { title: "Editor · AEPP Max" };

/** The IDE ("Συνέχεια στον browser" on the landing page, and the installed app's start). */
export default function EditorPage() {
  return <Ide />;
}
