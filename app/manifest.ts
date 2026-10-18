import type { MetadataRoute } from "next";

// Added to a phone's home screen, Kopikas opens full screen like an app, under the painted
// coin on Oat Paper (public/icon-*.png, app/apple-icon.png). The coin sits inside the round
// safe zone, so the 512px icon also serves as the maskable one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kopikas",
    short_name: "Kopikas",
    description: "Iga kopikas loeb — personal money board",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
