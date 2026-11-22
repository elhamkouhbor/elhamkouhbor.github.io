// Invariants of the hero sculpture over its loop (run by scripts/test-site.mjs through esbuild).
//  - seamless loop: shape and velocity match across the boundary
//  - framing: the lifted paper stays inside the composition (top margin for the header, clear of the text)
//  - no collisions between the two bands, no self-intersection, no paper pushed through the wall
//  - the paper never stretches (constant length)
import { PerspectiveCamera, Vector3 } from "three";
import { Band, CAMERA, FRAME, MAIN, SAGE, stateAt, type BandDef, type BandState } from "../src/scripts/sculpture/shape";

const cam = new PerspectiveCamera(CAMERA.fov, FRAME.width / FRAME.height, 50, 9000);
cam.position.set(...CAMERA.pos); cam.lookAt(new Vector3(...CAMERA.focus)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
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
  const main = new Band(MAIN), sage = new Band(SAGE), L0 = [length(main), length(sage)];
  const r = { seam: [seam(MAIN), seam(SAGE)], top: 1, left: 1, right: 0, mutual: Infinity, self: Infinity, wall: 0, wallAt: 0, stretch: 0 };
  for (let i = 0; i < steps; i++) {
    const ph = i / steps; main.update(stateAt(MAIN, ph)); sage.update(stateAt(SAGE, ph));
    const bm = bbox(main), bs = bbox(sage);
    r.top = Math.min(r.top, bm.y0, bs.y0); r.left = Math.min(r.left, bm.x0); r.right = Math.max(r.right, bs.x1);
    r.mutual = Math.min(r.mutual, minDist(main, sage)); r.self = Math.min(r.self, minDist(main, null), minDist(sage, null));
    const w = Math.max(wall(main), wall(sage)); if (w > r.wall) { r.wall = w; r.wallAt = ph; }
    r.stretch = Math.max(r.stretch, Math.abs(length(main) / L0[0] - 1), Math.abs(length(sage) / L0[1] - 1));
  }
  return r;
}
