import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nawa Arabic Study Room",
    short_name: "Nawa",
    description: "Serious Modern Standard Arabic study on desktop and mobile.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    prefer_related_applications: false,
    background_color: "#fbf8f0",
    theme_color: "#15372a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
