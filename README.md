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

- **Project images** (`src/assets/projects/`) are screenshots of the live tools, Fold Studio
  (`/fold/`) and Dieline Creator (`/Dieline/`). Retake them when the tools change.
- **Background compositions** (`src/assets/art/`) are original renders: sheets of paper curling in soft,
  leaf-dappled light, built procedurally in `scripts/art/` (three.js, rendered offline in headless
  Chromium; the leaf light comes from an invisible branch that only casts shadows).

```bash
npm run art                      # re-render every composition into src/assets/art/*.jpg
node scripts/art/render.mjs hero-ribbon --preview   # quick 1/3-size preview into node_modules/.cache/art
npm run og                       # public/og.jpg social card + PNG icons from public/favicon.svg
npm run monogram                 # EK outlines (src/assets/monogram/ek.json) + public/favicon.svg
```

The JPEG masters are converted at build time by `astro:assets` into responsive AVIF/WebP sets.
To add a project: put a screenshot in `src/assets/projects/`, import it in `src/content/content.ts` and
add an entry to `projects` (title, truthful summary, details, link, descriptive alt text).

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
