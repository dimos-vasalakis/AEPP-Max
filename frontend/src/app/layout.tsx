import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-inter", subsets: ["latin", "greek"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "greek"] });

export const metadata: Metadata = {
  title: "AEPP-Max",
  description:
    "Ο Διερμηνευτής της ΓΛΩΣΣΑΣ με AI βοηθό, για την Πληροφορική των Πανελλαδικών.",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="el" className={`${sans.variable} ${mono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
