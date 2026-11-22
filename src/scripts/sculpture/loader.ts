// Brings the static sculpture images to life ([data-sculpture="hero" | "closing"]).
// The hero starts after the page has loaded; the closing view starts about a screen before it scrolls into
// view, so its fade-in has finished by the time it is seen. Both share one clock (live.ts): they show the
// two ends of the same sheets of paper. Reduced motion, Save-Data, software-only WebGL or any error keep
// the static images.
type Stage = HTMLElement & { sculpture?: unknown };
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const started = new WeakSet<Element>();

function capable() {
  if (reduce.matches) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  try { // software-only WebGL (no GPU) would be slow and drain the battery: keep the images there
    const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch { return false; }
}
let ok: boolean | undefined;

function start(stage: Stage) {
  const img = stage.querySelector("img");
  if (!img || started.has(stage) || !(ok ??= capable())) return;
  started.add(stage);
  const view = stage.dataset.sculpture === "closing" ? "closing" : "hero";
  import("./live")
    .then((m) => m.mount(stage, img, view))
    .then((s) => { stage.sculpture = s; }) // inspected by the tests
    .catch(() => { /* the static image stays */ });
}

function init() {
  ok = undefined;
  const stages = [...document.querySelectorAll<Stage>("[data-sculpture]")];
  const hero = stages.find((s) => s.dataset.sculpture === "hero");
  if (hero) start(hero);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { start(e.target as Stage); io.unobserve(e.target); }
  }, { rootMargin: "120% 0px" });
  for (const s of stages) if (s !== hero) io.observe(s);
}
const later = () => ("requestIdleCallback" in window ? requestIdleCallback(init, { timeout: 2000 }) : setTimeout(init, 600));
if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
reduce.addEventListener("change", () => { if (!reduce.matches) later(); });
