# elhamkouhbor.com

The personal site of **Elham Kouhbor**, Digital Designer. A single calm, editorial page: introduction,
two selected projects (Fold and Dieline), practice and tools, and a short closing with contact links.

Static site built with [Astro](https://astro.build), deployed to GitHub Pages by GitHub Actions on every
push to `main`. Custom domain: **https://www.elhamkouhbor.com** (`public/CNAME`).

## Develop

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build      # astro check (types) + production build → dist/
npm run preview    # serve dist/
npm test           # end-to-end checks against dist/ (build first)
```

Node ≥ 22.22 locally (CI uses Node 24). `npm test`, `npm run og` and `npm run art` drive a headless
Chromium through `playwright-core`; install one once with `npx playwright install chromium`.

Astro is pinned to 7.4.1, the newest release that runs on Node 22.22. On Node ≥ 22.23.4 it can be
upgraded with `npm i astro@7`.

## Editing content

| What | Where |
| --- | --- |
| Name, role, page title/description, navigation | `src/config/site.ts` |
| Contact links (GitHub, email, LinkedIn, Instagram, Behance) | `contact` in `src/config/site.ts` — `null` fields are not rendered |
| Hero text, project copy/links/alt text, disciplines, tools, closing line | `src/content/content.ts` |
| Colours, type scale, spacing | `src/styles/global.css` (`:root` tokens) |
| Motion | `src/scripts/reveal.ts` (IntersectionObserver fade-ins) and the CSS intro in `src/components/Hero.astro` |
| Hero sculpture (shapes, loop length) | `src/scripts/sculpture/shape.ts` (keyframes) and `live.ts` (renderer, lighting) |
| Tool pictograms | `src/components/ToolIcon.astro` |

Only add contact details once they are confirmed — nothing is shown for empty fields.

## Images

All images are rendered by `scripts/art/` (three.js scenes rendered offline in headless Chromium:
accumulated soft light, warm floor bounce, depth of field, paper tooth and thickness, and leaf
shadows cast by an invisible branch).

- `hero-ribbon`: the first frame of the live hero sculpture (see below), rendered offline at full quality.
- `hero-leaves.png`: the blurred leaf silhouette seen from the key light, used for the live leaf shadows.
- `closing-waves`: curling sheets of clay, cream and sage paper.
- `project-fold`, `project-dieline`: the **real application screenshots** in
  `src/assets/projects/` shown on a slim panel, each with one physical object (a sage paper carton for
  Fold, a print of the same tray layout for Dieline). `render.mjs` crops the screenshots
  (see `assets` there). Retake the screenshots when the tools change, then re-render.

```bash
npm run art                      # re-render everything into src/assets/art/*.jpg (add --gpu to use the graphics card)
node scripts/art/render.mjs hero-ribbon hero-leaves --gpu   # after changing the sculpture
node scripts/art/render.mjs project-fold --preview   # quick 1/3-size preview into node_modules/.cache/art
npm run og                       # public/og.jpg social card + PNG icons from public/favicon.svg
npm run monogram                 # EK outlines (src/assets/monogram/ek.json) + public/favicon.svg
```

The JPEG masters are converted at build time by `astro:assets` into responsive AVIF/WebP sets.

## Hero sculpture

The hero is a living artwork: two bands of paper that slowly change shape through a seamless 22 second
loop (curl, a tall arch turning towards the light, a tight scroll, a loose twisting curl, back to the curl).
It is real geometry, not a video or an image effect.

- `src/scripts/sculpture/shape.ts` describes each shape by how the paper bends along its length
  (curvature), where it lifts off the floor and how it twists. The loop interpolates these numbers with a
  periodic spline, so position and speed are continuous across the loop boundary, and the sheet keeps
  its length. The mesh (front, back and cut edges with real thickness) is rewritten in place each frame.
- `src/scripts/sculpture/live.ts` renders it with three.js: soft key and sky shadows, warm bounce light,
  and leaf shadows projected along the key light. It is a separate chunk, loaded only after the page
  has loaded, when motion is allowed, Save-Data is off and a hardware WebGL 2 context is available.
- The static hero image is the same scene at the start of the loop, so the canvas fades in over it without
  a visible change. The image stays underneath: reduced motion, software-only graphics, a failed
  download, a shader error or a lost context all leave (or fade back to) the image.
- Rendering pauses when the hero is off screen or the tab is hidden, is capped at 30 fps on phones,
  lowers its resolution when frames are slow and stops if the device cannot keep up.
- `npm test` checks the loop over one full cycle (seam, framing, no collisions, no stretching) and, where
  a GPU is available, the live canvas itself (frame rate, first frame against the image, pausing).

## Writing

Copy lives in `src/content/content.ts`. Keep it short and plain: describe what a project does for
people, not how it is built. Visible text uses no em dashes, en dashes or semicolons, and
`npm test` checks this (including alt text and meta descriptions).

## Deployment

`.github/workflows/deploy.yml` builds with `withastro/action` and publishes with
`actions/deploy-pages` on each push to `main` (or manually via *Actions → Deploy to GitHub Pages → Run
workflow*).

One-time repository settings (owner only):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Pages → Custom domain:** `www.elhamkouhbor.com`, then *Enforce HTTPS* once the
   certificate is issued.
3. DNS: `www` as a CNAME to `elhamkouhbor.github.io`; the apex `elhamkouhbor.com` with GitHub Pages
   A/AAAA records (GitHub then redirects apex → www).

## Accessibility & motion

- Content is in the HTML and visible without JavaScript. Fade-in targets are only pre-hidden when the
  visitor allows motion and scripts run; a watchdog reveals everything if the script never starts.
- Motion is limited to a short staggered intro, the slowly morphing hero sculpture, soft fade-ins and
  hover states. `prefers-reduced-motion: reduce` turns all of it off and shows the static hero image.
- Native scrolling (no scroll-jacking, no pinning, no animation library). Skip link, landmarks, one
  `h1`, descriptive alt text on project screenshots; decorative backgrounds are hidden from assistive tech.

## Licences

- Code: © Elham Kouhbor.
- Artwork and monogram: original, © Elham Kouhbor.
- Fonts: [Fraunces](https://github.com/undercasetype/Fraunces) and
  [Manrope](https://github.com/sharanda/manrope), SIL Open Font License 1.1, self-hosted via Fontsource.
  The favicon monogram is drawn from Bodoni Moda outlines (OFL).
- Astro, three.js (hero renderer and art pipeline), sharp, playwright-core, esbuild: MIT / Apache-2.0.
- Tool pictograms are original drawings, not the product logos.
