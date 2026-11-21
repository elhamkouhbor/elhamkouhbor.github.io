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

Only add contact details once they are confirmed — nothing is shown for empty fields.

## Images

All images are rendered by `scripts/art/` (three.js scenes rendered offline in headless Chromium:
accumulated soft light, warm floor bounce, depth of field, paper tooth and thickness, and leaf
shadows cast by an invisible branch).

- `hero-ribbon`, `closing-waves`: curling sheets of clay, cream and sage paper.
- `project-fold`, `project-dieline`: the **real application screenshots** in
  `src/assets/projects/` shown on a slim panel, each with one physical object (a sage paper carton for
  Fold, a print of the same tray layout for Dieline). `render.mjs` crops the screenshots
  (see `assets` there). Retake the screenshots when the tools change, then re-render.

```bash
npm run art                      # re-render everything into src/assets/art/*.jpg
node scripts/art/render.mjs project-fold --preview   # quick 1/3-size preview into node_modules/.cache/art
npm run og                       # public/og.jpg social card + PNG icons from public/favicon.svg
npm run monogram                 # EK outlines (src/assets/monogram/ek.json) + public/favicon.svg
```

The JPEG masters are converted at build time by `astro:assets` into responsive AVIF/WebP sets.

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
- Motion is limited to a short staggered intro, a slow settle of the hero image, soft fade-ins and
  hover states. `prefers-reduced-motion: reduce` turns all of it off.
- Native scrolling (no scroll-jacking, no pinning, no animation library). Skip link, landmarks, one
  `h1`, descriptive alt text on project screenshots; decorative backgrounds are hidden from assistive tech.

## Licences

- Code: © Elham Kouhbor.
- Artwork and monogram: original, © Elham Kouhbor.
- Fonts: [Fraunces](https://github.com/undercasetype/Fraunces) and
  [Manrope](https://github.com/sharanda/manrope), SIL Open Font License 1.1, self-hosted via Fontsource.
  The favicon monogram is drawn from Bodoni Moda outlines (OFL).
- Astro, three.js (build-time only), sharp, playwright-core: MIT / Apache-2.0.
