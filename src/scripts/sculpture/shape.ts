// The hero sculpture: two bands of paper whose shape evolves through a seamless loop.
//
// Shared by the live renderer (src/scripts/sculpture/live.ts) and the offline art pipeline
// (scripts/art/scene.ts), so the static hero image is exactly the first frame of the animation.
//
// Each band is a ruled surface around a Catmull-Rom centreline. Every keyframe has the same number of
// control points, the mesh topology never changes, and the paper keeps a constant length (the hidden start
// slides along the floor instead of the sheet stretching). Shape parameters are interpolated with a
// periodic spline in time, so position and velocity are both continuous across the loop boundary.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Vector3 } from "three";

export type Vec3 = [number, number, number];
/**
 * One shape of a band. The visible part is a bent sheet described by its curvature along its length
 * (as real paper bends): it lifts off the floor at `lift`, heading in direction `heading` (radians in the
 * floor plane, 0 = +x, negative turns into the room), and bends upward by `kappa` (curvature at evenly
 * spaced stations, 1/units). Morphing interpolates these numbers, so the sheet curls and uncurls
 * instead of points sliding between unrelated positions.
 */
export interface BandState {
  lift: [number, number];
  heading: number;
  /** Length of paper lifted off the floor (the rest slides along the floor behind the lift-off point). */
  lifted: number;
  kappa: number[];
  /** Sideways drift (perpendicular to the bending plane) accumulated over the bent length. */
  drift: number;
  /** Rotation of the cross direction about the tangent: tilt + twist·sin(πu) + spiral·u². */
  tilt: number;
  twist: number;
  spiral: number;
}
export interface BandDef {
  width: number;
  thick: number;
  /** Fixed points of the part lying flat on the floor, before the lift-off point. */
  lead: Vec3[];
  /** The sheet arrives at the lift-off point along its heading over this distance (a gentle turn on the floor). */
  approach: number;
  /** Longest lifted length (the paper length is fixed from the first state) and the number of centreline points sampled from it. */
  bent: number;
  samples: number;
  /** +1 or -1: which face of the paper faces the inside of the curl. */
  side: 1 | -1;
  /** Rows along the band and columns across it. */
  seg: number;
  ws: number;
  front: string;
  back: string;
  edge: string;
  states: BandState[];
}

export const CYCLE_SECONDS = 22;
export const PALETTE = { cream: "#EFE6DA", creamLit: "#F4ECE2", clay: "#B8674A", sage: "#8F9B82", edge: "#F4ECE2" };

/** Key light direction and the leaf branch that shades the scene (shared with the poster render). */
export const KEY_DIR: Vec3 = [-0.45, 0.62, 0.64];
export const GOBO = { at: [-200, 400, 0] as Vec3, dist: 1000, size: 1300 };

/** Camera and frame of the full composition (the hero image is this frame, cropped by CSS `object-fit`). */
export const FRAME = { width: 2800, height: 1700 };
export const CAMERA = { pos: [-250, 1000, 3900] as Vec3, target: [-500, 330, 0] as Vec3, fov: 30, focus: [-150, 420, 150] as Vec3 };

/** Terracotta and cream sheet: curl → turns and opens into a tall arch → rolls into a scroll → relaxes into a wave. */
export const MAIN: BandDef = {
  width: 1050, thick: 2.2, lead: [[-2600, 1, 2900], [-1700, 1, 1900]], approach: 700, bent: 1900, samples: 18, side: 1,
  seg: 220, ws: 20, front: PALETTE.creamLit, back: PALETTE.clay, edge: PALETTE.edge,
  states: [
    { lift: [-420, 300], heading: -0.25, lifted: 1900, kappa: [0.0014, 0.003, 0.0022, 0.0032, 0.004, 0.0038, 0.003], drift: -60, tilt: 0.12, twist: 0.22, spiral: 0 },
    { lift: [-260, 330], heading: -0.6, lifted: 1900, kappa: [0.0036, 0.0026, 0.0018, 0.0016, 0.0018, 0.0024, 0.003], drift: 0, tilt: 0.2, twist: 0.1, spiral: 0.1 },
    { lift: [-420, 350], heading: -0.35, lifted: 1900, kappa: [0.0016, 0.0026, 0.0036, 0.0048, 0.0062, 0.0078, 0.0095], drift: -40, tilt: 0.06, twist: 0.12, spiral: 0 },
    { lift: [-170, 370], heading: -0.2, lifted: 1400, kappa: [0.0032, 0.004, 0.0038, 0.003, 0.0016, 0.0004, -0.0006], drift: 60, tilt: 0.12, twist: -0.22, spiral: 0.05 },
  ],
};

/** Smaller cream and sage band to the right, moving in counterpoint. */
export const SAGE: BandDef = {
  width: 520, thick: 2.2, lead: [[1900, 1, 390]], approach: 450, bent: 1000, samples: 12, side: -1,
  seg: 170, ws: 14, front: PALETTE.creamLit, back: PALETTE.sage, edge: PALETTE.edge,
  states: [
    { lift: [620, 325], heading: Math.PI + 0.06, lifted: 1000, kappa: [0.0024, 0.0048, 0.0042, 0.0036, 0.0030], drift: -60, tilt: 0, twist: -0.25, spiral: 0 },
    { lift: [840, 345], heading: Math.PI + 0.3, lifted: 1000, kappa: [0.0016, 0.003, 0.003, 0.0026, 0.0016], drift: -40, tilt: 0.1, twist: -0.1, spiral: 0.1 },
    { lift: [640, 325], heading: Math.PI + 0.1, lifted: 1000, kappa: [0.003, 0.005, 0.0058, 0.0066, 0.0074], drift: -60, tilt: -0.05, twist: -0.2, spiral: 0 },
    { lift: [740, 335], heading: Math.PI + 0.15, lifted: 1000, kappa: [0.0026, 0.0036, 0.0026, 0.0014, 0.0004], drift: -40, tilt: 0, twist: -0.18, spiral: 0 },
  ],
};

// ---- time interpolation

/** Flatten a state into a numeric vector so every parameter is interpolated the same way. */
const pack = (s: BandState) => [s.lift[0], s.lift[1], s.heading, s.lifted, s.drift, s.tilt, s.twist, s.spiral, ...s.kappa];
const unpack = (a: number[]): BandState => ({
  lift: [a[0], a[1]], heading: a[2], lifted: a[3], drift: a[4], tilt: a[5], twist: a[6], spiral: a[7], kappa: a.slice(8),
});

/**
 * Shape at loop phase `phase` ∈ [0, 1). Keyframes are equally spaced; between them a uniform periodic
 * Catmull-Rom spline gives C¹ continuity (also across the loop boundary). Within each segment the
 * parameter is gently eased (speed 0.6× at a keyframe, 1.4× between) so each shape reads for a moment
 * without the motion ever stopping.
 */
export function stateAt(def: BandDef, phase: number): BandState {
  const K = def.states.length, packed = def.states.map(pack);
  const x = (((phase % 1) + 1) % 1) * K, k = Math.floor(x), s0 = x - k;
  const s = s0 - (0.4 * Math.sin(2 * Math.PI * s0)) / (2 * Math.PI);
  const p0 = packed[(k - 1 + K) % K], p1 = packed[k % K], p2 = packed[(k + 1) % K], p3 = packed[(k + 2) % K];
  return unpack(p1.map((_, i) => cr(p0[i], p1[i], p2[i], p3[i], s)));
}
const cr = (p0: number, p1: number, p2: number, p3: number, s: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);

/** Centreline control points of a state: the floor lead, then samples of the bent part (integrated curvature). */
export function centreline(def: BandDef, st: BandState): Vec3[] {
  const steps = 360, ds = st.lifted / steps, K = st.kappa.length;
  const kap = (u: number) => { // smooth curvature profile through the stations
    const x = u * (K - 1), i = Math.min(K - 2, Math.floor(x)), f = x - i, at = (j: number) => st.kappa[Math.max(0, Math.min(K - 1, j))];
    return cr(at(i - 1), at(i), at(i + 1), at(i + 2), f);
  };
  const hx = Math.cos(st.heading), hz = Math.sin(st.heading), sx = -hz, sz = hx; // heading and its side (in the floor)
  let x = st.lift[0], y = 4, z = st.lift[1], th = 0;
  const out: Vec3[] = [...def.lead, [x - hx * def.approach, 1, z - hz * def.approach], [x, y, z]];
  let next = 1;
  for (let i = 1; i <= steps; i++) {
    th += kap((i - 0.5) / steps) * ds;
    const c = Math.cos(th), sn = Math.sin(th), dr = st.drift / st.lifted;
    x += (c * hx + dr * sx) * ds; y += sn * ds; z += (c * hz + dr * sz) * ds;
    if (i === Math.round((next * steps) / (def.samples - 1))) { out.push([x, y, z]); next++; }
  }
  return out;
}
/** Cross direction of the band: perpendicular to the bending plane. */
export const acrossOf = (def: BandDef, st: BandState): Vec3 => [-Math.sin(st.heading) * def.side, 0, Math.cos(st.heading) * def.side];

// ---- geometry

/**
 * A band of paper with fixed topology: front face, back face (offset by the thickness) and the cut edges.
 * `update(state)` rewrites positions and normals in place; nothing is reallocated per frame.
 */
export class Band {
  readonly front = new BufferGeometry();
  readonly back = new BufferGeometry();
  readonly edges = new BufferGeometry();
  readonly length: number;
  private readonly curve: CatmullRomCurve3;
  private readonly grid: Float32Array; // (seg+1)·(ws+1)·3 centre-surface points
  private readonly nrm: Float32Array;
  private readonly rowT: Float32Array; // tangent per row
  private readonly rowA: Float32Array; // cross direction per row

  constructor(readonly def: BandDef) {
    const { seg, ws, width } = def, n = (seg + 1) * (ws + 1);
    this.curve = new CatmullRomCurve3(centreline(def, def.states[0]).map((p) => new Vector3(...p)), false, "centripetal");
    this.curve.arcLengthDivisions = 240;
    this.length = this.curve.getLength();
    this.grid = new Float32Array(n * 3); this.nrm = new Float32Array(n * 3);
    this.rowT = new Float32Array((seg + 1) * 3); this.rowA = new Float32Array((seg + 1) * 3);

    const uv = new Float32Array(n * 2), idxF: number[] = [], idxB: number[] = [];
    for (let i = 0; i <= seg; i++) for (let j = 0; j <= ws; j++) { const k = i * (ws + 1) + j; uv[k * 2] = (i / seg) * this.length; uv[k * 2 + 1] = (j / ws) * width; }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ws; j++) {
      const k = i * (ws + 1) + j;
      idxF.push(k, k + ws + 1, k + 1, k + 1, k + ws + 1, k + ws + 2);
      idxB.push(k, k + 1, k + ws + 1, k + 1, k + ws + 2, k + ws + 1);
    }
    for (const [g, idx] of [[this.front, idxF], [this.back, idxB]] as const) {
      g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("normal", new BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("uv", new BufferAttribute(uv, 2));
      g.setIndex(idx);
    }
    // edges: two long strips (j = 0 and j = ws) and two end strips (i = 0 and i = seg), two vertices per step
    const ev = 2 * (seg + 1) * 2 + 2 * (ws + 1) * 2, ei: number[] = [];
    const strip = (base: number, steps: number, flip: boolean) => {
      for (let s = 0; s < steps; s++) {
        const a = base + s * 2, b = a + 1, c = a + 2, d = a + 3;
        if (flip) ei.push(a, c, b, b, c, d); else ei.push(a, b, c, b, d, c);
      }
    };
    strip(0, seg, false); strip(2 * (seg + 1), seg, true);
    strip(4 * (seg + 1), ws, true); strip(4 * (seg + 1) + 2 * (ws + 1), ws, false);
    this.edges.setAttribute("position", new BufferAttribute(new Float32Array(ev * 3), 3));
    this.edges.setAttribute("normal", new BufferAttribute(new Float32Array(ev * 3), 3));
    this.edges.setIndex(ei);
    for (const g of [this.front, this.back, this.edges]) {
      (g.attributes.position as BufferAttribute).setUsage(35048); // DYNAMIC_DRAW
      (g.attributes.normal as BufferAttribute).setUsage(35048);
    }
    this.update(def.states[0]);
  }

  update(st: BandState) {
    const { seg, ws, width, thick } = this.def, L = this.length;
    const curve = this.curve;
    centreline(this.def, st).forEach((p, i) => curve.points[i].set(p[0], p[1], p[2]));
    curve.updateArcLengths();
    const Lc = curve.getLength();
    const c = new Vector3(), t = new Vector3(), a = new Vector3(), n = new Vector3(), tmp = new Vector3();
    const t0 = curve.getTangentAt(0), p0 = curve.getPointAt(0);
    const across0 = new Vector3(...acrossOf(this.def, st)).normalize();
    const G = this.grid, RT = this.rowT, RA = this.rowA;

    // centreline rows: the visible end is fixed at the curve end, the paper length L is constant
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, d = Lc - (1 - u) * L;
      if (d >= 0) { curve.getPointAt(Math.min(1, d / Lc), c); curve.getTangentAt(Math.min(1, d / Lc), t); }
      else { c.copy(p0).addScaledVector(t0, d); t.copy(t0); }
      a.copy(across0).addScaledVector(t, -across0.dot(t)).normalize();
      // twist only the lifted part (v: 0 at the lift-off point, 1 at the free end) so the sheet lies flat on the floor
      const v = Math.max(0, Math.min(1, 1 - (1 - u) * L / st.lifted)), ease = v * v * (3 - 2 * v);
      a.applyAxisAngle(t, st.tilt * ease + st.twist * Math.sin(v * Math.PI) + st.spiral * v * v);
      t.toArray(RT, i * 3); a.toArray(RA, i * 3);
      for (let j = 0; j <= ws; j++) {
        const k = (i * (ws + 1) + j) * 3, o = (j / ws - 0.5) * width;
        G[k] = c.x + a.x * o; G[k + 1] = c.y + a.y * o; G[k + 2] = c.z + a.z * o;
      }
    }
    // smooth normals from the surface itself (central differences along and across)
    const N = this.nrm, at = (i: number, j: number) => (i * (ws + 1) + j) * 3;
    const du = new Vector3(), dv = new Vector3();
    for (let i = 0; i <= seg; i++) for (let j = 0; j <= ws; j++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(seg, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(ws, j + 1);
      du.set(G[at(i1, j)] - G[at(i0, j)], G[at(i1, j) + 1] - G[at(i0, j) + 1], G[at(i1, j) + 2] - G[at(i0, j) + 2]);
      dv.set(G[at(i, j1)] - G[at(i, j0)], G[at(i, j1) + 1] - G[at(i, j0) + 1], G[at(i, j1) + 2] - G[at(i, j0) + 2]);
      n.crossVectors(du, dv).normalize(); n.toArray(N, at(i, j));
    }
    // faces: front on the centre surface, back offset by the thickness; both kept above the floor
    const fp = this.front.attributes.position.array as Float32Array, fn = this.front.attributes.normal.array as Float32Array;
    const bp = this.back.attributes.position.array as Float32Array, bn = this.back.attributes.normal.array as Float32Array;
    const FLOOR = 0.25;
    for (let k = 0; k < G.length; k += 3) {
      const nx = N[k], ny = N[k + 1], nz = N[k + 2];
      let fy = G[k + 1], by = G[k + 1] - ny * thick;
      const lift = Math.max(0, FLOOR - Math.min(fy, by)); fy += lift; by += lift;
      fp[k] = G[k]; fp[k + 1] = fy; fp[k + 2] = G[k + 2];
      bp[k] = G[k] - nx * thick; bp[k + 1] = by; bp[k + 2] = G[k + 2] - nz * thick;
      fn[k] = nx; fn[k + 1] = ny; fn[k + 2] = nz; bn[k] = -nx; bn[k + 1] = -ny; bn[k + 2] = -nz;
    }
    // edges: copy the matching front/back vertices; normals point outward (±cross direction, ±tangent)
    const ep = this.edges.attributes.position.array as Float32Array, en = this.edges.attributes.normal.array as Float32Array;
    let e = 0;
    const put = (k: number, ox: number, oy: number, oz: number) => {
      const o = e * 3;
      ep[o] = fp[k]; ep[o + 1] = fp[k + 1]; ep[o + 2] = fp[k + 2]; ep[o + 3] = bp[k]; ep[o + 4] = bp[k + 1]; ep[o + 5] = bp[k + 2];
      en[o] = en[o + 3] = ox; en[o + 1] = en[o + 4] = oy; en[o + 2] = en[o + 5] = oz; e += 2;
    };
    for (const [j, sgn] of [[0, -1], [ws, 1]] as const) for (let i = 0; i <= seg; i++) {
      tmp.fromArray(RA, i * 3).multiplyScalar(sgn); put(at(i, j), tmp.x, tmp.y, tmp.z);
    }
    for (const [i, sgn] of [[0, -1], [seg, 1]] as const) for (let j = 0; j <= ws; j++) {
      tmp.fromArray(RT, i * 3).multiplyScalar(sgn); put(at(i, j), tmp.x, tmp.y, tmp.z);
    }
    for (const g of [this.front, this.back, this.edges]) { g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; }
  }

  dispose() { this.front.dispose(); this.back.dispose(); this.edges.dispose(); }
}

/** Light-space basis used for the leaf shadow (cookie) projection. */
export function goboBasis() {
  const d = new Vector3(...KEY_DIR).normalize();
  const e1 = new Vector3(0, 1, 0).cross(d).normalize(), e2 = d.clone().cross(e1).normalize();
  const centre = new Vector3(...GOBO.at).addScaledVector(d, GOBO.dist);
  return { d, e1, e2, centre, size: GOBO.size * 3.4 };
}
