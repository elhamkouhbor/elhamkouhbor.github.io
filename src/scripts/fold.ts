// Fold demo controller: maps progress p ∈ [0,1] to hinge angles, shading and crease highlights.
// Works without GSAP; motion.ts can drive it from scroll until the visitor takes over.

type Mat = number[]; // 3×3 row-major
const mul = (a: Mat, b: Mat): Mat => {
  const o: Mat = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c]! += a[r * 3 + k]! * b[k * 3 + c]!;
  return o;
};
const rx = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const ry = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const I: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
// Key light in panel space (CSS: x right, y down, z toward the viewer of the flat net).
const L = (() => { const v = [-0.45, -0.55, 0.7]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

export interface FoldController { set(p: number, fromUser?: boolean): void; readonly userControlled: boolean; readonly progress: number }

export function initFold(root: HTMLElement): FoldController {
  const scene = root.querySelector<HTMLElement>("[data-fold-scene]")!;
  const stage = root.querySelector<HTMLElement>("[data-fold-stage]")!;
  const range = root.querySelector<HTMLInputElement>("[data-fold-range]")!;
  const out = root.querySelector<HTMLOutputElement>("[data-fold-out]")!;
  const panels = Object.fromEntries([...root.querySelectorAll<HTMLElement>("[data-panel]")].map((el) => [el.dataset.panel!, el]));
  const creases = [...root.querySelectorAll<SVGPathElement>("[data-crease]")];
  let progress = 0;
  let userControlled = false;

  const shade = (el: HTMLElement | undefined, m: Mat) => {
    if (!el) return;
    const n = [m[2]!, m[5]!, m[8]!]; // panel normal (local +z) in scene space
    const d = n[0]! * L[0]! + n[1]! * L[1]! + n[2]! * L[2]!;
    el.style.setProperty("--shade-in", (0.32 * (1 - Math.max(0, d))).toFixed(3));
    el.style.setProperty("--shade-out", (0.32 * (1 - Math.max(0, -d))).toFixed(3));
  };

  const render = () => {
    const p = progress;
    const a1 = 90 * seg(p, 0, 0.5), a2 = 90 * seg(p, 0.45, 0.82), a3 = 88 * seg(p, 0.78, 1);
    scene.style.setProperty("--a1", a1.toFixed(2));
    scene.style.setProperty("--a2", a2.toFixed(2));
    scene.style.setProperty("--a3", a3.toFixed(2));
    const back = rx(-a1), lid = mul(back, rx(-a2)), tuck = mul(lid, rx(-a3));
    shade(panels.base, I); shade(panels.front, rx(a1)); shade(panels.back, back);
    shade(panels.left, ry(a1)); shade(panels.right, ry(-a1)); shade(panels.lid, lid); shade(panels.tuck, tuck);
    for (const c of creases) {
      const id = c.dataset.crease;
      const t = id === "walls" ? seg(p, 0, 0.5) : id === "lid" ? seg(p, 0.45, 0.82) : seg(p, 0.78, 1);
      c.toggleAttribute("data-active", t > 0.02 && t < 0.98);
    }
    const pct = Math.round(p * 100);
    range.value = String(pct);
    out.value = `${pct}%`;
    range.setAttribute("aria-valuetext", pct === 0 ? "Flat" : pct === 100 ? "Folded and closed" : `${pct}% folded`);
  };

  range.addEventListener("input", () => { userControlled = true; progress = Number(range.value) / 100; render(); });

  // Drag to turn the view (pointer only; the slider is the accessible control).
  let spin = -28, tilt = 58, drag: { x: number; y: number; spin: number; tilt: number } | null = null;
  stage.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, spin, tilt };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    spin = drag.spin - (e.clientX - drag.x) * 0.4;
    if (e.pointerType === "mouse") tilt = Math.min(80, Math.max(25, drag.tilt - (e.clientY - drag.y) * 0.25));
    scene.style.setProperty("--spin", `${spin}deg`);
    scene.style.setProperty("--tilt", `${tilt}deg`);
  });
  const end = () => { drag = null; };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  render();
  return {
    set(p: number, fromUser = false) { if (fromUser) userControlled = true; progress = clamp01(p); render(); },
    get userControlled() { return userControlled; },
    get progress() { return progress; },
  };
}
