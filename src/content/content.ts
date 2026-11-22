// Page copy and image metadata.
//
// Writing rules for visible copy: short, plain sentences. No em dashes, en dashes or semicolons
// (scripts/test-site.mjs checks this). Describe what the projects do, not how they are built.
//
// Project images are renders that show the real application screenshots (src/assets/projects) on a
// panel, composed with one physical object. The background compositions are original renders from
// scripts/art. The hero image is the first frame of the live paper sculpture (src/scripts/sculpture).
import type { ImageMetadata } from "astro";
import heroRibbon from "../assets/art/hero-ribbon.jpg";
import projectFold from "../assets/art/project-fold.jpg";
import projectDieline from "../assets/art/project-dieline.jpg";
import closingWaves from "../assets/art/closing-waves.jpg";

export const hero = {
  kicker: "Digital Designer",
  intro: "Hi, I’m Elham. I’m a digital designer interested in visual communication, interactive experiences and the small details that make a design work.",
  cta: { href: "#work", label: "See selected work" },
  image: heroRibbon,
};

export interface Project {
  id: string;
  n: string;
  title: string;
  summary: string;
  body: string;
  meta: { label: string; value: string }[];
  link: { href: string; label: string };
  source: string;
  image: ImageMetadata;
  alt: string;
  caption: string;
}

export const projects: Project[] = [
  {
    id: "fold",
    n: "01",
    title: "Fold",
    summary: "An interactive workspace for seeing how a flat packaging design takes shape in 3D.",
    body: "Open a flat layout, add the artwork and fold it step by step. The finished box can be turned and checked from every side before anything is printed.",
    meta: [
      { label: "Type", value: "Web application" },
      { label: "Focus", value: "Interaction, 3D, structure" },
    ],
    link: { href: "/fold/", label: "Open Fold" },
    source: "https://github.com/elhamkouhbor/fold",
    image: projectFold,
    alt: "The Fold workspace on a screen leaning against a warm paper wall. A folded tea carton turns in the 3D view. A small sage paper carton stands beside the screen.",
    caption: "Fold running in the browser, with a paper carton for scale.",
  },
  {
    id: "dieline",
    n: "02",
    title: "Dieline",
    summary: "A drawing tool for precise packaging layouts, from first measurements to print-ready files.",
    body: "Pick a box style, enter the measurements and the layout is drawn to scale. Built-in checks and a folded preview help catch problems before the files go to print or cutting.",
    meta: [
      { label: "Type", value: "Web application" },
      { label: "Focus", value: "Layout, measurement, production" },
    ],
    link: { href: "/Dieline/", label: "Open Dieline" },
    source: "https://github.com/elhamkouhbor/Dieline",
    image: projectDieline,
    alt: "The Dieline tool on a screen showing a measured tray layout and its folded preview. A printed sheet of the same layout lies on the floor in front of it.",
    caption: "A tray layout in Dieline, next to a print of the same drawing.",
  },
];

export const practice = {
  title: "Practice",
  statement: "I work on digital design and visual communication. I care about clear typography, calm layouts and interfaces that are easy to understand.",
  note: "My projects often move between the screen and physical things, like the packaging tools shown above.",
  interestsLabel: "Interests",
  interests: ["Digital design", "Visual communication", "Typography", "Layout", "Interactive experiences"],
  toolsLabel: "Tools",
  // Original pictograms (src/components/ToolIcon.astro), not the product logos.
  tools: [
    { name: "Adobe Photoshop", icon: "image" },
    { name: "Adobe Illustrator", icon: "vector" },
    { name: "Adobe InDesign", icon: "layout" },
    { name: "CAD", icon: "drafting" },
  ] as { name: string; icon: "image" | "vector" | "layout" | "drafting" }[],
};

export const closing = {
  title: "Thanks for visiting.",
  text: "You can find more of my work and follow new projects on GitHub.",
  image: closingWaves,
};
