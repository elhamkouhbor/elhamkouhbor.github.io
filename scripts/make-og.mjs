// Generates public/og.jpg (1200×630 social card) and PNG icons from public/favicon.svg.
//   node scripts/make-og.mjs     (needs a Chromium for playwright-core: npx playwright install chromium)
import { chromium } from "playwright-core";
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const font = (pkg, match) => {
  const dir = `${root}/node_modules/${pkg}/files`;
  return `data:font/woff2;base64,${readFileSync(`${dir}/${readdirSync(dir).find((f) => match.test(f))}`).toString("base64")}`;
};
const serif = font("@fontsource-variable/fraunces", /^fraunces-latin-opsz-normal\.woff2$/);
const manrope = font("@fontsource-variable/manrope", /latin-wght-normal\.woff2$/);
const art = `data:image/jpeg;base64,${(await sharp(`${root}/src/assets/art/hero-ribbon.jpg`).resize(1400).jpeg({ quality: 88 }).toBuffer()).toString("base64")}`;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: F; src: url(${serif}); font-weight: 100 900; }
@font-face { font-family: M; src: url(${manrope}); font-weight: 200 800; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; background: #F1E2D2; color: #23201D; font-family: M; }
.art { position: absolute; inset: 0 0 0 auto; width: 800px; background: url(${art}) 70% 50% / cover;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 35%); }
.t { position: absolute; left: 80px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
p { margin: 0; font-size: 15px; letter-spacing: .28em; text-transform: uppercase; font-weight: 600; color: #5E574F; display: flex; align-items: center; gap: 18px; }
p::after { content: ""; width: 56px; height: 1px; background: #B8674A; }
h1 { margin: 0; font-family: F; font-weight: 320; font-size: 118px; line-height: .95; letter-spacing: -.035em; font-optical-sizing: auto; }
</style>
<div class="art"></div>
<div class="t"><p>Digital Designer</p><h1>Elham<br>Kouhbor</h1></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: "png" });
await browser.close();
await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(`${root}/public/og.jpg`);

const svg = readFileSync(`${root}/public/favicon.svg`);
await sharp(svg, { density: 300 }).resize(32, 32).png().toFile(`${root}/public/favicon-32.png`);
await sharp(svg, { density: 600 }).resize(180, 180).flatten({ background: "#282623" }).png().toFile(`${root}/public/apple-touch-icon.png`);
console.log("og.jpg, favicon-32.png, apple-touch-icon.png written");
