// Page copy and image metadata.
// Project descriptions are written from the live tools (see the links); project images are screenshots
// of those tools. Background compositions are original renders from scripts/art.
import type { ImageMetadata } from "astro";
import heroRibbon from "../assets/art/hero-ribbon.jpg";
import stageSage from "../assets/art/stage-sage.jpg";
import stageClay from "../assets/art/stage-clay.jpg";
import closingWaves from "../assets/art/closing-waves.jpg";
import foldShot from "../assets/projects/fold-studio.jpg";
import dielineShot from "../assets/projects/dieline-creator.jpg";

export const hero = {
  kicker: "Digital Designer",
  intro: "I design digital experiences and visual communication — from screen to structure, with care for clarity, form and the small details in between.",
  cta: { href: "#work", label: "Selected work" },
  image: heroRibbon,
  alt: "", // decorative composition: sheets of clay and cream paper curling in soft, leaf-dappled light
};

export interface Project {
  id: string;
  n: string;
  title: string;
  name: string;
  summary: string;
  details: string[];
  meta: { label: string; value: string }[];
  link: { href: string; label: string };
  shot: ImageMetadata;
  shotAlt: string;
  stage: ImageMetadata;
}

export const projects: Project[] = [
  {
    id: "fold",
    n: "01",
    title: "Fold",
    name: "Fold Studio",
    summary: "Exploring how flat structures become three-dimensional form.",
    details: [
      "A browser workspace that reads a flat dieline as SVG, finds its panels and creases, and folds it into a 3D object.",
      "Print, foil, spot-UV and emboss artwork can be layered onto the board, and the assembly is choreographed on an editable timeline.",
    ],
    meta: [
      { label: "Format", value: "Web application" },
      { label: "Focus", value: "Structure, 3D preview, interaction" },
    ],
    link: { href: "/fold/", label: "Open Fold Studio" },
    shot: foldShot,
    shotAlt: "Fold Studio in the browser: a tea carton folded in 3D at the centre, panel tools on the left, hinge angles on the right and an eight-step assembly timeline below.",
    stage: stageSage,
  },
  {
    id: "dieline",
    n: "02",
    title: "Dieline",
    name: "Dieline Creator",
    summary: "Precise packaging geometry, drawn and checked in the browser.",
    details: [
      "Choose a construction, set dimensions and board, and the drawing follows: cut, crease and glue lines with measured panels.",
      "Preflight checks, a 3D fold preview, sheet layout and SVG, DXF and PDF export sit beside the drawing — or start from a blank sheet.",
    ],
    meta: [
      { label: "Format", value: "Web application" },
      { label: "Focus", value: "Layout, geometry, technical drawing" },
    ],
    link: { href: "/Dieline/", label: "Open Dieline Creator" },
    shot: dielineShot,
    shotAlt: "Dieline Creator in the browser: a measured tray-with-lid dieline with dashed crease lines at the centre, dimension fields on the left and a folded 3D preview beside it.",
    stage: stageClay,
  },
];

export const practice = {
  title: "Practice",
  statement:
    "A cross-disciplinary practice in which image, typography and structure are considered together — so that what people see, read and use feels clear, calm and intentional.",
  disciplines: ["Visual Design", "Editorial Layout", "Interaction", "Digital Media", "Visual Communication"],
  tools: ["Photoshop", "Illustrator", "InDesign", "CAD"],
};

export const closing = {
  title: "Let’s create something meaningful.",
  image: closingWaves,
};
