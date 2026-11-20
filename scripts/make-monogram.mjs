// Builds the EK monogram from Bodoni Moda (OFL-1.1) glyph outlines: the letters become plain SVG paths, so the
// favicon, the closing signature and the 3D artwork never depend on a web font being loaded.
//   node scripts/make-monogram.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import opentype from "opentype.js";

const font = opentype.parse(readFileSync("node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-700-normal.woff").buffer);
const size = 100;
const glyph = (ch, x) => font.getPath(ch, x, 0, size);
const box = (p) => p.getBoundingBox();
// E, then K tucked under E's arms: the K's stem sits a hair right of the E's serifs
const E = glyph("E", 0), eb = box(E);
const K0 = glyph("K", 0), kb0 = box(K0);
const overlap = (eb.x2 - eb.x1) * 0.16;
const K = glyph("K", eb.x2 - kb0.x1 - overlap), kb = box(K);
const x1 = Math.min(eb.x1, kb.x1), y1 = Math.min(eb.y1, kb.y1), x2 = Math.max(eb.x2, kb.x2), y2 = Math.max(eb.y2, kb.y2);
const r = (v) => Math.round(v * 100) / 100;
const shift = (p) => p.commands.map((c) => {
  const f = (k) => (c[k] === undefined ? "" : ` ${r(c[k] - (k.startsWith("x") ? x1 : y1))}`);
  if (c.type === "M" || c.type === "L") return `${c.type}${f("x")}${f("y")}`;
  if (c.type === "Q") return `Q${f("x1")}${f("y1")}${f("x")}${f("y")}`;
  if (c.type === "C") return `C${f("x1")}${f("y1")}${f("x2")}${f("y2")}${f("x")}${f("y")}`;
  return "Z";
}).join("");
const out = { E: shift(E), K: shift(K), width: r(x2 - x1), height: r(y2 - y1), kStemX: r(kb.x1 - x1) };
mkdirSync("src/assets/monogram", { recursive: true });
writeFileSync("src/assets/monogram/ek.json", JSON.stringify(out, null, 2) + "\n");

// Favicon: ink tile, ivory letters, a burgundy folded corner (the dieline motif)
const pad = 26, W = out.width + pad * 2, H = out.height + pad * 2, S = Math.max(W, H);
const ox = (S - out.width) / 2, oy = (S - out.height) / 2, c = S * 0.26;
writeFileSync("public/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(S)} ${r(S)}"><title>Elham Kouhbor</title><rect width="${r(S)}" height="${r(S)}" rx="${r(S * 0.12)}" fill="#282623"/><g fill="#F5F2EC" transform="translate(${r(ox)} ${r(oy)})"><path d="${out.E}"/><path d="${out.K}"/></g><path d="M${r(S - c)} 0H${r(S)}V${r(c)}Z" fill="#5F303C"/><path d="M${r(S - c)} 0L${r(S)} ${r(c)}" stroke="#BDA58E" stroke-width="${r(S * 0.012)}" stroke-dasharray="${r(S * 0.03)} ${r(S * 0.02)}"/></svg>\n`);
console.log(`monogram ${out.width} × ${out.height}`);
