import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const sans = Inter({ variable: "--font-inter", subsets: ["latin", "greek"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "greek"] });

export const metadata: Metadata = {
  title: "AEPP Max",
  description:
    "Γράψε και τρέξε ΓΛΩΣΣΑ στον browser, με AI βοηθό, για την Πληροφορική των Πανελλαδικών.",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT sets data-theme before React hydrates.
    <html lang="el" className={`${sans.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
