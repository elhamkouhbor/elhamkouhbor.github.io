// Renders the original artworks into src/assets/art/*.jpg (high-quality masters; Astro derives AVIF/WebP).
//   node scripts/art/render.mjs [name ...] [--preview]      --preview renders at 1/3 size into .cache
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2), preview = args.includes("--preview"), only = args.filter((a) => !a.startsWith("--"));
const cache = resolve("node_modules/.cache/art"); mkdirSync(cache, { recursive: true });
await build({ entryPoints: ["scripts/art/scene.ts"], bundle: true, format: "iife", globalName: "ART", outfile: `${cache}/scene.js`, logLevel: "error", loader: { ".json": "json" } });
writeFileSync(`${cache}/index.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0"><script src="scene.js"></script>`);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.error("page:", m.text()); });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`file://${cache}/index.html`);
const names = await page.evaluate(() => ART.ARTWORKS.map((a) => a.name));
const outDir = preview ? `${cache}/preview` : resolve("src/assets/art"); mkdirSync(outDir, { recursive: true });
for (const name of names.filter((n) => !only.length || only.includes(n))) {
  const t0 = Date.now();
  const url = await page.evaluate(async ([n, s]) => ART.renderArt(ART.ARTWORKS.find((a) => a.name === n), s), [name, preview ? 3 : 1]);
  const png = Buffer.from(url.split(",")[1], "base64");
  await sharp(png).jpeg({ quality: preview ? 85 : 92, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(`${outDir}/${name}.jpg`);
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
