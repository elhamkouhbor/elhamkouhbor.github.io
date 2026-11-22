// Page copy and image metadata, in English and Swedish.
//
// Writing rules for visible copy in every language: short, plain sentences. No em dashes, en dashes or
// semicolons (scripts/test-site.mjs checks this). Describe what the
// projects do, not how they are built. Product names (Fold, Dieline, Color Lab) and her name stay the same
// in both languages.
//
// Project images are renders that show the real application screenshots (src/assets/projects) on a
// panel, composed with one physical object. The background compositions are original renders from
// scripts/art. The hero image is the first frame of the live paper sculpture (src/scripts/sculpture).
import type { ImageMetadata } from "astro";
import type { Lang } from "../i18n/locales";
import heroRibbon from "../assets/art/hero-ribbon.jpg";
import projectFold from "../assets/art/project-fold.jpg";
import projectDieline from "../assets/art/project-dieline.jpg";
import projectColorLab from "../assets/art/project-colorlab.jpg";
import projectKashi from "../assets/art/project-kashi.jpg";
import closingWaves from "../assets/art/closing-waves.jpg";

export const images = { hero: heroRibbon, closing: closingWaves };

type ToolIcon = "image" | "vector" | "layout" | "drafting";

interface ProjectCopy {
  title: string;
  summary: string;
  body: string;
  meta: { label: string; value: string }[];
  linkLabel: string;
  alt: string;
  caption: string;
}

export interface Copy {
  site: { title: string; description: string; ogImageAlt: string };
  ui: {
    skip: string;
    home: string;
    primaryNav: string;
    language: string;
    nav: { work: string; practice: string };
    opensGithub: string;
    selectedWork: string;
    /** Screen reader text after "GitHub" on a project's source link. */
    repoFor: (title: string) => string;
    backToTop: string;
    footerNote: string;
  };
  hero: { kicker: string; intro: string; cta: string };
  projects: Record<"fold" | "dieline" | "color-lab" | "kashi-studio", ProjectCopy>;
  practice: { title: string; statement: string; note: string; interestsLabel: string; interests: string[]; toolsLabel: string };
  closing: { title: string; text: string };
  notFound: { title: string; text: string; home: string };
}

const en: Copy = {
  site: {
    title: "Elham Kouhbor, Digital Designer",
    description: "Elham Kouhbor is a digital designer interested in visual communication, typography, layout and interactive experiences.",
    ogImageAlt: "Elham Kouhbor, Digital Designer. A sheet of clay coloured paper curling in soft light.",
  },
  ui: {
    skip: "Skip to content",
    home: "Elham Kouhbor, home",
    primaryNav: "Primary",
    language: "Language",
    nav: { work: "Work", practice: "Practice" },
    opensGithub: "(opens GitHub profile)",
    selectedWork: "Selected work",
    repoFor: (t) => ` repository for ${t}`,
    backToTop: "Back to top",
    footerNote: "Project images show the real applications. All other images are original digital renders.",
  },
  hero: {
    kicker: "Digital Designer",
    intro: "Hi, I’m Elham. I’m a digital designer interested in visual communication, interactive experiences and the small details that make a design work.",
    cta: "See selected work",
  },
  projects: {
    fold: {
      title: "Fold",
      summary: "An interactive workspace for seeing how a flat packaging design takes shape in 3D.",
      body: "Open a flat layout, add the artwork and fold it step by step. The finished box can be turned and checked from every side before anything is printed.",
      meta: [
        { label: "Type", value: "Web application" },
        { label: "Focus", value: "Interaction, 3D, structure" },
      ],
      linkLabel: "Open Fold",
      alt: "The Fold workspace on a screen leaning against a warm paper wall. A folded tea carton turns in the 3D view. A small sage paper carton stands beside the screen.",
      caption: "Fold running in the browser, with a paper carton for scale.",
    },
    dieline: {
      title: "Dieline",
      summary: "A drawing tool for precise packaging layouts, from first measurements to print-ready files.",
      body: "Pick a box style, enter the measurements and the layout is drawn to scale. Built-in checks and a folded preview help catch problems before the files go to print or cutting.",
      meta: [
        { label: "Type", value: "Web application" },
        { label: "Focus", value: "Layout, measurement, production" },
      ],
      linkLabel: "Open Dieline",
      alt: "The Dieline tool on a screen showing a measured tray layout and its folded preview. A printed sheet of the same layout lies on the floor in front of it.",
      caption: "A tray layout in Dieline, next to a print of the same drawing.",
    },
    "color-lab": {
      title: "Color Lab",
      summary: "A colour tool for choosing palettes, checking that text stays readable and seeing how colours may look to people with colour vision deficiencies.",
      body: "Browse about 500 open palettes and try them on a website, a poster and an app screen. Contrast is checked as you edit, and a side by side view shows the same design with protanopia, deuteranopia or tritanopia.",
      meta: [
        { label: "Type", value: "Web application" },
        { label: "Focus", value: "Colour, accessibility, visual design" },
      ],
      linkLabel: "Open Color Lab",
      alt: "The Color Lab workspace on a screen leaning against a warm paper wall, showing a website in its original colours next to a deuteranopia simulation. An open paper colour fan leans against the screen.",
      caption: "Color Lab comparing a palette with a deuteranopia simulation, beside a paper colour fan.",
    },
    "kashi-studio": {
      title: "Kashi Studio",
      summary: "A vector studio for designing Persian tiles, from geometric girih to flowers, borders and medallions.",
      body: "Start from more than a hundred tile designs, some based on documented historical tiles, and change their geometry, motifs and colours. Every line stays editable, and finished designs are saved as vector files at their real size.",
      meta: [
        { label: "Type", value: "Web application" },
        { label: "Focus", value: "Pattern, ornament, vector design" },
      ],
      linkLabel: "Open Kashi Studio",
      alt: "The Kashi Studio workspace on a screen against a warm paper wall, showing a blue and white haft-rang tile panel with a central medallion. Two glazed tiles made from Kashi Studio designs stand and lie in front of it.",
      caption: "A haft-rang panel in Kashi Studio, with two glazed tiles from its designs.",
    },
  },
  practice: {
    title: "Practice",
    statement: "I work on digital design and visual communication. I care about clear typography, calm layouts and interfaces that are easy to understand.",
    note: "My projects often move between the screen and physical things, like the packaging tools shown above.",
    interestsLabel: "Interests",
    interests: ["Digital design", "Visual communication", "Typography", "Layout", "Interactive experiences"],
    toolsLabel: "Tools",
  },
  closing: {
    title: "Thanks for visiting.",
    text: "You can find more of my work and follow new projects on GitHub.",
  },
  notFound: { title: "This page could not be found.", text: "The address may have changed. Everything is on the home page.", home: "Return home" },
};

const sv: Copy = {
  site: {
    title: "Elham Kouhbor, digital designer",
    description: "Elham Kouhbor är digital designer med intresse för visuell kommunikation, typografi, layout och interaktiva upplevelser.",
    ogImageAlt: "Elham Kouhbor, digital designer. Ett ark lerfärgat papper som rullar sig i mjukt ljus.",
  },
  ui: {
    skip: "Hoppa till innehållet",
    home: "Elham Kouhbor, startsida",
    primaryNav: "Huvudmeny",
    language: "Språk",
    nav: { work: "Arbeten", practice: "Inriktning" },
    opensGithub: "(öppnar GitHub-profilen)",
    selectedWork: "Utvalda arbeten",
    repoFor: (t) => `, källkoden för ${t}`,
    backToTop: "Till toppen",
    footerNote: "Projektbilderna visar de riktiga applikationerna. Alla andra bilder är egna digitala renderingar.",
  },
  hero: {
    kicker: "Digital designer",
    intro: "Hej, jag heter Elham. Jag är digital designer och intresserad av visuell kommunikation, interaktiva upplevelser och de små detaljerna som får en design att fungera.",
    cta: "Se utvalda arbeten",
  },
  projects: {
    fold: {
      title: "Fold",
      summary: "En interaktiv arbetsyta där du ser hur en platt förpackningsdesign tar form i 3D.",
      body: "Öppna en platt layout, lägg till grafiken och vik den steg för steg. Den färdiga asken kan vridas och granskas från alla håll innan något trycks.",
      meta: [
        { label: "Typ", value: "Webbapplikation" },
        { label: "Fokus", value: "Interaktion, 3D, struktur" },
      ],
      linkLabel: "Öppna Fold",
      alt: "Arbetsytan i Fold på en skärm som lutar mot en varm pappersvägg. En vikt tekartong vrids i 3D-vyn. En liten salviagrön papperskartong står bredvid skärmen.",
      caption: "Fold i webbläsaren, med en papperskartong som visar storleken.",
    },
    dieline: {
      title: "Dieline",
      summary: "Ett ritverktyg för exakta förpackningslayouter, från de första måtten till tryckfärdiga filer.",
      body: "Välj en asktyp och ange måtten, så ritas layouten i skala. Inbyggda kontroller och en vikt förhandsvisning hjälper dig att hitta problem innan filerna går till tryck eller stansning.",
      meta: [
        { label: "Typ", value: "Webbapplikation" },
        { label: "Fokus", value: "Layout, mått, produktion" },
      ],
      linkLabel: "Öppna Dieline",
      alt: "Verktyget Dieline på en skärm som visar en måttsatt layout för ett tråg och dess vikta förhandsvisning. Ett tryckt ark med samma layout ligger på golvet framför.",
      caption: "En layout för ett tråg i Dieline, bredvid en utskrift av samma ritning.",
    },
    "color-lab": {
      title: "Color Lab",
      summary: "Ett färgverktyg för att välja paletter, se till att texten förblir läsbar och se hur färger kan uppfattas av personer med nedsatt färgseende.",
      body: "Bläddra bland ungefär 500 öppna paletter och prova dem på en webbplats, en affisch och en appskärm. Kontrasten kontrolleras medan du redigerar, och en vy sida vid sida visar samma design med protanopi, deuteranopi eller tritanopi.",
      meta: [
        { label: "Typ", value: "Webbapplikation" },
        { label: "Fokus", value: "Färg, tillgänglighet, visuell design" },
      ],
      linkLabel: "Öppna Color Lab",
      alt: "Arbetsytan i Color Lab på en skärm som lutar mot en varm pappersvägg. Den visar en webbplats i originalfärgerna bredvid en simulering av deuteranopi. En uppslagen färgsolfjäder i papper lutar mot skärmen.",
      caption: "Color Lab jämför en palett med en simulering av deuteranopi, bredvid en färgsolfjäder i papper.",
    },
    "kashi-studio": {
      title: "Kashi Studio",
      summary: "En vektorstudio för persiska kakelplattor, från geometrisk girih till blommor, bårder och medaljonger.",
      body: "Utgå från över hundra kakelmönster, varav några bygger på dokumenterade historiska plattor, och ändra geometri, motiv och färger. Varje linje går att redigera, och färdiga mönster sparas som vektorfiler i verklig storlek.",
      meta: [
        { label: "Typ", value: "Webbapplikation" },
        { label: "Fokus", value: "Mönster, ornamentik, vektordesign" },
      ],
      linkLabel: "Öppna Kashi Studio",
      alt: "Arbetsytan i Kashi Studio på en skärm mot en varm pappersvägg. Den visar en blåvit haft-rang-panel med en medaljong i mitten. Två glaserade plattor med mönster från Kashi Studio står och ligger framför skärmen.",
      caption: "En haft-rang-panel i Kashi Studio, med två glaserade plattor från dess mönster.",
    },
  },
  practice: {
    title: "Inriktning",
    statement: "Jag arbetar med digital design och visuell kommunikation. Jag bryr mig om tydlig typografi, lugna layouter och gränssnitt som är lätta att förstå.",
    note: "Mina projekt rör sig ofta mellan skärmen och fysiska saker, som förpackningsverktygen ovan.",
    interestsLabel: "Intressen",
    interests: ["Digital design", "Visuell kommunikation", "Typografi", "Layout", "Interaktiva upplevelser"],
    toolsLabel: "Verktyg",
  },
  closing: {
    title: "Tack för besöket.",
    text: "Du hittar fler av mina arbeten och kan följa nya projekt på GitHub.",
  },
  notFound: { title: "Sidan kunde inte hittas.", text: "Adressen kan ha ändrats. Allt finns på startsidan.", home: "Till startsidan" },
};

export const copy: Record<Lang, Copy> = { en, sv };

export interface Project extends ProjectCopy {
  id: keyof Copy["projects"];
  n: string;
  link: string;
  source: string;
  image: ImageMetadata;
}

const projectBase = [
  { id: "fold", n: "01", link: "/fold/", source: "https://github.com/elhamkouhbor/fold", image: projectFold },
  { id: "dieline", n: "02", link: "/Dieline/", source: "https://github.com/elhamkouhbor/Dieline", image: projectDieline },
  { id: "color-lab", n: "03", link: "/color-lab/", source: "https://github.com/elhamkouhbor/color-lab", image: projectColorLab },
  { id: "kashi-studio", n: "04", link: "/kashi-studio/", source: "https://github.com/elhamkouhbor/kashi-studio", image: projectKashi },
] as const;

export function projects(lang: Lang): Project[] {
  return projectBase.map((p) => ({ ...p, ...copy[lang].projects[p.id] }));
}

// Original pictograms (src/components/ToolIcon.astro), not the product logos. Product names are not translated.
export const tools: { name: string; icon: ToolIcon }[] = [
  { name: "Adobe Photoshop", icon: "image" },
  { name: "Adobe Illustrator", icon: "vector" },
  { name: "Adobe InDesign", icon: "layout" },
  { name: "CAD", icon: "drafting" },
];
