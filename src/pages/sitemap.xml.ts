import type { APIRoute } from "astro";
import { site } from "../config/site";

// Single-page site: one canonical URL.
export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site.url}/</loc></url>\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
