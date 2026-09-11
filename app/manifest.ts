import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Date Night Roulette",
    short_name: "Roulette",
    description: "Spin to decide where we're eating tonight.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#130e1f",
    theme_color: "#130e1f",
    // Rasters only: iOS generates the standalone launch screen from
    // background_color plus the first suitable icon here, and ignores SVG.
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
