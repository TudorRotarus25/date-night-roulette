import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Date Night Roulette",
    short_name: "Roulette",
    description: "Spin to decide where we're eating tonight.",
    start_url: "/",
    display: "standalone",
    background_color: "#130e1f",
    theme_color: "#130e1f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
