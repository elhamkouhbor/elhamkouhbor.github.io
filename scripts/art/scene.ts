// Original artwork renderer (runs in a headless browser; see render.mjs).
// Every image on the site is a physically lit study of folded, cut and embossed material built from geometry:
// Miura-ori pleats, a radial fan, a folded brass ribbon, precision-cut rings, a half-folded carton, the EK
// monogram in paper, an embossed sheet. Soft photographic light comes from accumulating many frames with a
// jittered area key light plus dome samples (contact shadows), then a film curve, grain and vignette.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import ek from "../../src/assets/monogram/ek.json";

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = { ivory: "#F5F2EC", ivoryWarm: "#EFE8DC", ink: "#282623", burgundy: "#5F303C", sage: "#A6AB98", brass: "#BDA58E", paper: "#F4EFE6" };

// ---- materials
function fibreNormalMap(size = 1024, strength = 1.0) {
  // isotropic paper fibre: layered value noise + short streaks, converted to a normal map
  const h = new Float32Array(size * size);
  const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  for (let oct = 0; oct < 4; oct++) {
    const cell = 64 >> oct, amp = 0.5 ** oct;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = (x % cell) / cell, fy = (y % cell) / cell;
      const n = (i: number, j: number) => rnd(((gx + i) % (size / cell)) * 57 + ((gy + j) % (size / cell)) * 131 + oct * 7);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      h[y * size + x] += amp * ((n(0, 0) * (1 - sx) + n(1, 0) * sx) * (1 - sy) + (n(0, 1) * (1 - sx) + n(1, 1) * sx) * sy);
    }
  }
  for (let k = 0; k < size * 6; k++) { // fibres
    let x = rnd(k * 3.1) * size, y = rnd(k * 7.7) * size; const a = rnd(k * 1.3) * Math.PI, len = 6 + rnd(k) * 22;
    for (let s = 0; s < len; s++) { const i = (Math.floor(y + Math.sin(a) * s + size) % size) * size + (Math.floor(x + Math.cos(a) * s + size) % size); h[i] += 0.35; }
    x += 0; y += 0;
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const H = (i: number, j: number) => h[((y + j + size) % size) * size + ((x + i + size) % size)];
    const dx = (H(1, 0) - H(-1, 0)) * strength, dy = (H(0, 1) - H(0, -1)) * strength;
    const n = v(-dx, -dy, 1).normalize(), o = (y * size + x) * 4;
    data[o] = (n.x * 0.5 + 0.5) * 255; data[o + 1] = (n.y * 0.5 + 0.5) * 255; data[o + 2] = (n.z * 0.5 + 0.5) * 255; data[o + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}
let FIBRE: THREE.Texture | null = null;
const fibre = () => (FIBRE ??= fibreNormalMap());
function paper(color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  const n = fibre().clone(); n.repeat.set(0.035, 0.035); n.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: 0.86, sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color("#ffffff"), normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), ...o });
}
const brass = () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#C9A97E"), metalness: 1, roughness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.25, envMapIntensity: 9 });

// ---- geometry: planar polygons as thin slabs (front face on the surface, thickness behind)
function slab(pts: V[], t: number): THREE.BufferGeometry {
  const p0 = pts[0], u = pts[1].clone().sub(p0).normalize();
  const n = new THREE.Vector3(); for (let i = 1; i + 1 < pts.length; i++) n.add(pts[i].clone().sub(p0).cross(pts[i + 1].clone().sub(p0)));
  n.normalize(); const w = n.clone().cross(u);
  const shape = new THREE.Shape(pts.map((p) => { const d = p.clone().sub(p0); return new THREE.Vector2(d.dot(u), d.dot(w)); }));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -t);
  const m = new THREE.Matrix4().makeBasis(u, w, n).setPosition(p0);
  g.applyMatrix4(m);
  return g;
}
const merge = (gs: THREE.BufferGeometry[]) => { const m = mergeGeometries(gs.map((g) => g.index ? g.toNonIndexed() : g)); m.computeVertexNormals(); return m; };
const mesh = (g: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; };

/** Herringbone (Miura-type) pleated sheet: parallelogram faces, optionally bent along a cylinder. */
function miura(o: { nx: number; ny: number; w: number; l: number; h: number; d: number; t: number; bend?: number }) {
  const P: V[][] = [];
  for (let i = 0; i <= o.ny; i++) { P[i] = []; for (let j = 0; j <= o.nx; j++) P[i][j] = v(j * o.w + (i % 2) * o.d, i * o.l, (j % 2) * o.h); }
  const W = o.nx * o.w;
  const bend = (p: V) => { if (!o.bend) return p; const R = W / o.bend, a = (p.x - W / 2) / R; return v(Math.sin(a) * (R + p.z), p.y, Math.cos(a) * (R + p.z) - R); };
  const gs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < o.ny; i++) for (let j = 0; j < o.nx; j++) {
    const q = [P[i][j], P[i][j + 1], P[i + 1][j + 1], P[i + 1][j]].map((p) => bend(p.clone()));
    gs.push(slab(q, o.t));
  }
  return merge(gs);
}
/** Radial pleated fan (accordion folded half-disc). */
function fan(o: { n: number; r0: number; r1: number; lift: number; arc: number; t: number }) {
  const gs: THREE.BufferGeometry[] = [];
  const pt = (k: number, r: number) => { const a = Math.PI / 2 + (k / o.n - 0.5) * o.arc; const z = (k % 2) * r * o.lift; return v(Math.cos(a) * r, Math.sin(a) * r, z); };
  for (let k = 0; k < o.n; k++) gs.push(slab([pt(k, o.r0), pt(k, o.r1), pt(k + 1, o.r1), pt(k + 1, o.r0)], o.t));
  return merge(gs);
}
/** A flat strip with diagonal creases, folded panel by panel (kinematic chain about each crease line). */
function foldedStrip(o: { segments: number; width: number; len: number; angle: number; t: number; alt?: boolean }) {
  // flat panels: trapezoids between creases at ±45°
  const panels: V[][] = [], creases: [V, V][] = [];
  const W = o.width;
  for (let s = 0; s < o.segments; s++) {
    const x0 = s * o.len, x1 = (s + 1) * o.len;
    const lean = (k: number) => ((o.alt ? k % 2 === 0 : true) ? W : -W);
    // crease k between panel k-1 and k: from (x_k, 0) to (x_k + lean, W)
    const c0 = s === 0 ? [v(x0, 0, 0), v(x0, W, 0)] : [v(x0, 0, 0), v(x0 + lean(s), W, 0)];
    const c1 = s === o.segments - 1 ? [v(x1, 0, 0), v(x1, W, 0)] : [v(x1, 0, 0), v(x1 + lean(s + 1), W, 0)];
    panels.push([c0[0], c1[0], c1[1], c0[1]]);
    if (s > 0) creases.push([c0[0], c0[1]]);
  }
  let T = new THREE.Matrix4();
  const gs: THREE.BufferGeometry[] = [];
  panels.forEach((pl, s) => {
    if (s > 0) {
      const [a, b] = creases[s - 1], axis = b.clone().sub(a).normalize();
      const R = new THREE.Matrix4().makeTranslation(a.x, a.y, a.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, (s % 2 ? 1 : -1) * o.angle)).multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z));
      T = T.clone().multiply(R);
    }
    gs.push(slab(pl.map((p) => p.clone().applyMatrix4(T)), o.t));
  });
  return merge(gs);
}
/** Precision-cut ring with a gap (annulus sector), extruded. */
function ring(r0: number, r1: number, gap: number, rot: number, t: number) {
  const s = new THREE.Shape(), a0 = rot + gap / 2, a1 = rot + 2 * Math.PI - gap / 2;
  s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 96 });
  return g;
}
/** EK monogram outlines extruded into paper letters. */
function monogram(scale: number, depth: number) {
  const loader = new SVGLoader();
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${ek.E}"/><path d="${ek.K}"/></svg>`);
  const gs: THREE.BufferGeometry[] = [];
  for (const p of data.paths) for (const sh of SVGLoader.createShapes(p)) gs.push(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 2, curveSegments: 18 }));
  const g = merge(gs);
  g.scale(scale, -scale, -1); // SVG y-down → y-up; mirroring z too keeps the triangle winding (outward normals)
  g.computeVertexNormals();
  g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
  return g;
}
/** Tuck-end carton, half folded (flat panels of a classic carton, folded about their creases). */
function carton(o: { L: number; W: number; H: number; t: number; fold: number }) {
  const { L, W, H } = o, g = 12, f = o.fold;
  // panels in the flat (x right, y up): glue | back L | side W | front L | side W ; top/bottom tucks on back
  const P = (x: number, y: number) => v(x, y, 0);
  type Panel = { pts: V[]; parent?: number; hinge?: [V, V]; ang?: number };
  const xs = [0, g, g + L, g + L + W, g + 2 * L + W, g + 2 * L + 2 * W];
  const panels: Panel[] = [
    { pts: [P(xs[1], 0), P(xs[2], 0), P(xs[2], H), P(xs[1], H)] }, // 0 back (root)
    { pts: [P(xs[2], 0), P(xs[3], 0), P(xs[3], H), P(xs[2], H)], parent: 0, hinge: [P(xs[2], 0), P(xs[2], H)], ang: -Math.PI / 2 }, // 1 side
    { pts: [P(xs[3], 0), P(xs[4], 0), P(xs[4], H), P(xs[3], H)], parent: 1, hinge: [P(xs[3], 0), P(xs[3], H)], ang: -Math.PI / 2 }, // 2 front
    { pts: [P(xs[4], 0), P(xs[5], 0), P(xs[5], H), P(xs[4], H)], parent: 2, hinge: [P(xs[4], 0), P(xs[4], H)], ang: -Math.PI / 2 }, // 3 side
    { pts: [P(xs[0], 6), P(xs[1], 0), P(xs[1], H), P(xs[0], H - 6)], parent: 0, hinge: [P(xs[1], H), P(xs[1], 0)], ang: -Math.PI / 2 }, // 4 glue
    { pts: [P(xs[1], H), P(xs[2], H), P(xs[2], H + W), P(xs[1], H + W)], parent: 0, hinge: [P(xs[1], H), P(xs[2], H)], ang: -Math.PI / 2 }, // 5 top tuck panel
    { pts: [P(xs[1], H + W), P(xs[2], H + W), P(xs[2] - 6, H + W + 16), P(xs[1] + 6, H + W + 16)], parent: 5, hinge: [P(xs[1], H + W), P(xs[2], H + W)], ang: -Math.PI / 2 }, // 6 tongue
    { pts: [P(xs[2], H), P(xs[3], H), P(xs[3] - 5, H + W * 0.8), P(xs[2] + 3, H + W * 0.8)], parent: 1, hinge: [P(xs[2], H), P(xs[3], H)], ang: Math.PI / 2 }, // 7 dust
    { pts: [P(xs[4], H), P(xs[5], H), P(xs[5] - 3, H + W * 0.8), P(xs[4] + 5, H + W * 0.8)], parent: 3, hinge: [P(xs[4], H), P(xs[5], H)], ang: Math.PI / 2 }, // 8 dust
  ];
  const T: THREE.Matrix4[] = [];
  panels.forEach((p, i) => {
    if (p.parent === undefined) { T[i] = new THREE.Matrix4(); return; }
    const [a, b] = p.hinge!, axis = b.clone().sub(a).normalize();
    const R = new THREE.Matrix4().makeTranslation(a.x, a.y, a.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, p.ang! * f)).multiply(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z));
    T[i] = T[p.parent].clone().multiply(R);
  });
  return merge(panels.map((p, i) => slab(p.pts.map((q) => q.clone().applyMatrix4(T[i])), o.t)));
}
/** Embossed sheet: a finely displaced plane (blind-embossed grid of fold lines + EK) for grazing light. */
function embossed(w: number, h: number, seg: number, depth: number) {
  const g = new THREE.PlaneGeometry(w, h, seg, Math.round(seg * h / w));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const ridge = (d: number, width: number) => Math.exp(-(d * d) / (width * width));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    let z = 0;
    // concentric squares and diagonals: a dieline-like pattern pressed into the sheet
    const m = Math.max(Math.abs(x), Math.abs(y));
    for (let k = 1; k <= 7; k++) z -= 0.9 * ridge(m - k * 13, 0.9);
    z -= 0.7 * ridge(Math.abs(x) - Math.abs(y), 0.7) * (m < 92 ? 1 : 0);
    z += 1.6 * ridge(Math.hypot(x, y) - 30, 6) * 0.0;
    pos.setZ(i, z * depth);
  }
  g.computeVertexNormals();
  return g;
}

// ---- studio
function sweep(color: string, w = 2000, d = 1200, h = 900, r = 260) {
  // floor that curves up into a back wall (cyclorama)
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(d, 0));
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; pts.push(new THREE.Vector2(-r * Math.sin(a) + 0, r - r * Math.cos(a))); }
  pts.push(new THREE.Vector2(-r, h));
  const g = new THREE.BufferGeometry(); const P: number[] = [], I: number[] = [];
  const cols = 2;
  pts.forEach((p) => { for (let c = 0; c < cols; c++) P.push(-w / 2 + c * w, p.y, p.x); });
  for (let i = 0; i + 1 < pts.length; i++) { const a = i * 2, b = a + 1, c = a + 2, d2 = a + 3; I.push(a, c, b, b, c, d2); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.96, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.position.z = -r * 0.0;
  return m;
}

export interface ArtSpec {
  name: string; width: number; height: number;
  build: (scene: THREE.Scene) => void;
  camera: { pos: [number, number, number]; target: [number, number, number]; fov: number };
  key: { dir: [number, number, number]; intensity: number; softness: number; color?: string };
  dome: { fraction: number; intensity: number };
  fill: number; env: number; exposure: number; samples: number; bg: string; grain?: number; vignette?: number;
}

export const ARTWORKS: ArtSpec[] = [
  {
    name: "pleat-nocturne", width: 1500, height: 1900, bg: "#2A2224",
    build: (s) => {
      s.add(sweep("#3A2B2F"));
      const g = miura({ nx: 24, ny: 14, w: 12, l: 20, h: 10, d: 7, t: 0.45, bend: 3.3 });
      g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      const m = mesh(g, paper(C.paper)); m.rotation.set(0, -0.55, 0); m.position.set(0, 0, 0); s.add(m);
    },
    camera: { pos: [-150, 70, 700], target: [0, 150, 0], fov: 27 },
    key: { dir: [0.8, 0.38, 0.47], intensity: 4.4, softness: 0.04, color: "#ffecd6" }, dome: { fraction: 0.2, intensity: 1.0 },
    fill: 0.08, env: 0.06, exposure: 1.2, samples: 112, grain: 0.022, vignette: 0.36,
  },
  {
    name: "pleat-ivory", width: 2400, height: 1400, bg: "#ECE6DB",
    build: (s) => {
      s.add(sweep("#ECE5D9"));
      const g = miura({ nx: 46, ny: 14, w: 15, l: 24, h: 9, d: 8, t: 0.45 });
      g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
      const m = mesh(g, paper(C.paper)); m.rotation.set(-Math.PI / 2, 0, 0.18); m.position.set(0, 0, 40); s.add(m);
    },
    camera: { pos: [-60, 250, 330], target: [0, 0, 20], fov: 30 },
    key: { dir: [-0.95, 0.32, -0.1], intensity: 3.4, softness: 0.05, color: "#fff4e6" }, dome: { fraction: 0.35, intensity: 1.2 },
    fill: 0.18, env: 0.12, exposure: 1.0, samples: 96, grain: 0.018, vignette: 0.22,
  },
  {
    name: "fan-burgundy", width: 1600, height: 2000, bg: "#EEE7DC",
    build: (s) => {
      s.add(sweep("#EDE6DA"));
      const g = fan({ n: 34, r0: 26, r1: 175, lift: 0.08, arc: Math.PI * 0.98, t: 0.5 });
      const m = mesh(g, paper(C.burgundy, { roughness: 0.78, sheen: 0.5, sheenColor: new THREE.Color("#c99aa4") })); m.rotation.set(0, 0.32, 0); m.position.set(0, 0, 0); s.add(m);
    },
    camera: { pos: [130, 150, 640], target: [0, 105, 0], fov: 24 },
    key: { dir: [0.75, 0.8, 0.55], intensity: 3.0, softness: 0.09, color: "#fff2e2" }, dome: { fraction: 0.35, intensity: 1.1 },
    fill: 0.15, env: 0.1, exposure: 1.0, samples: 96, grain: 0.02, vignette: 0.25,
  },
  {
    name: "brass-ribbon", width: 1600, height: 1600, bg: "#24221F",
    build: (s) => {
      s.add(sweep("#2B2925"));
      const g = miura({ nx: 12, ny: 9, w: 14, l: 20, h: 9, d: 6, t: 0.5, bend: 1.4 });
      g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
      g.computeBoundingBox(); const r = g.boundingBox!.getSize(new THREE.Vector3()).length() / 2;
      const m = mesh(g, brass()); m.scale.setScalar(120 / r); m.rotation.set(-0.75, 0.5, 0.35); m.position.set(0, 95, 30); s.add(m);
    },
    camera: { pos: [40, 210, 600], target: [0, 92, 30], fov: 26 },
    key: { dir: [-0.6, 0.85, 0.5], intensity: 3.0, softness: 0.12, color: "#fff0dc" }, dome: { fraction: 0.3, intensity: 0.8 },
    fill: 0.1, env: 0.9, exposure: 1.0, samples: 96, grain: 0.02, vignette: 0.34,
  },
  {
    name: "cut-rings", width: 1600, height: 2000, bg: "#E9E5DA",
    build: (s) => {
      const base = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: new THREE.Color("#E6E1D5"), roughness: 0.95 }));
      base.rotation.x = -Math.PI / 2; base.receiveShadow = true; s.add(base);
      const cols = [C.sage, C.paper, C.sage, C.burgundy, C.brass, C.paper, C.sage];
      for (let k = 0; k < 7; k++) {
        const r1 = 150 - k * 17, r0 = r1 - 11;
        const g = ring(r0, r1, 0.5 + k * 0.08, k * 0.9 + 0.4, 2.2);
        const mat = cols[k] === C.brass ? brass() : paper(cols[k]);
        const m = mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(Math.sin(k) * 4, 2 + k * 2.6, Math.cos(k * 1.3) * 4); s.add(m);
      }
    },
    camera: { pos: [0, 760, 210], target: [0, 0, 10], fov: 30 },
    key: { dir: [-0.75, 0.55, -0.35], intensity: 3.2, softness: 0.05, color: "#fff3e4" }, dome: { fraction: 0.3, intensity: 1.0 },
    fill: 0.15, env: 0.1, exposure: 1.0, samples: 96, grain: 0.018, vignette: 0.24,
  },
  {
    name: "carton-study", width: 2000, height: 1400, bg: "#A7AC99",
    build: (s) => {
      s.add(sweep("#A9AE9B"));
      const flat = mesh(carton({ L: 70, W: 34, H: 120, t: 0.6, fold: 0 }), paper(C.paper)); flat.rotation.set(-Math.PI / 2, 0, 0.12); flat.position.set(-250, 0.7, 120); s.add(flat);
      const half = mesh(carton({ L: 70, W: 34, H: 120, t: 0.6, fold: 0.5 }), paper(C.paper)); half.rotation.set(0, 0.35, 0); half.position.set(-10, 0, 10); s.add(half);
      const done = mesh(carton({ L: 70, W: 34, H: 120, t: 0.6, fold: 1 }), paper(C.paper)); done.rotation.set(0, -0.5, 0); done.position.set(170, 0, -50); s.add(done);
    },
    camera: { pos: [-60, 330, 700], target: [-40, 40, 20], fov: 31 },
    key: { dir: [-0.7, 0.75, 0.3], intensity: 3.0, softness: 0.06, color: "#fff4e6" }, dome: { fraction: 0.35, intensity: 1.0 },
    fill: 0.15, env: 0.12, exposure: 1.0, samples: 96, grain: 0.018, vignette: 0.22,
  },
  {
    name: "ek-paper", width: 1600, height: 2000, bg: "#EEE8DD",
    build: (s) => {
      s.add(sweep("#EDE7DB"));
      const g = monogram(2.4, 14);
      const m = mesh(g, paper(C.paper)); m.rotation.set(0, 0.32, 0); m.position.set(0, 0, 0); s.add(m);
    },
    camera: { pos: [-90, 150, 980], target: [0, 92, 0], fov: 24 },
    key: { dir: [-0.55, 0.5, 0.85], intensity: 3.3, softness: 0.05, color: "#fff2e2" }, dome: { fraction: 0.3, intensity: 1.0 },
    fill: 0.15, env: 0.1, exposure: 1.0, samples: 96, grain: 0.02, vignette: 0.26,
  },
  {
    name: "emboss-grazing", width: 1800, height: 1200, bg: "#EEE8DD",
    build: (s) => {
      const g = embossed(900, 640, 1100, 1.0);
      const mat = paper(C.paper, { roughness: 0.9 }); (mat.normalMap as THREE.Texture).repeat.set(30, 21); // plane UVs are 0–1
      const m = new THREE.Mesh(g, mat); m.receiveShadow = false; m.castShadow = false; m.rotation.x = -Math.PI / 2; s.add(m);
    },
    camera: { pos: [0, 330, 240], target: [0, 0, 6], fov: 30 },
    key: { dir: [-1, 0.16, -0.25], intensity: 3.6, softness: 0.04, color: "#fff2e2" }, dome: { fraction: 0.2, intensity: 0.8 },
    fill: 0.2, env: 0.1, exposure: 1.0, samples: 80, grain: 0.016, vignette: 0.28,
  },
];

// ---- accumulation renderer
const hash = (n: number) => { const x = Math.sin(n * 91.345) * 47453.5453; return x - Math.floor(x); };
export async function renderArt(spec: ArtSpec, scaleDown = 1): Promise<string> {
  const W = Math.round(spec.width / scaleDown), H = Math.round(spec.height / scaleDown);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = spec.exposure; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(spec.bg);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = spec.env;
  spec.build(scene);
  const hemi = new THREE.HemisphereLight(0xfff7ec, 0x6d6457, spec.fill); scene.add(hemi);
  const key = new THREE.DirectionalLight(new THREE.Color(spec.key.color ?? "#ffffff"), spec.key.intensity);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.6; key.shadow.radius = 2;
  const sc = key.shadow.camera; sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520; sc.near = 10; sc.far = 3000;
  const target = new THREE.Object3D(); target.position.set(0, 60, 0); scene.add(target); key.target = target; scene.add(key);
  const cam = new THREE.PerspectiveCamera(spec.camera.fov, W / H, 1, 6000);
  cam.position.set(...spec.camera.pos); cam.lookAt(new THREE.Vector3(...spec.camera.target));
  const acc = new Float32Array(W * H * 3), px = new Uint8Array(W * H * 4);
  const gl = renderer.getContext();
  const base = new THREE.Vector3(...spec.key.dir).normalize();
  for (let sIdx = 0; sIdx < spec.samples; sIdx++) {
    const r1 = hash(sIdx * 2 + 1), r2 = hash(sIdx * 2 + 2);
    const dome = hash(sIdx * 5 + 3) < spec.dome.fraction;
    let dir: THREE.Vector3;
    if (dome) { // cosine-weighted direction over the upper hemisphere (skylight: soft contact shadows)
      const phi = 2 * Math.PI * r1, ct = Math.sqrt(1 - r2); dir = new THREE.Vector3(Math.cos(phi) * Math.sqrt(1 - ct * ct), ct, Math.sin(phi) * Math.sqrt(1 - ct * ct));
      key.intensity = spec.key.intensity * spec.dome.intensity * 0.8; key.color.set("#fbf6ef");
    } else { // area key light: jitter inside a small cone
      const t1 = new THREE.Vector3(0, 1, 0).cross(base).normalize(), t2 = base.clone().cross(t1);
      const rr = Math.sqrt(r1) * spec.key.softness, a = 2 * Math.PI * r2;
      dir = base.clone().add(t1.multiplyScalar(Math.cos(a) * rr)).add(t2.multiplyScalar(Math.sin(a) * rr)).normalize();
      key.intensity = spec.key.intensity; key.color.set(spec.key.color ?? "#ffffff");
    }
    key.position.copy(target.position).add(dir.multiplyScalar(1500));
    cam.setViewOffset(W, H, hash(sIdx * 7 + 11) - 0.5, hash(sIdx * 13 + 17) - 0.5, W, H); // sub-pixel AA
    renderer.render(scene, cam);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { acc[j] += px[i]; acc[j + 1] += px[i + 1]; acc[j + 2] += px[i + 2]; }
    if (sIdx % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }
  // average, flip (GL origin bottom-left), vignette + grain
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d")!; const img = ctx.createImageData(W, H);
  const n = spec.samples, vig = spec.vignette ?? 0.25, grain = (spec.grain ?? 0.02) * 255;
  let seed = 1; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = ((H - 1 - y) * W + x) * 3, o = (y * W + x) * 4;
    const dx = (x / W - 0.5) * 1.1, dy = (y / H - 0.5) * 1.1, vf = 1 - vig * Math.pow(Math.min(1, dx * dx + dy * dy), 1.4);
    const g = (rand() + rand() + rand() - 1.5) * grain;
    for (let c = 0; c < 3; c++) img.data[o + c] = Math.max(0, Math.min(255, (acc[j + c] / n) * vf + g));
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  renderer.dispose(); pmrem.dispose();
  return out.toDataURL("image/png");
}
