// End-to-end checks against the production build in dist/ (run `npm run build` first).
//   npm test
// Static checks (CNAME, SEO, content rules) + browser checks with playwright-core (needs a Chromium:
// `npx playwright install chromium`) at desktop, tablet and mobile sizes, with and without reduced motion.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";

const dist = resolve("dist");
const SITE = "https://www.elhamkouhbor.com";
let failures = 0, passes = 0;
const check = (ok, name, detail = "") => {
  if (ok) { passes++; console.log(`  ✓ ${name}`); }
  else { failures++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

// ---------- Static checks ----------
console.log("Static output");
if (!existsSync(join(dist, "index.html"))) { console.error("dist/index.html missing — run `npm run build` first."); process.exit(1); }
const html = readFileSync(join(dist, "index.html"), "utf8");
const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
check(readFileSync(join(dist, "CNAME"), "utf8") === "www.elhamkouhbor.com", "CNAME is exactly www.elhamkouhbor.com");
check(html.includes(`<link rel="canonical" href="${SITE}/">`), "canonical URL");
check(html.includes(`property="og:image" content="${SITE}/og.jpg"`), "og:image absolute URL");
check(existsSync(join(dist, "og.jpg")) && statSync(join(dist, "og.jpg")).size < 300_000, "og.jpg present and < 300 kB");
for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png", "robots.txt", "sitemap.xml", "404.html"]) check(existsSync(join(dist, f)), `${f} present`);
check(readFileSync(join(dist, "sitemap.xml"), "utf8").includes(`<loc>${SITE}/</loc>`), "sitemap lists the canonical URL");
check(/<html lang="en"/.test(html), "document language set");
check((html.match(/<h1[\s>]/g) ?? []).length === 1, "exactly one h1");
check(!/\bstudent\b/i.test(text), "copy never describes her as a student");
check(!/cacao/i.test(html), "no classroom exercise (CACAO NOIR) featured");
check(!/mailto:|tel:|instagram\.com|behance\.net|linkedin\.com/i.test(html), "no unverified contact details");
const external = [...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith(SITE) && !u.startsWith("https://schema.org"));
check(external.every((u) => u === "https://github.com/elhamkouhbor"), "only verified external link (GitHub)", external.join(", "));
check(html.includes('href="/fold/"') && html.includes('href="/Dieline/"'), "project links point at the live Fold and Dieline tools");
check(/Digital Designer/.test(text), "introduces her as a Digital Designer");
check(!/<img[^>]*(portrait|profile)/i.test(html), "no portrait imagery");
check(!/https?:\/\/(?!www\.elhamkouhbor\.com|schema\.org|github\.com\/elhamkouhbor|www\.w3\.org)[^"' )]+\.(jpe?g|png|webp|avif|gif)/i.test(html), "no hotlinked images");
for (const h of ["Elham", "Kouhbor", "Selected work", "Fold", "Dieline", "Practice", "Photoshop", "Illustrator", "InDesign", "CAD", "Let’s create something meaningful."]) check(text.includes(h), `copy present: ${h}`);
check(!/skill|expert|master|%<\//i.test(text), "no skill bars, percentages or expert labels");

// ---------- Browser checks ----------
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = join(dist, p);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404, { "content-type": "text/html" }); res.end(readFileSync(join(dist, "404.html"))); return; }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }); res.end(readFileSync(file));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

for (const vp of viewports) for (const reduced of [false, true]) {
  console.log(`\n${vp.name}${reduced ? " · reduced motion" : ""}`);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [], badResponses = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(reduced ? 300 : 3200);

  // Scroll through to trigger lazy images and reveals.
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += vp.height * 0.6) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(reduced ? 60 : 250); }
  await page.waitForTimeout(reduced ? 300 : 1800);
  await page.waitForLoadState("networkidle");

  const r = await page.evaluate(() => {
    const imgs = [...document.images];
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src).filter((s) => s),
      noAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
      formats: [...new Set(imgs.map((i) => (i.currentSrc.match(/\.(\w+)(\?|$)/) ?? [])[1]).filter(Boolean))],
      hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
      fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      anchors: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.querySelector(h)),
      animClass: document.documentElement.classList.contains("anim"),
    };
  });
  check(r.overflow <= 0, "no horizontal overflow", `${r.overflow}px`);
  check(r.broken.length === 0, "all images loaded", r.broken.slice(0, 3).join(", "));
  check(r.noAlt === 0, "every image has alt text");
  check(r.formats.includes("avif") || r.formats.includes("webp"), `modern image formats served (${r.formats.join(", ")})`);
  check(r.hidden === 0, "all revealed content visible after scrolling", `${r.hidden} still hidden`);
  check(r.fonts.some((f) => /Fraunces/.test(f)) && r.fonts.some((f) => /Manrope/.test(f)), "Fraunces + Manrope loaded");
  check(r.anchors.length === 0, "all in-page anchors resolve", r.anchors.join(", "));
  if (reduced) check(!r.animClass, "reduced motion: animation gate off");
  check(errors.length === 0, "no console errors", errors.slice(0, 3).join(" | "));
  check(badResponses.length === 0, "no failed requests", badResponses.slice(0, 3).join(", "));

  // Primary navigation reaches each section.
  for (const id of ["work", "practice"]) {
    await page.click(`header a[href="#${id}"]`);
    await page.waitForTimeout(reduced ? 150 : 900);
    const top = await page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id);
    check(Math.abs(top) < 40, `nav link #${id} scrolls to its section`, `top=${top}`);
  }
  await ctx.close();
}

// 404 page
const ctx = await browser.newContext();
const p404 = await ctx.newPage();
const res = await p404.goto(base + "/does-not-exist");
check(res.status() === 404 && ((await p404.textContent("h1")) ?? "").includes("folded away"), "404 page served");
await browser.close();
server.close();

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
