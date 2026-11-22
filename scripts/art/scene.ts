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
import { Band, GOBO, KEY_DIR, VIEWS, goboBasis, type View } from "../../src/scripts/sculpture/shape";

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
let MOTTLE: THREE.Texture | null = null;
/** Low-contrast albedo variation (cloudy formation of real paper), multiplies the base colour. */
function mottle(size = 512) {
  if (MOTTLE) return MOTTLE;
  const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d")!;
  x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
  let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 1400; i++) {
    const px = r() * size, py = r() * size, rad = 6 + r() * 26, a = 0.004 + r() * 0.006;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      g.addColorStop(0, `rgba(120,95,70,${a})`); g.addColorStop(1, "rgba(120,95,70,0)");
      x.fillStyle = g; x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (MOTTLE = t);
}
function paper(color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  const n = fibre().clone(); n.repeat.set(0.035, 0.035); n.needsUpdate = true;
  const m = mottle().clone(); m.repeat.set(0.0022, 0.0022); m.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), map: m, roughness: 0.88, sheen: 0.4, sheenRoughness: 0.85, sheenColor: new THREE.Color("#fff8ef"), normalMap: n, normalScale: new THREE.Vector2(0.5, 0.5), ...o });
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
  build: (scene: THREE.Scene, tex: Record<string, THREE.Texture>) => void;
  camera: { pos: [number, number, number]; target: [number, number, number]; fov: number; aperture?: number; focus?: [number, number, number] };
  /** Image assets (keys of window.ART_ASSETS, supplied by render.mjs) loaded as textures before build. */
  textures?: string[];
  key: { dir: [number, number, number]; intensity: number; softness: number; color?: string };
  dome: { fraction: number; intensity: number };
  fill: number; env: number; exposure: number; samples: number; bg: string; grain?: number; vignette?: number; shadowExtent?: number;
}

// ---- soft-light set (2026-11 redesign): paper ribbons + dappled leaf shadows
const P2 = { cream: "#EFE6DA", creamLit: "#F4ECE2", clay: "#B8674A", clayDeep: "#9E5238", sage: "#8F9B82", sageDeep: "#66735C", sand: "#E3D6C5" };

/** A paper band with real thickness: centreline through `pts`, width along a (twisting) cross direction.
 *  Front/back faces get different colours; the cut edges are their own strip so they catch the light. */
function ribbon(pts: [number, number, number][], o: { width: number; twist?: number; tilt?: number; front: string; back: string; seg?: number; across?: [number, number, number]; thick?: number; frontMap?: THREE.Texture; edge?: string }) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => v(...p)), false, "centripetal");
  const seg = o.seg ?? 260, ws = 24, len = curve.getLength(), th = o.thick ?? 2.2;
  const across0 = v(...(o.across ?? [0, 0, 1])).normalize();
  const grid: V[][] = [], nrm: V[][] = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, c = curve.getPointAt(u), t = curve.getTangentAt(u);
    const a = across0.clone().sub(t.clone().multiplyScalar(across0.dot(t))).normalize();
    a.applyAxisAngle(t, (o.tilt ?? 0) + (o.twist ?? 0) * Math.sin(u * Math.PI));
    const n = t.clone().cross(a).normalize();
    grid.push([]); nrm.push([]);
    for (let j = 0; j <= ws; j++) { grid[i].push(c.clone().add(a.clone().multiplyScalar((j / ws - 0.5) * o.width))); nrm[i].push(n); }
  }
  const surface = (off: number, flip: boolean) => {
    const P: number[] = [], UV: number[] = [], I: number[] = [];
    for (let i = 0; i <= seg; i++) for (let j = 0; j <= ws; j++) {
      const p = grid[i][j].clone().add(nrm[i][j].clone().multiplyScalar(off));
      P.push(p.x, p.y, p.z); UV.push((i / seg) * len, (j / ws) * o.width);
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ws; j++) {
      const k = i * (ws + 1) + j;
      if (flip) I.push(k, k + 1, k + ws + 1, k + 1, k + ws + 2, k + ws + 1); else I.push(k, k + ws + 1, k + 1, k + 1, k + ws + 1, k + ws + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
  };
  // edge strips: long edges (j = 0, ws) and the two ends (i = 0, seg)
  const E: number[] = [];
  const quad = (p: V, q: V, np: V, nq: V) => {
    const p2 = p.clone().add(np.clone().multiplyScalar(-th)), q2 = q.clone().add(nq.clone().multiplyScalar(-th));
    E.push(...p.toArray(), ...q.toArray(), ...q2.toArray(), ...p.toArray(), ...q2.toArray(), ...p2.toArray());
  };
  for (let i = 0; i < seg; i++) { quad(grid[i][0], grid[i + 1][0], nrm[i][0], nrm[i + 1][0]); quad(grid[i + 1][ws], grid[i][ws], nrm[i + 1][ws], nrm[i][ws]); }
  for (let j = 0; j < ws; j++) { quad(grid[0][j + 1], grid[0][j], nrm[0][j + 1], nrm[0][j]); quad(grid[seg][j], grid[seg][j + 1], nrm[seg][j], nrm[seg][j + 1]); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(E, 3)); eg.computeVertexNormals();
  const grp = new THREE.Group();
  const fm = paper(o.front, { side: THREE.DoubleSide });
  if (o.frontMap) { const m = o.frontMap.clone(); m.repeat.set(1 / len, 1 / o.width); m.wrapS = m.wrapT = THREE.ClampToEdgeWrapping; m.needsUpdate = true; fm.map = m; }
  grp.add(mesh(surface(0, false), fm), mesh(surface(-th, true), paper(o.back, { side: THREE.DoubleSide })), mesh(eg, paper(o.edge ?? "#f4ece2", { side: THREE.DoubleSide, normalMap: null })));
  return grp;
}

/** Invisible branch silhouette that only casts shadows (a gobo), placed along the key-light path. */
function branch(seed: number, o: { at: [number, number, number]; normal: [number, number, number]; size: number; leaves?: number; spin?: number }) {
  let sd = seed * 9301 + 49297; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const shapes: THREE.BufferGeometry[] = [];
  const leaf = (x: number, y: number, ang: number, L: number) => {
    const sh = new THREE.Shape(); const W = L * (0.32 + rnd() * 0.12);
    sh.moveTo(0, 0); sh.quadraticCurveTo(W, L * 0.45, 0, L); sh.quadraticCurveTo(-W, L * 0.45, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 10); g.rotateZ(ang); g.translate(x, y, 0); shapes.push(g);
  };
  const stem = (x: number, y: number, ang: number, L: number, depth: number) => {
    const steps = 14; let px = x, py = y, a = ang;
    for (let s = 0; s < steps; s++) {
      const nx = px + Math.cos(a) * (L / steps), ny = py + Math.sin(a) * (L / steps);
      const sw = 1.6 * (1 - s / steps) + 0.6; const g = new THREE.PlaneGeometry(Math.hypot(nx - px, ny - py), sw);
      g.rotateZ(a); g.translate((px + nx) / 2, (py + ny) / 2, 0); shapes.push(g);
      if (s > 2 && rnd() < 0.85) { const side = s % 2 ? 1 : -1; leaf(nx, ny, a - Math.PI / 2 + side * (0.6 + rnd() * 0.5), L * (0.16 + rnd() * 0.1)); }
      if (depth > 0 && s > 3 && rnd() < 0.18) stem(nx, ny, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.4), L * 0.5, depth - 1);
      a += (rnd() - 0.5) * 0.22; px = nx; py = ny;
    }
    leaf(px, py, a - Math.PI / 2, L * 0.2);
  };
  const n = o.leaves ?? 3;
  for (let k = 0; k < n; k++) stem(-o.size * 0.5 + rnd() * o.size * 0.3, -o.size * 0.4 + rnd() * o.size * 0.8, (rnd() - 0.5) * 0.9, o.size * (0.7 + rnd() * 0.4), 2);
  const g = mergeGeometries(shapes.map((x) => x.index ? x.toNonIndexed() : x));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = false;
  m.position.set(...o.at); m.lookAt(v(...o.at).add(v(...o.normal))); m.rotateZ(o.spin ?? 0);
  return m;
}

/** The paper of a sculpture view (shared geometry with the live renderer), at the start of the loop. */
function sculptureBands(view: View) {
  const g = new THREE.Group();
  for (const { paper, pose } of view.bands) g.add(sculptureBand(paper, pose(0)));
  return g;
}
function sculptureBand(def: ConstructorParameters<typeof Band>[0], first: ConstructorParameters<typeof Band>[1]) {
  const b = new Band(def, first), g = new THREE.Group();
  const mats = [paper(def.front, { side: THREE.DoubleSide }), paper(def.back, { side: THREE.DoubleSide }), paper(def.edge, { side: THREE.DoubleSide, normalMap: null })];
  [b.front, b.back, b.edges].forEach((geo, i) => g.add(mesh(geo, mats[i])));
  return g;
}

/** The hero branch silhouette seen from the key light (white on black), for the live renderer's leaf shadows. */
export function renderLeaves(size = 512): string {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  const s = new THREE.Scene(); s.background = new THREE.Color("#000");
  const m = branch(7, { at: along(GOBO.at, KEY_DIR, GOBO.dist), normal: KEY_DIR, size: GOBO.size, leaves: 5, spin: 0.6 });
  m.material = new THREE.MeshBasicMaterial({ color: "#fff", side: THREE.DoubleSide }); s.add(m);
  const b = goboBasis(), h = b.size / 2;
  const cam = new THREE.OrthographicCamera(-h, h, h, -h, 1, 4000);
  cam.position.copy(b.centre).addScaledVector(b.d, 1000); cam.up.copy(b.e2); cam.lookAt(b.centre);
  r.render(s, cam);
  const url = canvas.toDataURL("image/png"); r.dispose(); return url;
}

/** Slim frameless panel showing a real application screenshot (front face = image, lit like a matte screen). */
function screenPanel(shot: THREE.Texture, W: number, H: number, depth = 12, r = 9) {
  const sh = new THREE.Shape(), x0 = -W / 2, y0 = -H / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(x0 + W - r, y0); sh.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + r); sh.lineTo(x0 + W, y0 + H - r);
  sh.quadraticCurveTo(x0 + W, y0 + H, x0 + W - r, y0 + H); sh.lineTo(x0 + r, y0 + H); sh.quadraticCurveTo(x0, y0 + H, x0, y0 + H - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 3, curveSegments: 10 });
  const t = shot.clone(); t.repeat.set(1 / W, 1 / H); t.offset.set(0.5, 0.5); t.needsUpdate = true;
  const face = new THREE.MeshPhysicalMaterial({ color: "#f2f2f2", map: t, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.5, roughness: 0.45, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  const edge = new THREE.MeshPhysicalMaterial({ color: "#d9d2c9", metalness: 0.35, roughness: 0.5 });
  const m = new THREE.Mesh(g, [face, edge]); m.castShadow = m.receiveShadow = true;
  return m;
}
/** Print of the tray-with-lid layout from the Dieline screenshot (150 × 100 × 40 mm): cut lines in ink, creases dashed. */
function printTexture(len: number, width: number) {
  const S = 4, c = document.createElement("canvas"); c.width = Math.round(len * S); c.height = Math.round(width * S);
  const x = c.getContext("2d")!; x.fillStyle = "#f6efe5"; x.fillRect(0, 0, c.width, c.height);
  const k = (width * S * 0.82) / 230, ox = c.width / 2, oy = c.height / 2; // net: 308 along length (u), 230 across
  // net coordinates in mm (u along the sheet, v across), centred
  const P = (u: number, vv: number): [number, number] => [ox + (u - 154) * k, oy + (vv - 115) * k];
  const line = (pts: [number, number][], dash: boolean) => {
    x.beginPath(); pts.forEach(([u, vv], i) => { const [a, b] = P(u, vv); i ? x.lineTo(a, b) : x.moveTo(a, b); });
    x.setLineDash(dash ? [30, 20] : []); x.strokeStyle = dash ? "#b05f43" : "#2f2924"; x.lineWidth = dash ? 7 : 8; x.stroke();
  };
  // u: tuck 0-28, lid 28-128, back 128-168, base 168-268, front 268-308 ; v: side 0-40, centre 40-190, side 190-230
  line([[0, 52], [0, 178], [28, 190], [128, 190], [128, 190], [132, 222], [164, 230], [168, 230], [268, 230], [272, 230], [304, 222], [308, 190], [308, 40], [304, 8], [272, 0], [268, 0], [168, 0], [164, 0], [132, 8], [128, 40], [28, 40], [0, 52]], false);
  line([[28, 40], [28, 190]], true); line([[128, 40], [128, 190]], true); line([[168, 40], [168, 190]], true);
  line([[268, 40], [268, 190]], true); line([[168, 40], [268, 40]], true); line([[168, 190], [268, 190]], true);
  line([[128, 40], [128, 0]], true); line([[268, 190], [268, 230]], true);
  x.fillStyle = "rgba(58,51,45,.6)"; x.font = `${9 * k}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  for (const [u, vv, t] of [[78, 115, "150 × 100"], [218, 115, "150 × 100"], [148, 115, "150 × 40"], [288, 115, "150 × 40"], [218, 20, "40 × 100"], [218, 210, "40 × 100"]] as [number, number, string][]) { const [a, b] = P(u, vv); x.fillText(t, a, b); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 16; return tx;
}

/** Point `dist` units from `target` toward the (normalised) key direction. */
const along = (target: [number, number, number], dir: [number, number, number], dist: number): [number, number, number] => {
  const d = v(...dir).normalize(); return [target[0] + d.x * dist, target[1] + d.y * dist, target[2] + d.z * dist];
};

const STAGE_KEY: [number, number, number] = [-0.55, 0.6, 0.58];

export const ARTWORKS: ArtSpec[] = [
  {
    // The live hero sculpture (src/scripts/sculpture) at the start of its loop: this image is its first frame.
    name: "hero-ribbon", width: VIEWS.hero.frame.width, height: VIEWS.hero.frame.height, bg: P2.cream, shadowExtent: VIEWS.hero.shadowExtent,
    build: (s) => {
      s.add(sweep(P2.cream, ...VIEWS.hero.sweep));
      s.add(sculptureBands(VIEWS.hero));
      s.add(branch(7, { at: along(GOBO.at, KEY_DIR, GOBO.dist), normal: KEY_DIR, size: GOBO.size, leaves: 5, spin: 0.6 }));
    },
    camera: { ...VIEWS.hero.camera, aperture: 26 },
    key: { dir: KEY_DIR, intensity: 3.2, softness: 0.05, color: "#ffeedd" }, dome: { fraction: 0.3, intensity: 1.6 },
    fill: 1.25, env: 0.28, exposure: 1.04, samples: 128, grain: 0.012, vignette: 0.0,
  },
  {
    name: "project-fold", width: 2000, height: 1300, bg: P2.cream, shadowExtent: 1000, textures: ["fold-shot"],
    build: (s, tex) => {
      s.add(sweep(P2.sand, 4000, 1800, 1600, 40));
      const panel = screenPanel(tex["fold-shot"], 800, 500);
      panel.position.set(-170, 250 * Math.cos(0.09) + 1, -12); panel.rotation.set(-0.09, 0, 0); s.add(panel);
      const box = mesh(carton({ L: 92, W: 62, H: 160, t: 1.5, fold: 0.72 }), paper("#a3ae96", { side: THREE.DoubleSide }));
      box.position.set(268, 1, 90); box.rotation.set(0, -0.45, 0); s.add(box);
      s.add(branch(21, { at: along([0, 300, -200], STAGE_KEY, 800), normal: STAGE_KEY, size: 1000, leaves: 4, spin: -0.4 }));
    },
    camera: { pos: [210, 370, 1480], target: [120, 235, 0], fov: 30, aperture: 3, focus: [-170, 250, -12] },
    key: { dir: STAGE_KEY, intensity: 2.6, softness: 0.06, color: "#ffeedd" }, dome: { fraction: 0.32, intensity: 1.2 },
    fill: 0.8, env: 0.2, exposure: 1.0, samples: 128, grain: 0.01, vignette: 0.06,
  },
  {
    name: "project-dieline", width: 2000, height: 1300, bg: P2.cream, shadowExtent: 1000, textures: ["dieline-shot"],
    build: (s, tex) => {
      s.add(sweep(P2.cream, 4000, 1800, 1600, 40));
      const panel = screenPanel(tex["dieline-shot"], 800, 500);
      panel.position.set(190, 250 * Math.cos(0.09) + 1, -12); panel.rotation.set(-0.09, 0, 0); s.add(panel);
      const L = 510, Wd = 360;
      s.add(ribbon([[-380, 1.4, 250], [-170, 1.4, 218], [-10, 2, 196], [70, 10, 186], [112, 30, 182]],
        { width: Wd, across: [0.08, 0, -1], front: "#f6efe5", back: P2.creamLit, thick: 1.4, frontMap: printTexture(L, Wd), seg: 120 }));
      s.add(branch(33, { at: along([0, 300, -200], [0.55, 0.6, 0.58], 800), normal: [0.55, 0.6, 0.58], size: 1000, leaves: 4, spin: 0.3 }));
    },
    camera: { pos: [-150, 560, 1500], target: [10, 205, 60], fov: 30, aperture: 3, focus: [120, 210, 40] },
    key: { dir: [0.55, 0.6, 0.58], intensity: 2.6, softness: 0.06, color: "#ffeedd" }, dome: { fraction: 0.32, intensity: 1.2 },
    fill: 0.8, env: 0.2, exposure: 1.0, samples: 128, grain: 0.01, vignette: 0.06,
  },
  {
    // The far ends of the same sheets (closing section), at the same moment of the loop as the hero image.
    name: "closing-waves", width: VIEWS.closing.frame.width, height: VIEWS.closing.frame.height, bg: P2.cream, shadowExtent: VIEWS.closing.shadowExtent,
    build: (s) => {
      s.add(sweep(P2.cream, ...VIEWS.closing.sweep));
      s.add(sculptureBands(VIEWS.closing));
      const at: [number, number, number] = [GOBO.at[0] + VIEWS.closing.gobo[0], GOBO.at[1] + VIEWS.closing.gobo[1], GOBO.at[2] + VIEWS.closing.gobo[2]];
      s.add(branch(7, { at: along(at, KEY_DIR, GOBO.dist), normal: KEY_DIR, size: GOBO.size, leaves: 5, spin: 0.6 }));
    },
    camera: { ...VIEWS.closing.camera, aperture: 14 },
    key: { dir: KEY_DIR, intensity: 3.2, softness: 0.05, color: "#ffeedd" }, dome: { fraction: 0.3, intensity: 1.6 },
    fill: 1.25, env: 0.28, exposure: 1.04, samples: 128, grain: 0.012, vignette: 0.0,
  },
];

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
  const tex: Record<string, THREE.Texture> = {};
  for (const k of spec.textures ?? []) {
    const url = (window as unknown as { ART_ASSETS: Record<string, string> }).ART_ASSETS[k];
    const t = await new THREE.TextureLoader().loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; tex[k] = t;
  }
  spec.build(scene, tex);
  // warm sky above, warm paper bounce below (instead of a grey ground) for natural shadow colour
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0xd9b99c, spec.fill); scene.add(hemi);
  const key = new THREE.DirectionalLight(new THREE.Color(spec.key.color ?? "#ffffff"), spec.key.intensity);
  key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.6; key.shadow.radius = 2;
  const ex = spec.shadowExtent ?? 520; const sc = key.shadow.camera; sc.left = -ex; sc.right = ex; sc.top = ex; sc.bottom = -ex; sc.near = 10; sc.far = 3000;
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
    if (spec.camera.aperture) { // thin-lens depth of field: sample the aperture, keep the focus point fixed
      const focus = new THREE.Vector3(...(spec.camera.focus ?? spec.camera.target));
      const fwd = focus.clone().sub(new THREE.Vector3(...spec.camera.pos)).normalize();
      const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), up = right.clone().cross(fwd);
      const ra = Math.sqrt(hash(sIdx * 19 + 5)) * spec.camera.aperture, aa = 2 * Math.PI * hash(sIdx * 23 + 7);
      cam.position.set(...spec.camera.pos).add(right.multiplyScalar(Math.cos(aa) * ra)).add(up.multiplyScalar(Math.sin(aa) * ra));
      cam.lookAt(focus);
    }
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
