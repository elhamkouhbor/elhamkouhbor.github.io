import type { APIRoute } from "astro";
import { site } from "../config/site";
import { langs, locales } from "../i18n/locales";

// One page in three languages. Each URL lists all language versions (hreflang alternates).
export const GET: APIRoute = () => {
  const url = (path: string) => new URL(path, site.url).href;
  const alts = langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${locales[l].tag}" href="${url(locales[l].path)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${url("/")}"/>`).join("\n");
  const urls = langs.map((l) => `  <url>\n    <loc>${url(locales[l].path)}</loc>\n${alts}\n  </url>`).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
