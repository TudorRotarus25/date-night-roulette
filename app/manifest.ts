import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Date Night Roulette",
    short_name: "Roulette",
    description: "Spin to decide where we're eating tonight.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7f4",
    theme_color: "#d6455f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
