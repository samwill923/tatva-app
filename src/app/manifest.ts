import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tatva · Prescription Scanner",
    short_name: "Tatva",
    description: "Scan a handwritten prescription and understand your medicines, diet and lifestyle.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F3EE",
    theme_color: "#F5F3EE",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
