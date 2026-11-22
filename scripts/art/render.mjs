// Renders the original artworks into src/assets/art/*.jpg (high-quality masters; Astro derives AVIF/WebP).
//   node scripts/art/render.mjs [name ...] [--preview] [--gpu]
//   --preview renders at 1/3 size into .cache. --gpu uses the hardware GPU (much faster) instead of SwiftShader.
//   "hero-leaves" writes the blurred leaf silhouette used by the live hero sculpture for its leaf shadows.
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2), preview = args.includes("--preview"), gpu = args.includes("--gpu"), only = args.filter((a) => !a.startsWith("--"));
const cache = resolve("node_modules/.cache/art"); mkdirSync(cache, { recursive: true });
await build({ entryPoints: ["scripts/art/scene.ts"], bundle: true, format: "iife", globalName: "ART", outfile: `${cache}/scene.js`, logLevel: "error", loader: { ".json": "json" } });
writeFileSync(`${cache}/index.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0"><script src="scene.js"></script>`);
const browser = await chromium.launch({ args: gpu ? ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.error("page:", m.text()); });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`file://${cache}/index.html`);
// Real application screenshots (src/assets/projects) cropped to their key region, for the project compositions.
const crop = async (file, [x, y, w, h]) => `data:image/jpeg;base64,${(await sharp(file).extract({ left: x, top: y, width: w, height: h }).jpeg({ quality: 95 }).toBuffer()).toString("base64")}`;
const assets = {
  "fold-shot": await crop("src/assets/projects/fold-studio.jpg", [504, 0, 1872, 1170]),
  "dieline-shot": await crop("src/assets/projects/dieline-creator.jpg", [504, 72, 1872, 1170]),
};
await page.evaluate((a) => { window.ART_ASSETS = a; }, assets);
const names = await page.evaluate(() => ART.ARTWORKS.map((a) => a.name));
const outDir0 = resolve("src/assets/art");
if (!only.length || only.includes("hero-leaves")) {
  const url = await page.evaluate(() => ART.renderLeaves(512));
  await sharp(Buffer.from(url.split(",")[1], "base64")).greyscale().blur(4).toColourspace("b-w").png({ compressionLevel: 9 }).toFile(`${outDir0}/hero-leaves.png`);
  console.log("hero-leaves: written");
}
const outDir = preview ? `${cache}/preview` : resolve("src/assets/art"); mkdirSync(outDir, { recursive: true });
for (const name of names.filter((n) => !only.length || only.includes(n))) {
  const t0 = Date.now();
  const url = await page.evaluate(async ([n, s]) => ART.renderArt(ART.ARTWORKS.find((a) => a.name === n), s), [name, preview ? 3 : 1]);
  const png = Buffer.from(url.split(",")[1], "base64");
  await sharp(png).jpeg({ quality: preview ? 85 : 92, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(`${outDir}/${name}.jpg`);
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
