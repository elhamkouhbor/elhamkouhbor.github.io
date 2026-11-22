// Live hero sculpture: renders the paper bands of shape.ts in real time, morphing through the loop.
//
// Loaded lazily by Hero.astro only when motion is allowed. The static hero image stays underneath at all
// times; the canvas fades in after its first frame (which matches the image) and fades out again on any
// problem, so the hero is never blank.
import {
  CanvasTexture, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, NeutralToneMapping, Object3D, PerspectiveCamera, PMREMGenerator, RepeatWrapping, Scene,
  ShaderChunk, SRGBColorSpace, Texture, TextureLoader, Vector3, VSMShadowMap, WebGLRenderer,
  BufferGeometry, Float32BufferAttribute, type Material, type WebGLProgramParametersWithUniforms,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import leavesUrl from "../../assets/art/hero-leaves.png?url";
import { Band, CYCLE_SECONDS, KEY_DIR, PALETTE, VIEWS, goboBasis, type Paper, type Vec3 } from "./shape";

/**
 * One clock for the whole page: the hero and the closing section show two ends of the same sheets, so they
 * must be at the same moment of the loop. It starts with the first view that comes alive (at phase 0, the
 * frame the static images show) and keeps running while views are paused off screen.
 */
let clockStart = -1;
const clockPhase = (now: number) => {
  if (clockStart < 0) clockStart = now;
  return ((now - clockStart) / 1000 / CYCLE_SECONDS) % 1;
};

export interface Sculpture {
  /** Render one frame at loop phase ∈ [0, 1) (used by tests; the running loop follows the page clock again). */
  renderAt(phase: number): void;
  resume(): void;
  readonly state: () => { running: boolean; pixelRatio: number; fps: number; phase: number; clock: number };
  destroy(): void;
}

export const LIGHT = { key: 2.6, sky: 1.25, hemi: 1.0, env: 0.28, exposure: 1.0, cookie: 0.8 };

// ---- materials

function mottle(): Texture {
  const size = 256, c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d")!;
  x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
  let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 420; i++) {
    const px = r() * size, py = r() * size, rad = 3 + r() * 13, a = 0.004 + r() * 0.006;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      g.addColorStop(0, `rgba(120,95,70,${a})`); g.addColorStop(1, "rgba(120,95,70,0)");
      x.fillStyle = g; x.fillRect(px + dx - rad, py + dy - rad, rad * 2, rad * 2);
    }
  }
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace; t.repeat.set(0.0022, 0.0022);
  return t;
}

/** Projects the blurred leaf silhouette along the key light; only the key light (index 0) is attenuated. */
function withLeaves<M extends Material>(m: M, cookie: Texture, shift: Vec3): M {
  const b = goboBasis(shift);
  m.onBeforeCompile = (sh: WebGLProgramParametersWithUniforms) => {
    Object.assign(sh.uniforms, {
      hcCookie: { value: cookie }, hcCentre: { value: b.centre }, hcE1: { value: b.e1 }, hcE2: { value: b.e2 },
      hcSize: { value: b.size }, hcStrength: { value: LIGHT.cookie },
    });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 hcWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nhcWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 hcWorld;\nuniform sampler2D hcCookie;\nuniform vec3 hcCentre, hcE1, hcE2;\nuniform float hcSize, hcStrength;")
      .replace("#include <lights_fragment_begin>", ShaderChunk.lights_fragment_begin.replace(
        "getDirectionalLightInfo( directionalLight, directLight );",
        `getDirectionalLightInfo( directionalLight, directLight );
        {
          vec3 hcR = hcWorld - hcCentre;
          vec2 hcUv = vec2( dot( hcR, hcE1 ), dot( hcR, hcE2 ) ) / hcSize + 0.5;
          float hcLeaf = smoothstep( 0.0, 0.55, texture2D( hcCookie, clamp( hcUv, 0.0, 1.0 ) ).r );
          directLight.color *= 1.0 - ( UNROLLED_LOOP_INDEX == 0 ? hcStrength : hcStrength * 0.45 ) * hcLeaf;
        }`));
  };
  m.customProgramCacheKey = () => "hero-leaves";
  return m;
}

function paper(color: string, map: Texture | null, cookie: Texture, shift: Vec3) {
  return withLeaves(new MeshPhysicalMaterial({
    color: new Color(color), map, roughness: 0.88, sheen: 0.4, sheenRoughness: 0.85, sheenColor: new Color("#fff8ef"),
    side: DoubleSide, dithering: true,
  }), cookie, shift);
}

/** Cyclorama: floor curving up into the back wall (same profile as scripts/art). */
function sweep(color: string, cookie: Texture, shift: Vec3, [w, d, h, r]: [number, number, number, number]) {
  const pts: [number, number][] = [[d, 0]];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; pts.push([-r * Math.sin(a), r - r * Math.cos(a)]); }
  pts.push([-r, h]);
  const P: number[] = [], I: number[] = [];
  pts.forEach(([z, y]) => { P.push(-w / 2, y, z, w / 2, y, z); });
  for (let i = 0; i + 1 < pts.length; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const m = new Mesh(g, withLeaves(new MeshStandardMaterial({ color: new Color(color), roughness: 0.96, side: DoubleSide, dithering: true }), cookie, shift));
  m.receiveShadow = true;
  return m;
}

function bandMeshes(band: Band, def: Paper, map: Texture, cookie: Texture, shift: Vec3) {
  const g = new Group();
  for (const [geo, mat] of [[band.front, paper(def.front, map, cookie, shift)], [band.back, paper(def.back, map, cookie, shift)], [band.edges, paper(def.edge, null, cookie, shift)]] as const) {
    const m = new Mesh(geo, mat); m.castShadow = geo !== band.edges; m.receiveShadow = true; m.frustumCulled = false; g.add(m);
  }
  return g;
}

// ---- mount

export async function mount(host: HTMLElement, img: HTMLImageElement, viewName: keyof typeof VIEWS = "hero"): Promise<Sculpture> {
  const view = VIEWS[viewName], FRAME = view.frame, CAMERA = view.camera;
  const coarse = matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 600;
  const canvas = document.createElement("canvas");
  canvas.className = "sculpture__live"; canvas.setAttribute("aria-hidden", "true");
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "default", failIfMajorPerformanceCaveat: true });
  renderer.setClearColor(PALETTE.cream);
  renderer.toneMapping = NeutralToneMapping; renderer.toneMappingExposure = LIGHT.exposure; renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = VSMShadowMap;

  let shaderError = false;
  renderer.debug.onShaderError = () => { shaderError = true; };
  let cookie: Texture;
  try { cookie = await new TextureLoader().loadAsync(leavesUrl); } catch (e) { renderer.dispose(); throw e; }
  const scene = new Scene(); scene.background = new Color(PALETTE.cream);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; scene.environmentIntensity = LIGHT.env;
  pmrem.dispose();

  const map = mottle();
  const start = clockStart < 0 ? 0 : clockPhase(performance.now());
  const bands = view.bands.map((b) => ({ ...b, mesh: new Band(b.paper, b.pose(0)) }));
  scene.add(sweep(PALETTE.cream, cookie, view.gobo, view.sweep), ...bands.map((b) => bandMeshes(b.mesh, b.paper, map, cookie, view.gobo)));
  scene.add(new HemisphereLight(0xfff6ea, 0xd9b99c, LIGHT.hemi));

  // key light (soft shadows, leaf cookie) and a broad overhead "sky" that darkens the contact areas
  const target = new Object3D(); target.position.set(0, 60, 0); scene.add(target);
  const shadowSize = coarse ? 1024 : 2048;
  const light = (dir: Vector3, intensity: number, color: string, extent: number, radius: number, samples: number) => {
    const l = new DirectionalLight(new Color(color), intensity);
    l.position.copy(target.position).addScaledVector(dir.normalize(), 1800); l.target = target;
    l.castShadow = true; l.shadow.mapSize.set(shadowSize, shadowSize); l.shadow.bias = -0.0015; l.shadow.normalBias = 2;
    l.shadow.radius = radius * (shadowSize / 2048); l.shadow.blurSamples = samples;
    const c = l.shadow.camera; c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent; c.near = 100; c.far = 4000;
    scene.add(l); return l;
  };
  const ext = view.shadowExtent;
  light(new Vector3(...KEY_DIR), LIGHT.key, "#ffeedd", ext, 16 * 1300 / ext, 20);
  const sky = light(new Vector3(0.05, 1, 0.35), LIGHT.sky, "#fbf6ef", ext + 200, 30 * 1300 / ext, 24);
  sky.shadow.autoUpdate = false; // very soft and slow to change: refreshed every other frame
  let frameNo = 0;

  const cam = new PerspectiveCamera(CAMERA.fov, FRAME.width / FRAME.height, 50, 9000);
  cam.position.set(...CAMERA.pos); cam.lookAt(new Vector3(...CAMERA.focus));

  // frame the same crop as the <img> (object-fit: cover + object-position)
  const maxRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75), minRatio = Math.min(1, maxRatio);
  let pixelRatio = maxRatio;
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    const [ox, oy] = getComputedStyle(img).objectPosition.split(" ").map((s) => (s.endsWith("%") ? parseFloat(s) / 100 : 0.5));
    const k = Math.max(w / FRAME.width, h / FRAME.height);
    const x = (FRAME.width * k - w) * ox, y = (FRAME.height * k - h) * oy;
    cam.setViewOffset(FRAME.width, FRAME.height, x / k, y / k, w / k, h / k);
    renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  };
  resize();

  let phase = start, frozen: number | null = null;
  const draw = (p: number) => {
    for (const b of bands) b.mesh.update(b.pose(p));
    if (frameNo++ % 2 === 0) sky.shadow.needsUpdate = true;
    renderer.render(scene, cam);
  };
  // compile off the main thread where supported, then check the first frame actually drew something
  await renderer.compileAsync(scene, cam);
  draw(start);
  if (shaderError || renderer.info.render.triangles === 0 || renderer.getContext().isContextLost()) {
    renderer.dispose(); throw new Error("hero sculpture: first frame failed");
  }
  host.appendChild(canvas);
  requestAnimationFrame(() => canvas.classList.add("is-live"));

  // ---- loop: only while visible, paused when hidden; adaptive resolution
  let raf = 0, last = 0, visible = true, destroyed = false, frames = 0, acc = 0, fps = 0, slow = 0, low = 0, stall = false;
  const minInterval = coarse ? 1000 / 31 : 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const running = () => visible && !document.hidden && !reduce.matches && !destroyed;
  const tick = (now: number) => {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(tick);
    const dt = last ? now - last : Math.max(16.7, minInterval);
    if (dt < minInterval - 2) return; // frame cap on phones (30 fps)
    last = now;
    phase = frozen ?? clockPhase(now);
    draw(phase);
    frames++; acc += dt; if (dt > 250) stall = true;
    if (acc > 2000) { // every ~2 s adapt the resolution; one-off stalls (tab switch, GC) are ignored
      fps = (frames * 1000) / acc; frames = 0; acc = 0;
      const target = coarse ? 27 : 50, poor = coarse ? 18 : 28;
      if (stall) { stall = false; }
      else if (fps < target) {
        low++;
        if (low >= 2 && pixelRatio > minRatio) { pixelRatio = Math.max(minRatio, pixelRatio * 0.8); resize(); low = 0; }
        else if (pixelRatio <= minRatio && fps < poor && ++slow >= 2) fail(); // the device cannot keep up: keep the image
      } else {
        low = 0; slow = 0;
        if (fps > (coarse ? 29.5 : 58) && pixelRatio < maxRatio) { pixelRatio = Math.min(maxRatio, pixelRatio * 1.12); resize(); }
      }
    }
  };
  const wake = () => { if (!raf && running()) { last = 0; raf = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); });
  io.observe(host);
  const onVis = () => wake();
  document.addEventListener("visibilitychange", onVis);
  const onReduce = () => { if (reduce.matches) fail(); };
  reduce.addEventListener("change", onReduce);
  const ro = new ResizeObserver(() => { resize(); if (!raf) draw(phase); });
  ro.observe(host);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fail(); });

  function fail() { // fade back to the static image, then release everything
    if (destroyed) return;
    canvas.classList.remove("is-live");
    setTimeout(destroy, 1200);
    destroyed = true;
  }
  function destroy() {
    destroyed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
    document.removeEventListener("visibilitychange", onVis); reduce.removeEventListener("change", onReduce);
    scene.traverse((o) => { if (o instanceof Mesh) { (o.material as Material).dispose(); o.geometry.dispose(); } });
    map.dispose(); cookie.dispose(); env.dispose(); renderer.dispose();
    canvas.remove();
  }
  wake();

  return {
    renderAt: (p: number) => { frozen = phase = p; draw(p); },
    resume: () => { frozen = null; },
    state: () => ({ running: !!raf, pixelRatio, fps, phase, clock: clockPhase(performance.now()) }),
    destroy: fail,
  };
}
