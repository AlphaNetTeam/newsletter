import type { MetadataRoute } from "next";
import { SITE_URL, SYMBOLS } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return Object.keys(SYMBOLS).map((symbol) => ({
    url: `${SITE_URL}/${symbol}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: symbol === "BTC" ? 1 : 0.8,
  }));
}
