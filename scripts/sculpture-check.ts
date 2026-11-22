// Invariants of the hero sculpture over its loop (run by scripts/test-site.mjs through esbuild).
//  - seamless loop: shape and velocity match across the boundary
//  - framing: the lifted paper stays inside the composition (top margin for the header, clear of the text)
//  - no collisions between the two bands, no self-intersection, no paper pushed through the wall
//  - the paper never stretches (constant length)
import { PerspectiveCamera, Vector3 } from "three";
import { Band, MAIN, SAGE, VIEWS, poseAt, slack, stateAt, tailPose, CLAY_TAIL, SAGE_TAIL, type BandDef, type BandState, type View } from "../src/scripts/sculpture/shape";

const camera = (v: View) => {
  const c = new PerspectiveCamera(v.camera.fov, v.frame.width / v.frame.height, 50, 9000);
  c.position.set(...v.camera.pos); c.lookAt(new Vector3(...v.camera.focus)); c.updateMatrixWorld(); c.updateProjectionMatrix(); return c;
};
let cam = camera(VIEWS.hero);
const flat = (s: BandState) => [s.lift[0], s.lift[1], s.heading, s.lifted, s.drift, s.tilt, s.twist, s.spiral, ...s.kappa];
const pos = (b: Band) => b.front.attributes.position.array as Float32Array;

function seam(def: BandDef) {
  // largest jump in shape and in velocity across the loop boundary, relative to each parameter's range over the loop
  const e = 1e-4, n = 400, all = Array.from({ length: n }, (_, i) => flat(stateAt(def, i / n)));
  const range = all[0].map((_, i) => Math.max(...all.map((s) => s[i])) - Math.min(...all.map((s) => s[i])) + 1e-9);
  const a = flat(stateAt(def, 0)), b = flat(stateAt(def, 1 - 1e-9));
  const v0 = flat(stateAt(def, e)).map((x, i) => (x - a[i]) / e), v1 = flat(stateAt(def, 1 - e)).map((x, i) => (a[i] - x) / e);
  return { shape: Math.max(...a.map((x, i) => Math.abs(x - b[i]) / range[i])), velocity: Math.max(...v0.map((x, i) => Math.abs(x - v1[i]) / range[i])) };
}
function bbox(b: Band) {
  const p = pos(b), v = new Vector3(); let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (let k = 0; k < p.length; k += 3) { if (p[k + 1] < 5) continue; v.set(p[k], p[k + 1], p[k + 2]).project(cam); const x = v.x * 0.5 + 0.5, y = 0.5 - v.y * 0.5; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
}
function minDist(a: Band, b: Band | null, cell = 30) {
  const pa = pos(a), pb = b ? pos(b) : pa, ws = a.def.ws + 1, H = new Map<string, number[]>(), key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let k = 0; k < pb.length; k += 3) { const id = key(Math.floor(pb[k] / cell), Math.floor(pb[k + 1] / cell), Math.floor(pb[k + 2] / cell)); (H.get(id) ?? H.set(id, []).get(id)!).push(k / 3); }
  const rowLen = a.length / a.def.seg; let best = Infinity;
  for (let k = 0; k < pa.length; k += 3) {
    if (pa[k + 1] < 6) continue;
    const cx = Math.floor(pa[k] / cell), cy = Math.floor(pa[k + 1] / cell), cz = Math.floor(pa[k + 2] / cell), ia = Math.floor(k / 3 / ws);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (const q of H.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
      if (!b && Math.abs(Math.floor(q / ws) - ia) * rowLen < 1.6 * a.def.width) continue; // neighbours along the sheet
      if (pb[q * 3 + 1] < 6) continue;
      best = Math.min(best, Math.hypot(pa[k] - pb[q * 3], pa[k + 1] - pb[q * 3 + 1], pa[k + 2] - pb[q * 3 + 2]));
    }
  }
  return best;
}
function wall(b: Band, r = 420) { // penetration of lifted paper into the cyclorama (floor curving into the back wall)
  const p = pos(b); let w = 0;
  for (let k = 0; k < p.length; k += 3) { const y = p[k + 1], z = p[k + 2]; if (y < 80) continue;
    w = Math.max(w, z >= 0 ? 0 : y >= r ? -r - z : Math.hypot(z, y - r) - r); }
  return w;
}
function length(b: Band) { const p = pos(b), ws = b.def.ws + 1, j = Math.floor(ws / 2); let L = 0;
  for (let i = 1; i <= b.def.seg; i++) { const a = ((i - 1) * ws + j) * 3, c = (i * ws + j) * 3; L += Math.hypot(p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]); } return L; }

export function run(steps = 120) {
  // hero: the sculpture itself
  cam = camera(VIEWS.hero);
  const main = new Band(MAIN, poseAt(MAIN, 0)), sage = new Band(SAGE, poseAt(SAGE, 0)), L0 = [length(main), length(sage)];
  const r = { seam: [seam(MAIN), seam(SAGE)], top: 1, left: 1, right: 0, mutual: Infinity, self: Infinity, wall: 0, wallAt: 0, stretch: 0,
    closing: { top: 1, bottom: 0, left: 1, right: 0, mutual: Infinity, wall: 0, stretch: 0, crest: [Infinity, 0], seam: 0, minHeight: Infinity } };
  for (let i = 0; i < steps; i++) {
    const ph = i / steps; main.update(poseAt(MAIN, ph)); sage.update(poseAt(SAGE, ph));
    const bm = bbox(main), bs = bbox(sage);
    r.top = Math.min(r.top, bm.y0, bs.y0); r.left = Math.min(r.left, bm.x0); r.right = Math.max(r.right, bs.x1);
    r.mutual = Math.min(r.mutual, minDist(main, sage)); r.self = Math.min(r.self, minDist(main, null), minDist(sage, null));
    const w = Math.max(wall(main, VIEWS.hero.sweep[3]), wall(sage, VIEWS.hero.sweep[3])); if (w > r.wall) { r.wall = w; r.wallAt = ph; }
    r.stretch = Math.max(r.stretch, Math.abs(length(main) / L0[0] - 1), Math.abs(length(sage) / L0[1] - 1));
  }
  // closing: the far ends of the same sheets, driven by the paper the hero releases
  cam = camera(VIEWS.closing);
  const c = r.closing, clay = new Band(CLAY_TAIL, tailPose(CLAY_TAIL, 0)), sg = new Band(SAGE_TAIL, tailPose(SAGE_TAIL, 0)), T0 = [length(clay), length(sg)];
  for (let i = 0; i < steps; i++) {
    const ph = i / steps; clay.update(tailPose(CLAY_TAIL, ph)); sg.update(tailPose(SAGE_TAIL, ph));
    const a = bbox(clay), b = bbox(sg);
    c.top = Math.min(c.top, a.y0, b.y0); c.bottom = Math.max(c.bottom, a.y1, b.y1); c.left = Math.min(c.left, a.x0); c.right = Math.max(c.right, b.x1);
    c.mutual = Math.min(c.mutual, minDist(clay, sg)); c.wall = Math.max(c.wall, wall(clay, VIEWS.closing.sweep[3]), wall(sg, VIEWS.closing.sweep[3]));
    c.stretch = Math.max(c.stretch, Math.abs(length(clay) / T0[0] - 1), Math.abs(length(sg) / T0[1] - 1));
    const crest = Math.max(...tailPose(CLAY_TAIL, ph).pts.map((p) => p[1]));
    c.crest = [Math.min(c.crest[0], crest), Math.max(c.crest[1], crest)];
    c.minHeight = Math.min(c.minHeight, crest);
  }
  c.seam = Math.abs(Math.max(...tailPose(CLAY_TAIL, 0).pts.map((p) => p[1])) - Math.max(...tailPose(CLAY_TAIL, 1 - 1e-9).pts.map((p) => p[1])));
  // the tails really are driven by the hero: their wave follows the paper the hero releases
  r.closing.seam = c.seam;
  return { ...r, slackRange: [Math.min(...Array.from({ length: 60 }, (_, i) => slack(MAIN, i / 60))), Math.max(...Array.from({ length: 60 }, (_, i) => slack(MAIN, i / 60)))] };
}
