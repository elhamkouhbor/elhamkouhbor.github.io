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
const bodoni = font("@fontsource-variable/bodoni-moda", /latin-opsz-normal\.woff2$/);
const bodoniItalic = font("@fontsource-variable/bodoni-moda", /latin-opsz-italic\.woff2$/);
const manrope = font("@fontsource-variable/manrope", /latin-wght-normal\.woff2$/);
const art = `data:image/jpeg;base64,${(await sharp(`${root}/src/assets/art/pleat-nocturne.jpg`).resize(520).jpeg({ quality: 90 }).toBuffer()).toString("base64")}`;
const ek = JSON.parse(readFileSync(`${root}/src/assets/monogram/ek.json`, "utf8"));

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: B; src: url(${bodoni}); font-weight: 400 900; }
@font-face { font-family: B; src: url(${bodoniItalic}); font-style: italic; font-weight: 400 900; }
@font-face { font-family: M; src: url(${manrope}); font-weight: 200 800; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { background: #F5F2EC; color: #282623; display: grid; grid-template-columns: 1fr 430px; font-family: M; }
.l { padding: 64px 0 60px 72px; display: flex; flex-direction: column; justify-content: space-between; }
svg { width: 120px; }
h1 { margin: 0; font-family: B; font-weight: 400; font-size: 112px; line-height: .86; text-transform: uppercase; letter-spacing: -.01em; }
h1 span { display: block; padding-left: .42em; font-style: italic; text-transform: none; color: #5F303C; letter-spacing: -.02em; }
p { margin: 0; font-size: 15px; letter-spacing: .26em; text-transform: uppercase; font-weight: 600; color: #57524B; }
.t { margin-top: 14px; font-family: B; font-style: italic; font-size: 30px; letter-spacing: 0; text-transform: none; font-weight: 400; color: #282623; }
.t i:nth-child(2) { color: #6E735F; } .t i:nth-child(3) { color: #5F303C; }
.r { background: #2A2224 url(${art}) center 40% / cover; }
</style>
<div class="l">
  <svg viewBox="0 0 ${ek.width + 20} ${ek.height + 20}"><g transform="translate(10 10)" fill="#282623"><path d="${ek.E}"/><path d="${ek.K}"/></g>
  <path d="M ${ek.width - 2} 0 H ${ek.width + 20} V 22 Z" fill="#5F303C"/></svg>
  <div><h1>Elham<span>Kouhbor</span></h1></div>
  <div><p>Digital Design &amp; Visual Exploration</p><p class="t"><i>Form.</i> <i>Function.</i> <i>Feeling.</i></p></div>
</div>
<div class="r"></div>`;

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
