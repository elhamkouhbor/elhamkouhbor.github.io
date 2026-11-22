// End-to-end checks against the production build in dist/ (run `npm run build` first).
//   npm test
// Static checks (CNAME, SEO, content rules) + browser checks with playwright-core (needs a Chromium:
// `npx playwright install chromium`) at desktop, tablet and mobile sizes, with and without reduced motion.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { build } from "esbuild";
import sharp from "sharp";

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
const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
check(["/", "/sv/", "/fa/"].every((p) => sitemap.includes(`<loc>${SITE}${p}</loc>`)) && (sitemap.match(/hreflang=/g) ?? []).length === 12, "sitemap lists all three languages with alternates");
check(/<html lang="en" dir="ltr"/.test(html), "document language set");
check((html.match(/<h1[\s>]/g) ?? []).length === 1, "exactly one h1");
check(!/\bstudent\b/i.test(text), "copy never describes her as a student");
check(!/cacao/i.test(html), "no classroom exercise (CACAO NOIR) featured");
check(!/mailto:|tel:|instagram\.com|behance\.net|linkedin\.com/i.test(html), "no unverified contact details");
const external = [...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith(SITE) && !u.startsWith("https://schema.org"));
const allowed = ["https://github.com/elhamkouhbor", "https://github.com/elhamkouhbor/fold", "https://github.com/elhamkouhbor/Dieline", "https://github.com/elhamkouhbor/color-lab", "https://github.com/elhamkouhbor/kashi-studio"];
check(external.every((u) => allowed.includes(u)), "only verified external links (GitHub profile and project repos)", external.join(", "));
// Copy rules: no em/en dashes or semicolons in anything a visitor can read or hear.
const readable = [text, ...[...html.matchAll(/(?:alt|aria-label|content|title)="([^"]*)"/g)].map((m) => m[1]), (html.match(/<title>([^<]*)/) ?? [])[1] ?? ""]
  .join(" \n ").replace(/&#39;|&amp;|&quot;/g, " ");
const badPunct = readable.match(/.{0,30}[—–;].{0,30}/g)?.filter((m) => !/https?:|width=device|initial-scale/.test(m)) ?? [];
check(badPunct.length === 0, "visible copy uses no em dashes, en dashes or semicolons", badPunct.slice(0, 3).join(" | "));
check(html.includes('href="/fold/"') && html.includes('href="/Dieline/"') && html.includes('href="/color-lab/"') && html.includes('href="/kashi-studio/"'), "project links point at the live Fold, Dieline, Color Lab and Kashi Studio tools");
check(/Digital Designer/.test(text), "introduces her as a Digital Designer");
check(!/<img[^>]*(portrait|profile)/i.test(html), "no portrait imagery");
check(!/https?:\/\/(?!www\.elhamkouhbor\.com|schema\.org|github\.com\/elhamkouhbor|www\.w3\.org)[^"' )]+\.(jpe?g|png|webp|avif|gif)/i.test(html), "no hotlinked images");
for (const h of ["Elham", "Kouhbor", "Selected work", "Fold", "Dieline", "Color Lab", "Kashi Studio", "Practice", "Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "CAD", "Thanks for visiting."]) check(text.includes(h), `copy present: ${h}`);
check(!/skill|expert|master|%<\//i.test(text), "no skill bars, percentages or expert labels");

check(!/rel="modulepreload"[^>]*live\./.test(html), "3D hero renderer is not preloaded (loaded lazily)");

// ---------- Language versions ----------
console.log("\nLanguages");
const LANGS = [
  { lang: "en", path: "/", dir: "ltr", copy: ["Selected work", "Practice", "Thanks for visiting."] },
  { lang: "sv", path: "/sv/", dir: "ltr", copy: ["Utvalda arbeten", "Inriktning", "Tack för besöket.", "Digital designer", "Öppna Color Lab", "Öppna Kashi Studio"] },
  { lang: "fa", path: "/fa/", dir: "rtl", copy: ["نمونه‌کارهای منتخب", "رویکرد", "از بازدید شما سپاسگزارم.", "طراح دیجیتال", "باز کردن Color Lab", "باز کردن Kashi Studio", "۰۴"] },
];
for (const L of LANGS) {
  const h = readFileSync(join(dist, L.path, "index.html"), "utf8");
  const t = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  check(new RegExp(`<html lang="${L.lang}" dir="${L.dir}"`).test(h), `${L.lang}: lang and direction (${L.dir})`);
  check(h.includes(`<link rel="canonical" href="${SITE}${L.path}">`), `${L.lang}: canonical URL`);
  check(LANGS.every((o) => h.includes(`<link rel="alternate" hreflang="${o.lang}" href="${SITE}${o.path}">`)) && h.includes('hreflang="x-default"'), `${L.lang}: hreflang alternates for every language`);
  check(LANGS.every((o) => new RegExp(`<a href="${o.path}" hreflang="${o.lang}" lang="${o.lang}"[^>]*${o.lang === L.lang ? 'aria-current="page"' : ""}`).test(h)), `${L.lang}: language switcher links to every version, current one marked`);
  check(L.copy.every((c) => t.includes(c)), `${L.lang}: translated copy present`, L.copy.filter((c) => !t.includes(c)).join(", "));
  check(h.includes('href="/fold/"') && h.includes('href="/Dieline/"') && h.includes('href="/color-lab/"') && h.includes('href="/kashi-studio/"'), `${L.lang}: project links point at the live tools`);
  const ext = [...h.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith(SITE));
  check(ext.every((u) => allowed.includes(u)), `${L.lang}: only verified external links`, ext.join(", "));
  const read = [t, ...[...h.matchAll(/(?:alt|aria-label|content|title)="([^"]*)"/g)].map((m) => m[1])].join(" \n ").replace(/&#39;|&amp;|&quot;/g, " ");
  const bad = read.match(/.{0,30}[—–;؛].{0,30}/g)?.filter((m) => !/https?:|width=device|initial-scale/.test(m)) ?? [];
  check(bad.length === 0, `${L.lang}: copy uses no em dashes, en dashes or semicolons`, bad.slice(0, 3).join(" | "));
  check(!/\bstudent\b|\bstudent(en)?\b|دانشجو/i.test(t), `${L.lang}: never describes her as a student`);
  check((h.match(/<h1[\s>]/g) ?? []).length === 1, `${L.lang}: exactly one h1`);
  if (L.lang !== "en") check(!/Selected work|Thanks for visiting|Back to top|Skip to content/.test(t), `${L.lang}: no English interface text left`);
}

// ---------- Hero sculpture geometry over its loop ----------
console.log("\nHero sculpture (geometry over one full loop)");
{
  const out = await build({ entryPoints: ["scripts/sculpture-check.ts"], bundle: true, platform: "node", format: "esm", write: false, logLevel: "error" });
  const { run } = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
  const r = run(120);
  check(r.seam.every((s) => s.shape < 1e-6), "loop is seamless: last shape equals the first");
  check(r.seam.every((s) => s.velocity < 0.02), "loop is seamless: motion keeps its speed across the boundary", JSON.stringify(r.seam));
  check(r.top > 0.08, "sculpture stays below the header", r.top.toFixed(3));
  check(r.left > 0.2 && r.right < 0.9, "sculpture stays inside the composition", `${r.left.toFixed(3)}–${r.right.toFixed(3)}`);
  check(r.mutual > 20, "the two paper bands never touch", String(r.mutual));
  check(r.self > 20, "no band passes through itself", String(r.self));
  check(r.wall < 10, "paper never pushes through the wall", r.wall.toFixed(1));
  check(r.stretch < 0.002, "paper keeps its length (no stretching)", r.stretch.toExponential(2));
  const c = r.closing;
  check(c.crest[1] - c.crest[0] > 120, `closing: the far ends rise and settle with the hero (crest ${c.crest[0].toFixed(0)}–${c.crest[1].toFixed(0)})`);
  check(c.seam < 1e-3, "closing: loop is seamless");
  check(c.top > 0.15 && c.bottom < 0.98, "closing: waves stay inside the band", `${c.top.toFixed(3)}–${c.bottom.toFixed(3)}`);
  check(c.mutual > 20 && c.wall < 10, "closing: no collisions, paper stays off the wall", `${c.mutual} / ${c.wall.toFixed(1)}`);
  check(c.stretch < 0.002, "closing: paper keeps its length", c.stretch.toExponential(2));
}

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

const runs = [];
for (const vp of viewports) for (const reduced of [false, true]) runs.push({ vp, reduced, L: LANGS[0] });
for (const L of LANGS.slice(1)) for (const vp of [viewports[0], viewports[2]]) runs.push({ vp, reduced: L.lang === "sv", L });
for (const { vp, reduced, L } of runs) {
  console.log(`\n${L.lang} · ${vp.name}${reduced ? " · reduced motion" : ""}`);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [], badResponses = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));
  await page.goto(base + L.path, { waitUntil: "networkidle" });
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
  if (L.lang === "fa") {
    check(r.fonts.some((f) => /Vazirmatn/.test(f)), "Vazirmatn loaded for Persian text");
    const rtl = await page.evaluate(() => {
      const t = document.querySelector(".hero__text").getBoundingClientRect(), a = document.querySelector(".hero__art").getBoundingClientRect();
      return { dir: getComputedStyle(document.body).direction, textRight: Math.round(innerWidth - t.right), heroArtLeft: Math.round(a.left), family: getComputedStyle(document.querySelector(".lead")).fontFamily };
    });
    check(rtl.dir === "rtl", "page flows right to left");
    check(/Vazirmatn/.test(rtl.family), "Persian text set in Vazirmatn");
    if (vp.name === "desktop") check(rtl.heroArtLeft <= 1, "hero sculpture sits on the left, away from the right-aligned text", `art left ${rtl.heroArtLeft}`);
  } else check(!r.fonts.some((f) => /Vazirmatn/.test(f)), "Persian font not downloaded on this page");
  check(r.anchors.length === 0, "all in-page anchors resolve", r.anchors.join(", "));
  if (reduced) check(!r.animClass, "reduced motion: animation gate off");
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
  const hero = await page.evaluate(() => { const i = document.querySelector(".hero__art img"); return { img: !!i && i.complete && i.naturalWidth > 0 && getComputedStyle(i).visibility !== "hidden", canvas: document.querySelectorAll("canvas.sculpture__live").length }; });
  check(hero.img, "hero image shown (never blank)");
  const closingImg = await page.evaluate(() => { const i = document.querySelector(".closing__art img"); return !!i && i.complete && i.naturalWidth > 0; });
  check(closingImg, "closing image shown (never blank)");
  if (reduced) check(hero.canvas === 0, "reduced motion: static images, no 3D animation");
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

// ---------- Live hero on a real GPU (skipped where only software WebGL exists, e.g. CI) ----------
{
  const gpu = await chromium.launch({ args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"] }).catch(() => null);
  const probe = gpu && await (await gpu.newPage()).evaluate(() => { const g = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true }); return g ? g.getParameter(g.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ?? g.RENDERER) : null; });
  if (!probe || /SwiftShader|llvmpipe|software/i.test(probe)) console.log("\nLive hero (GPU): skipped, no hardware WebGL here");
  else {
    console.log(`\nLive hero (GPU: ${probe.replace(/\s*\(0x[0-9A-F]+\)/gi, "")})`);
    const S = () => document.querySelector('[data-sculpture="hero"]').sculpture;
    for (const vp of [viewports[0], viewports[2]]) {
      const page = await gpu.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.isMobile ? 3 : 1 });
      const errors = []; page.on("console", (m) => m.type() === "error" && errors.push(m.text())); page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/", { waitUntil: "load" });
      const live = await page.waitForFunction(() => document.querySelector(".hero canvas.sculpture__live.is-live"), null, { timeout: 15000 }).then(() => true, () => false);
      check(live, `${vp.name}: live sculpture fades in over the image`);
      if (!live) { await page.close(); continue; }
      await page.waitForTimeout(4500);
      const a = await page.evaluate((f) => eval(f)().state(), `(${S})`);
      check(a.fps >= (vp.isMobile ? 27 : 50), `${vp.name}: smooth frame rate (${a.fps.toFixed(0)} fps at ${a.pixelRatio}× resolution)`);
      // the first frame of the loop matches the static image it replaces (seamless hand-off)
      const shot = async () => (await sharp(await page.locator(".hero__art").screenshot()).resize(240, 200, { fit: "fill" }).removeAlpha().raw().toBuffer());
      const diff = (x, y) => { let d = 0; for (let i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]); return d / x.length; };
      await page.evaluate(() => { document.documentElement.classList.remove("intro"); const c = document.querySelector(".hero canvas.sculpture__live"); c.style.transition = "none"; c.style.animation = "none"; });
      await page.addStyleTag({ content: ".hero__stage{animation:none!important}" });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(300);
      await page.evaluate((f) => eval(f)().renderAt(0), `(${S})`);
      const live0 = await shot();
      await page.evaluate((f) => eval(f)().renderAt(1 - 1e-6), `(${S})`); const live1 = await shot();
      await page.evaluate((f) => eval(f)().renderAt(0.5), `(${S})`); const mid = await shot();
      await page.evaluate(() => { document.querySelector(".hero canvas.sculpture__live").style.opacity = "0"; }); await page.waitForTimeout(100);
      const poster = await shot();
      await page.evaluate(() => { document.querySelector(".hero canvas.sculpture__live").style.opacity = ""; });
      check(diff(live0, live1) < 0.5, `${vp.name}: no jump at the loop boundary (Δ ${diff(live0, live1).toFixed(2)})`);
      check(diff(live0, poster) < 6 && diff(live0, poster) < diff(live0, mid) / 2, `${vp.name}: first frame matches the static image (Δ ${diff(live0, poster).toFixed(1)}, mid-loop Δ ${diff(live0, mid).toFixed(1)})`);
      // pauses when the hero is out of view (the screenshots above scrolled it back in)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500);
      const p1 = (await page.evaluate((f) => eval(f)().state(), `(${S})`)); await page.waitForTimeout(1200); const p2 = (await page.evaluate((f) => eval(f)().state(), `(${S})`));
      check(!p2.running && p1.phase === p2.phase, `${vp.name}: animation pauses when the hero is off screen`);
      await page.evaluate((f) => eval(f)().resume(), `(${S})`);
      // the closing section shows the other ends of the same sheets, on the same clock as the hero
      const closingLive = await page.waitForFunction(() => document.querySelector(".closing canvas.sculpture__live.is-live"), null, { timeout: 15000 }).then(() => true, () => false);
      check(closingLive, `${vp.name}: closing view comes alive before it is reached`);
      if (closingLive) {
        await page.locator(".closing__art").scrollIntoViewIfNeeded(); await page.waitForTimeout(2500);
        const sync = await page.evaluate(() => { const c = document.querySelector('[data-sculpture="closing"]').sculpture.state(); return { phase: c.phase, clock: c.clock, fps: c.fps }; });
        const d = Math.min(Math.abs(sync.phase - sync.clock), 1 - Math.abs(sync.phase - sync.clock));
        check(d < 0.01, `${vp.name}: closing follows the shared page clock (Δ ${d.toFixed(4)})`);
        check(sync.fps >= (vp.isMobile ? 27 : 50), `${vp.name}: closing frame rate (${sync.fps.toFixed(0)} fps)`);
        const heroState = await page.evaluate((f) => eval(f)().state(), `(${S})`);
        check(!heroState.running, `${vp.name}: hero pauses while the closing runs`);
      }
      check(errors.length === 0, `${vp.name}: no console errors`, errors.slice(0, 3).join(" | "));
      await page.close();
    }
  }
  await gpu?.close();
}

// 404 page
const ctx = await browser.newContext();
const p404 = await ctx.newPage();
const res = await p404.goto(base + "/does-not-exist");
check(res.status() === 404 && ((await p404.textContent("h1")) ?? "").includes("could not be found"), "404 page served");
check((await p404.$$eval('.nf__other a', (a) => a.map((x) => x.getAttribute("href")))).join() === "/sv/,/fa/", "404 page links to the Swedish and Farsi home pages");
// switching language from the header keeps working
const pl = await ctx.newPage();
await pl.goto(base + "/");
await Promise.all([pl.waitForURL(base + "/fa/"), pl.click('.top__lang a[lang="fa"]')]);
check(await pl.evaluate(() => document.documentElement.dir === "rtl" && document.documentElement.lang === "fa"), "language switcher opens the Farsi page");
await Promise.all([pl.waitForURL(base + "/sv/"), pl.click('.top__lang a[lang="sv"]')]);
check(await pl.evaluate(() => document.documentElement.lang === "sv"), "language switcher opens the Swedish page");
await browser.close();
server.close();

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
