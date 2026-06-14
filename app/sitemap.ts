import type { MetadataRoute } from "next";
import { bills } from "@/content/bills";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/bills/`, changeFrequency: "daily" as const, priority: 0.8 },
    ...bills.map((b) => ({
      url: `${SITE_URL}/bills/${b.id}/`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/about/limits/`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/participate/`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/about/corrections/`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/about/changelog/`, changeFrequency: "weekly" as const, priority: 0.4 },
  ];
}
