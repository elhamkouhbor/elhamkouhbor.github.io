// Editorial copy and image metadata. All imagery is original: procedural digital studies rendered by
// scripts/art (paper, fold and light). They are conceptual studies — never client or commissioned work.
import type { ImageMetadata } from "astro";
import pleatNocturne from "../assets/art/pleat-nocturne.jpg";
import pleatIvory from "../assets/art/pleat-ivory.jpg";
import fanBurgundy from "../assets/art/fan-burgundy.jpg";
import brassRibbon from "../assets/art/brass-ribbon.jpg";
import cutRings from "../assets/art/cut-rings.jpg";
import cartonStudy from "../assets/art/carton-study.jpg";
import ekPaper from "../assets/art/ek-paper.jpg";
import embossGrazing from "../assets/art/emboss-grazing.jpg";

export interface Study {
  id: string;
  image: ImageMetadata;
  title: string;
  subject: string;
  alt: string;
  /** Focal point used for art-directed crops (CSS object-position). */
  focus?: string;
}

export const hero = {
  image: pleatNocturne,
  alt: "Conceptual study: a column of ivory paper folded into a herringbone pleat, lit from one side against a deep plum background.",
};

export const studiesIntro = {
  kicker: "Chapter 02",
  title: ["A Study in", "Form & Expression"],
  lede:
    "Paper remembers every decision made to it. These studies follow a single sheet through pleat, fan, cut and emboss — asking how little light it takes for a surface to become an object, and an object to become a feeling.",
  label: "Conceptual studies · digital renders exploring paper, fold and light · not client work",
};

/** The study that expands to full width as it scrolls into view. */
export const featureStudy: Study = {
  id: "pleat-ivory",
  image: pleatIvory,
  title: "Study I — Rhythm",
  subject: "A Miura pleat: one sheet, one repeated decision, two hundred facets of light.",
  alt: "Conceptual study: a wide ivory sheet folded in a precise zig-zag pleat, its facets alternating between light and shadow.",
  focus: "50% 45%",
};

export const studies: Study[] = [
  {
    id: "fan-burgundy",
    image: fanBurgundy,
    title: "Study II — Radiance",
    subject: "A pleated fan in deep burgundy, opening like a held breath.",
    alt: "Conceptual study: a burgundy paper fan folded in fine radial pleats, opened into a semicircle on ivory.",
    focus: "50% 55%",
  },
  {
    id: "brass-ribbon",
    image: brassRibbon,
    title: "Study III — Lustre",
    subject: "The same pleat in brushed brass — structure rendered as ornament.",
    alt: "Conceptual study: a folded sheet of brass catching warm highlights on a dark ground.",
  },
  {
    id: "cut-rings",
    image: cutRings,
    title: "Study IV — Interval",
    subject: "Concentric cuts in sage, ivory, burgundy and brass; measured spacing, quiet colour.",
    alt: "Conceptual study: concentric paper rings in sage, ivory, burgundy and brass, seen from above with soft shadows.",
    focus: "50% 50%",
  },
  {
    id: "ek-paper",
    image: ekPaper,
    title: "Study V — Signature",
    subject: "The EK monogram, cut from thick stock and standing in raking light.",
    alt: "Conceptual study: the letters E and K cut from thick ivory board, standing upright and casting soft shadows.",
    focus: "50% 50%",
  },
  {
    id: "emboss-grazing",
    image: embossGrazing,
    title: "Study VI — Touch",
    subject: "A blind emboss under grazing light: a pattern you notice with the fingertips first.",
    alt: "Conceptual study: an ivory sheet with a blind-embossed geometric pattern revealed by low, grazing light.",
  },
];

export const flatToForm = {
  kicker: "Chapter 03",
  title: ["From Flat", "to Form"],
  lede:
    "Every box begins as a drawing that has to work twice: as a flat sheet that can be printed, cut and creased, and as an object that folds into its final shape. A dieline is where graphic design meets geometry.",
  points: [
    { term: "Cut", text: "Solid lines — where the blade goes through the board." },
    { term: "Crease", text: "Dashed lines — where the board is scored so it folds cleanly." },
    { term: "Tolerance", text: "Board thickness, flap clearances and glue areas, drawn to the millimetre." },
  ],
  demoTitle: "A tuck-lid tray, folded",
  demoNote: "Interactive illustration — drag the slider, or scroll, to fold the flat net into a box.",
  image: cartonStudy,
  imageAlt: "Conceptual study: three identical cartons on a sage ground — lying flat, half-folded and closed.",
  imageCaption: "Study VII — Sequence. Flat, half-folded, closed: one net, three moments.",
};

export const disciplines = [
  {
    n: "01",
    title: "Visual Alchemy",
    tool: "Adobe Photoshop",
    text: "Light, texture and atmosphere — composing images in which every surface carries mood as well as information.",
  },
  {
    n: "02",
    title: "Precision in Every Line",
    tool: "Adobe Illustrator",
    text: "Vector drawing where curves are deliberate and nothing is approximate: marks, letterforms and technical artwork.",
  },
  {
    n: "03",
    title: "The Art of Arrangement",
    tool: "Adobe InDesign",
    text: "Grids, hierarchy and pacing — typography arranged so a page reads clearly before it is even read.",
  },
  {
    n: "04",
    title: "From Flat to Form",
    tool: "CAD & structural design",
    text: "Dielines, cut and crease geometry and folding sequences — packaging thought through in two and three dimensions.",
  },
] as const;

export const philosophy = {
  kicker: "Chapter 05",
  quote: "Good design is felt before it is understood. Form gives it presence, function gives it purpose — and feeling is what makes it stay.",
  attribution: "Design philosophy",
};

export const closing = {
  kicker: "Chapter 06",
  title: ["Let’s Create", "Something Beautiful."],
  lede: "Ideas, collaborations and conversations about form are always welcome.",
};
