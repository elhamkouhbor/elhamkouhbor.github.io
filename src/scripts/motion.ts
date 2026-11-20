// Motion layer. Content is fully visible without this script; html.anim (set in <head> only when the
// visitor allows motion) pre-hides reveal targets, and this script animates them in. Native scrolling
// throughout — ScrollTrigger only observes, it never hijacks the wheel or pins the page.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initFold } from "./fold";

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---------- Fold demo (always interactive) ----------
const foldRoot = document.querySelector<HTMLElement>("[data-fold]");
const fold = foldRoot ? initFold(foldRoot) : null;

// ---------- Header: chapter indicator + light/dark tone (always on, no motion involved) ----------
const header = document.querySelector<HTMLElement>("[data-header]");
const chapterN = document.querySelector<HTMLElement>("[data-chapter-n]");
const chapterTitle = document.querySelector<HTMLElement>("[data-chapter-title]");
const sections = [...document.querySelectorAll<HTMLElement>("section[data-chapter]")];
const updateHeader = () => {
  const probe = 48; // px from the top: the line the header sits on
  let current = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top <= probe) current = s;
  if (!current || !header) return;
  if (chapterN) chapterN.textContent = current.dataset.chapter ?? "";
  if (chapterTitle) chapterTitle.textContent = current.dataset.chapterTitle ?? "";
  // Footer and dark chapters flip the header to ivory.
  const darkUnder = sections.some((s) => s.dataset.tone === "dark" && s.getBoundingClientRect().top <= probe && s.getBoundingClientRect().bottom > probe)
    || (document.querySelector(".footer")?.getBoundingClientRect().top ?? Infinity) <= probe;
  header.dataset.tone = darkUnder ? "dark" : "light";
};
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", updateHeader);
updateHeader();

// ---------- Choreography (motion allowed only) ----------
function animate() {
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("anim-ready");
  const ease = "expo.out";
  gsap.set("[data-mask] > span > span", { y: 0, yPercent: 105 });

  // 01 — Arrival: monogram draws itself, the name rises, the column of light opens.
  const mono = document.querySelector<SVGSVGElement>("[data-monogram]");
  const tl = gsap.timeline({ defaults: { ease } });
  if (mono) {
    const glyphs = mono.querySelectorAll(".monogram__glyph");
    const corner = mono.querySelector(".monogram__corner");
    const crease = mono.querySelector(".monogram__crease");
    gsap.set(glyphs, { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0 });
    gsap.set(corner, { opacity: 0, scale: 0.4, transformOrigin: "100% 0%" });
    gsap.set(crease, { opacity: 0 });
    tl.to(glyphs, { strokeDashoffset: 0, duration: 1.6, stagger: 0.25, ease: "power2.inOut" }, 0.15)
      .to(glyphs, { fillOpacity: 1, duration: 0.9, ease: "power1.out" }, 1.15)
      .to(corner, { opacity: 1, scale: 1, duration: 0.9 }, 1.35)
      .to(crease, { opacity: 1, duration: 0.6 }, 1.7);
  }
  const arrival = document.querySelector<HTMLElement>("#arrival");
  if (arrival) {
    tl.to(arrival.querySelectorAll("[data-mask] > span > span"), { yPercent: 0, duration: 1.5, stagger: 0.14 }, 0.55)
      .fromTo("[data-hero-frame]", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "expo.inOut" }, 0.35)
      .fromTo("[data-hero-img]", { scale: 1.25 }, { scale: 1, duration: 2.4, ease }, 0.35)
      .to(arrival.querySelectorAll(".arrival__role"), { opacity: 1, y: 0, duration: 1.1 }, 1.25)
      .to(arrival.querySelectorAll(".arrival__word"), { opacity: 1, y: 0, duration: 1.1, stagger: 0.18 }, 1.45)
      .to(arrival.querySelectorAll("figcaption, .arrival__scroll"), { opacity: 1, y: 0, duration: 1 }, 1.9);
    // Gentle drift of the hero column as the page leaves.
    gsap.to("[data-hero-img]", { yPercent: 8, ease: "none", scrollTrigger: { trigger: arrival, start: "top top", end: "bottom top", scrub: true } });
  }
  // Generic reveals outside the hero.
  ScrollTrigger.batch(gsap.utils.toArray<HTMLElement>("[data-reveal]").filter((el) => !el.closest("#arrival")), {
    start: "top 88%",
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease, overwrite: true }),
  });
  gsap.utils.toArray<HTMLElement>("[data-mask]").filter((el) => !el.closest("#arrival")).forEach((el) => {
    gsap.to(el.querySelectorAll(":scope > span > span"), {
      yPercent: 0, duration: 1.4, stagger: 0.12, ease,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // 02 — The feature study widens to the full bleed as it crosses the viewport.
  const frame = document.querySelector<HTMLElement>("[data-expand-frame]");
  if (frame) {
    const from = window.matchMedia("(max-width: 760px)").matches ? "inset(4% 8% 4% 8%)" : "inset(6% 14% 6% 14%)";
    gsap.fromTo(frame, { clipPath: from }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none",
      scrollTrigger: { trigger: frame, start: "top 85%", end: "center 50%", scrub: 0.6 },
    });
  }
  // Subtle parallax inside image frames.
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((img) => {
    gsap.fromTo(img, { yPercent: -3, scale: 1.07 }, {
      yPercent: 3, scale: 1.07, ease: "none",
      scrollTrigger: { trigger: img.closest("figure") ?? img, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // 03 — Scroll folds the net until the visitor takes the slider.
  if (fold && foldRoot) {
    ScrollTrigger.create({
      trigger: foldRoot, start: "top 75%", end: "bottom 45%", scrub: 0.5,
      onUpdate: (st) => { if (!fold.userControlled) fold.set(st.progress); },
    });
  }

  // 04 — Rules draw across as each discipline arrives.
  gsap.utils.toArray<HTMLElement>("[data-rule]").forEach((rule) => {
    gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: rule, start: "top 88%" } });
  });

  // 05 — The philosophy lights up word by word with the scroll.
  const quote = document.querySelector<HTMLElement>("[data-quote]");
  if (quote) {
    gsap.to(quote.querySelectorAll(".philo__w"), {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: quote, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  }

  // Images/fonts can shift layout after load; keep trigger positions honest.
  window.addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (!reduced.matches && root.classList.contains("anim")) {
  try { animate(); } catch (err) { root.classList.remove("anim"); console.error(err); }
} else {
  root.classList.remove("anim");
  if (fold && reduced.matches) fold.set(0.6); // show a meaningful static fold state
}
