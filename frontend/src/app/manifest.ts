import type { MetadataRoute } from "next";

// Makes the site installable (Εγκατάσταση, in the logo's menu): its own window and
// icon on Windows, macOS, Android and iOS, with no app store. No service worker: the
// interpreter and the agent run on the server, so there's nothing to do offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AEPP Max",
    short_name: "AEPP Max",
    description:
      "Γράψε και τρέξε ΓΛΩΣΣΑ, με AI βοηθό, για την Πληροφορική των Πανελλαδικών.",
    lang: "el",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The dark theme's, the default (globals.css --bg), so the launch splash matches.
    background_color: "#0c0c0e",
    theme_color: "#0c0c0e",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // On a dark square with room around it, for launchers that crop to a circle.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
