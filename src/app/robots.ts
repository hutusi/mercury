import type { MetadataRoute } from "next";
import { PROTECTED_PATHS } from "@/lib/routes";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The API and the auth-gated app pages aren't for crawlers. App pages are
      // locale-prefixed (/zh/dashboard), so block both the bare path and the
      // /*/… wildcard form; PROTECTED_PATHS is shared with the proxy's gate.
      disallow: ["/api/", ...PROTECTED_PATHS.flatMap((p) => [p, `/*${p}`])],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.host,
  };
}
