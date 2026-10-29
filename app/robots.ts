import type { MetadataRoute } from "next";

// Crawlers may read the pages, which each ask not to be listed (app/layout.tsx); a page they
// could not read could still be listed from a link elsewhere. The API has nothing for them.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
