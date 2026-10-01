<template>
  <div class="wrap">
    <div
      ref="box"
      class="scene"
      role="button"
      tabindex="0"
      aria-label="Enter the throne room"
      @click="onSceneClick"
      @keydown.enter.prevent="onSceneClick"
      @keydown.space.prevent="onSceneClick"
    ></div>
    <div class="vignette"></div>

    <p v-if="failed" class="msg">The throne room couldn't load. Refresh the page to try again.</p>
    <p v-else-if="loading" class="msg">Loading...</p>
    <p v-else-if="!flying && !arrived" class="msg pulse">Tap to enter</p>

    <div class="info" :class="{ show: arrived && viewMode === 'center' }">
      <h1>{{ NAME }}</h1>
      <p>{{ TITLE }}</p>
    </div>

    <button
      class="arrow-btn about-btn"
      :class="{ show: arrived, active: viewMode === 'about' }"
      @click.stop="setView('about')"
    >
      <small>About</small>
      <span>˅</span>
    </button>

    <div class="nav-arrows" :class="{ show: arrived }">
      <button class="arrow-btn left" @click.stop="setView('skills')" :class="{ active: viewMode === 'skills' }">
        <span>‹</span>
        <small>Skills</small>
      </button>
      <button class="arrow-btn right" @click.stop="setView('projects')" :class="{ active: viewMode === 'projects' }">
        <small>Projects</small>
        <span>›</span>
      </button>
    </div>

    <p class="hint" :class="{ show: arrived && hintVisible }">Tap the stone to shatter it</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const NAME = 'Yaghya Abdul'
const TITLE = 'Software Developer'

const ABOUT = {
  paragraphs: [
    "I'm a Fullstack developer who loves building interactive, polished web experiences as well as finding ways to combine coding with hardware ",
    'I enjoy the full stack: clean Vue interfaces and pushing the browser with Three.js and custom shaders using Blender.',
  ],
  facts: [
    ['Focus', 'Revolutionary applications & 3D'],
    ['Stack', 'Vue · Three.js · Python'],
    ['Status', 'Open to opportunities'],
  ],
}

const SKILLS = [
  { title: 'Frontend and Coding', items: [['Vue 3', 0.9],['Python', 0.8], ['Pytorch', 0.8], ['HTML', 0.85], ['Vite', 0.6], ['CSS & Animation', 0.6]] },
  { title: '3D & Graphics', items: [['Three.js', 0.85], ['GLSL Shaders', 0.7], ['WebGL', 0.7], ['Blender', 0.55]] },
  { title: 'Backend', items: [['Node.js', 0.85], ['Express', 0.8], ['REST APIs', 0.85], ['SQL', 0.7]] },
  { title: 'Photography', items: [['Videography', 0.8], ['Davinci Resolve', 0.85], ['Colour-Grading', 0.65], ['VFX', 0.55]] },
]

const PROJECTS = [
  { name: 'Python Mini Toolkit', blurb: 'My first project in Python. A mini toolkit that consists of various tools using the terminal', tech: ['Python'], url: 'https://github.com/Newmi-Git/python-mini-toolkit' },
  { name: 'ModernTech Solutions', blurb: 'Another project. Keep this to two or three sentences so it fits on the stone.', tech: [ 'MySQL', 'HTML, CSS, JS', 'Node.js'], url: 'https://github.com/Newmi-Git/ModernTech-Solutions' },
  { name: 'News Webscraping', blurb: 'First webscraping project within a real team. Able to view and sort through different news sources', tech: ['Express', 'PostgreSQL', 'Python', 'Flask', 'HTML, CSS, Javascript', 'BeautifulSoup', 'threejs'], url: 'https://github.com/Maiesha7-7Moohan/Team-Charlie' },
]

const ROCK_KEYS = ['skills', 'about', 'projects']
const ROCK_TITLES = { skills: 'SKILLS', about: 'ABOUT', projects: 'PROJECTS' }
const ROCK_GLOW = { skills: 0x00ffff, about: 0xffd9a0, projects: 0xff00ff }
const ROCK_LATERAL = { skills: -1, about: 0, projects: 1 }
const GOLD = '#ffd9a0'
const CREAM = '#e8e2d4'
const SERIF = "'Cormorant Garamond', Georgia, serif"

// Meshes whose names match this are treated as obstacles the side rocks must not clip through.
const PILLAR_NAME = /pillar|column|colonn|pilar/i

const isTouch = window.matchMedia('(pointer: coarse)').matches
const weak = isTouch || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4
const Q = weak
  ? { low: true, dpr: 1.25, reflect: 384, sim: 192, sunShadow: 1024, pointShadow: false, torches: false, godRays: false, bloom: false, msaa: 0, cardScale: 0.5, dust: 60 }
  : { low: false, dpr: 2, reflect: 1024, sim: 512, sunShadow: 4096, pointShadow: true, torches: true, godRays: true, bloom: true, msaa: 4, cardScale: 1, dust: 200 }

const FLIGHT_SECONDS = 5
const STOP_FRACTION = 0.7
const ENV_INTENSITY = 0.35
const EXPOSURE = 0.85
const FOCAL_LENGTH = 15
const CAMERA_DROP = 7.0
const CAMERA_SHIFT_RIGHT = 0.009
const DRIFT_SPEED = 2.5

const SUN_COLOR = 0xcfe0ff
const SUN_INTENSITY = 4
const SUN_ELEVATION_DEG = 50
const MIN_ROUGHNESS = 0.65
const SKY_INTENSITY = 3

const GODRAY_STRENGTH = 1.3
const GODRAY_DENSITY = 0.9
const GODRAY_DECAY = 0.965
const GODRAY_THRESHOLD = 1.0

const WATER_SCALE = 1.2
const WATER_SLOPE = 0.3
const FLOW_SPEED = 0.1
const WATER_DEEP = 0x0a2a36
const WATER_SHALLOW = 0x1d5a66
const WAVE_GAIN = 0.03
const POINTER_STRENGTH = 0.09
const POINTER_RADIUS = 0.5
const POINTER_MARKER = 0.01
const SIM_CURRENT = 0.1

// Camera for the side rocks: how far back down the hall it pulls (fraction of span)
const SIDE_CAMERA_BACK = 0.4
// How far toward the entrance the side rocks sit (0 = at the throne-side stop, 1 = entrance)
const SIDE_ROCK_DEPTH = 0.2

const box = ref(null)
const loading = ref(true)
const failed = ref(false)
const flying = ref(false)
const arrived = ref(false)
const viewMode = ref('center')
const broken = ref({ skills: false, about: false, projects: false })
const hintVisible = computed(() => viewMode.value !== 'center' && !broken.value[viewMode.value])

const pointer = { x: 0, y: 0 }
const drift = { x: 0, y: 0 }
let pointerDirty = false

const pos = new THREE.Vector3(0, 2, 10)
const throne = new THREE.Vector3(0, 2, -10)
const from = new THREE.Vector3()
const to = new THREE.Vector3()
const viewPos = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()
const smoothLookAt = new THREE.Vector3()
let waterLevel = 0
let worldSpan = 20

let progress = 0

const impulses = []
let waterSim = null
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const rockClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitPoint = new THREE.Vector3()
const pointerAim = { x: 0, z: 0, active: 0 }
let pointerGlow = 0
let lastDropX = 0
let lastDropZ = 0
let hasLastDrop = false

let renderer = null
let scene = null
let overlay = null
let fill = null
let camera = null
let composer = null
let godRays = null
let dust = null
let resizeObserver = null
let environmentMap = null
let skyTexture = null
let waterSurface = null
let waterUniforms = null
let frameId = 0
let lastFrameMs = 0
let elapsed = 0
let disposed = false
const flickers = []
let camShake = 0
const obstacles = []
const sp = { max: 0, pos: null, vel: null, life: null, next: 0, points: null }

const rocks = {}
let rockHeight = 0
let hoveredRock = null

const sunDir = new THREE.Vector3(0, 1, 0)
const sunPoint = new THREE.Vector3()
const camDir = new THREE.Vector3()
const raycaster = new THREE.Raycaster()
const pointerVec = new THREE.Vector2()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const waterVertex = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vReflectUv;
  varying vec3 vWorld;
  void main() {
    vReflectUv = textureMatrix * vec4(position, 1.0);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const waterFragment = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 color;
  uniform float uTime;
  uniform sampler2D tSim;
  uniform vec2 uSimMin;
  uniform vec2 uSimExt;
  uniform vec2 uSimTexel;
  uniform float uWaveGain;
  uniform float uWarp;
  uniform vec3 uPointer;
  uniform float uPointerSize;
  uniform float uScale;
  uniform float uSlope;
  uniform vec2 uFlow;
  uniform float uSpan;
  uniform vec3 uGlowPos;
  uniform vec3 uGlowColor;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec4 vReflectUv;
  varying vec3 vWorld;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 noised(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    float k1 = b - a;
    float k2 = c - a;
    float k4 = a - b - c + d;
    return vec3(a + k1 * u.x + k2 * u.y + k4 * u.x * u.y,
                du * vec2(k1 + k4 * u.y, k2 + k4 * u.x));
  }

  vec2 waterSlope(vec2 p, int octaves) {
    vec2 g = vec2(0.0);
    float a = 0.5;
    mat2 J = mat2(1.0);
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      vec3 n = noised(p);
      g += a * (n.yz * J);
      p = m * p;
      J = m * J;
      a *= 0.5;
    }
    return g;
  }

  float simSample(vec2 w, out vec2 grad) {
    vec2 uv = (w - uSimMin) / uSimExt;
    grad = vec2(0.0);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    float l = texture2D(tSim, uv - vec2(uSimTexel.x, 0.0)).r;
    float r = texture2D(tSim, uv + vec2(uSimTexel.x, 0.0)).r;
    float d = texture2D(tSim, uv - vec2(0.0, uSimTexel.y)).r;
    float u = texture2D(tSim, uv + vec2(0.0, uSimTexel.y)).r;
    grad = vec2(r - l, u - d) * 0.5;
    return texture2D(tSim, uv).r;
  }

  void main() {
    vec2 simGrad;
    float simH = simSample(vWorld.xz, simGrad);
    vec2 p = (vWorld.xz + simGrad * uWarp) * uScale;
    vec2 f = uFlow * uScale;
    float t = uTime;

    #ifdef LOW
      vec2 g = waterSlope(p - f * t, 3);
      g += 0.5 * waterSlope(p * 1.7 + vec2(f.y, -f.x) * 0.4 * t - f * 1.6 * t + 7.1, 2);
    #else
      vec2 g = waterSlope(p - f * t, 5);
      g += 0.6 * waterSlope(p * 1.7 + vec2(f.y, -f.x) * 0.4 * t - f * 1.6 * t + 7.1, 4);
      g += 0.4 * waterSlope(p * 3.1 - f * 2.2 * t + vec2(3.7, 9.2), 3);
    #endif
    g *= uSlope;

    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    g *= mix(0.5, 1.0, 1.0 - smoothstep(uSpan * 0.5, uSpan * 1.6, dist));
    g += simGrad * uWaveGain;

    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 V = toCam / dist;
    float ndv = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

    vec2 uv = vReflectUv.xy / vReflectUv.w;
    uv += N.xz * 0.08;
    uv = clamp(uv, 0.001, 0.999);
    vec3 reflection = texture2D(tDiffuse, uv).rgb;

    vec3 R = reflect(-V, N);
    vec3 toGlow = uGlowPos - vWorld;
    float gd = length(toGlow);
    vec3 L = toGlow / gd;
    float falloff = 1.0 / (1.0 + 4.0 * (gd * gd) / (uSpan * uSpan));

    vec3 body = mix(uDeep, uShallow, pow(1.0 - ndv, 2.0) * 0.7 + 0.1);
    body += uGlowColor * max(dot(N, L), 0.0) * falloff * 0.15;

    float rl = max(dot(R, L), 0.0);
    float glint = (pow(rl, 120.0) * 5.0 + pow(rl, 600.0) * 8.0) * falloff;

    float foam = (smoothstep(0.3, 0.7, length(g)) + smoothstep(0.25, 0.6, abs(simH)) * 0.6) * 0.35 * (0.15 + falloff);

    vec3 col = mix(body, reflection, fresnel) + uGlowColor * glint + vec3(0.6, 0.8, 0.85) * foam;

    float pd = length(vWorld.xz - uPointer.xy);
    float ring = exp(-pow((pd - uPointerSize) / (uPointerSize * 0.3), 2.0)) * 0.7
               + exp(-pow(pd / (uPointerSize * 0.8), 2.0)) * 0.3;
    col += vec3(0.65, 0.88, 1.0) * ring * uPointer.z;

    float fogAmount = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
    col = mix(col, uFogColor, fogAmount);

    gl_FragColor = vec4(col, 0.86 + 0.14 * fresnel);
  }
`

const godRayVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const godRayFragment = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tOcc;
  uniform vec2 uSun;
  uniform float uStrength;
  uniform float uDensity;
  uniform float uDecay;
  uniform float uThreshold;
  uniform vec3 uColor;
  varying vec2 vUv;
  const int STEPS = 72;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 base = texture2D(tScene, vUv).rgb;
    if (uStrength <= 0.0) {
      gl_FragColor = vec4(base, 1.0);
      return;
    }
    vec2 delta = (vUv - uSun) * (uDensity / float(STEPS));
    vec2 uv = vUv - delta * rand(vUv);
    float illum = 1.0;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < STEPS; i++) {
      uv -= delta;
      vec3 s = max(texture2D(tOcc, uv).rgb - uThreshold, 0.0);
      float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      acc += s * illum * inside;
      illum *= uDecay;
    }
    acc /= float(STEPS);
    gl_FragColor = vec4(base + acc * uStrength * uColor, 1.0);
  }
`

class GodRaysPass extends Pass {
  constructor(scene, camera) {
    super()
    this.scene = scene
    this.camera = camera
    this.needsSwap = true
    this.hide = []
    this.strength = 0
    this.sunUv = new THREE.Vector2(0.5, 0.5)

    this.occTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
    this.occMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false })
    this.material = new THREE.ShaderMaterial({
      vertexShader: godRayVertex,
      fragmentShader: godRayFragment,
      uniforms: {
        tScene: { value: null },
        tOcc: { value: null },
        uSun: { value: this.sunUv },
        uStrength: { value: 0 },
        uDensity: { value: GODRAY_DENSITY },
        uDecay: { value: GODRAY_DECAY },
        uThreshold: { value: GODRAY_THRESHOLD },
        uColor: { value: new THREE.Color(SUN_COLOR) },
      },
    })
    this.quad = new FullScreenQuad(this.material)
  }

  setSize(width, height) {
    this.occTarget.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1))
  }

  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms
    u.uStrength.value = this.strength

    if (this.strength > 0.001) {
      const prevTarget = renderer.getRenderTarget()
      const wasVisible = this.hide.map((o) => o.visible)
      this.hide.forEach((o) => (o.visible = false))
      this.scene.overrideMaterial = this.occMaterial

      renderer.setRenderTarget(this.occTarget)
      renderer.clear()
      renderer.render(this.scene, this.camera)

      this.scene.overrideMaterial = null
      this.hide.forEach((o, i) => (o.visible = wasVisible[i]))
      renderer.setRenderTarget(prevTarget)
    }

    u.tScene.value = readBuffer.texture
    u.tOcc.value = this.occTarget.texture
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.quad.render(renderer)
  }

  dispose() {
    this.occTarget.dispose()
    this.occMaterial.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}

const simVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const simFragment = /* glsl */ `
  uniform sampler2D tState;
  uniform vec2 uTexel;
  uniform float uK;
  uniform float uDamp;
  uniform vec2 uCurrent;
  uniform vec4 uImpulse[4];
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv - uCurrent;
    vec4 c = texture2D(tState, uv);
    float l = texture2D(tState, uv - vec2(uTexel.x, 0.0)).r;
    float r = texture2D(tState, uv + vec2(uTexel.x, 0.0)).r;
    float d = texture2D(tState, uv - vec2(0.0, uTexel.y)).r;
    float u = texture2D(tState, uv + vec2(0.0, uTexel.y)).r;

    float h = c.r;
    float nh = h + (h - c.g) * uDamp + uK * (l + r + u + d - 4.0 * h);
    nh *= 0.9995;

    for (int i = 0; i < 4; i++) {
      vec2 dd = (vUv - uImpulse[i].xy) / uTexel;
      nh += uImpulse[i].z * exp(-dot(dd, dd) / (uImpulse[i].w * uImpulse[i].w));
    }

    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    nh *= mix(0.8, 1.0, smoothstep(0.0, 0.05, edge));

    gl_FragColor = vec4(clamp(nh, -4.0, 4.0), h, 0.0, 1.0);
  }
`

class WaterSim {
  constructor(renderer, min, ext, flow) {
    this.renderer = renderer
    this.min = min
    this.ext = ext
    this.accum = 0
    this.flow = flow.clone()
    this.carry = new THREE.Vector2()

    const cell = Math.max(ext.x, ext.y) / Q.sim
    this.cellSize = cell
    this.width = THREE.MathUtils.clamp(Math.round(ext.x / cell), 16, 1024)
    this.height = THREE.MathUtils.clamp(Math.round(ext.y / cell), 16, 1024)

    const options = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    }
    this.read = new THREE.WebGLRenderTarget(this.width, this.height, options)
    this.write = new THREE.WebGLRenderTarget(this.width, this.height, options)

    const texel = new THREE.Vector2(1 / this.width, 1 / this.height)
    this.material = new THREE.ShaderMaterial({
      vertexShader: simVertex,
      fragmentShader: simFragment,
      uniforms: {
        tState: { value: null },
        uTexel: { value: texel },
        uK: { value: 0.45 },
        uDamp: { value: 0.96 },
        uCurrent: { value: new THREE.Vector2() },
        uImpulse: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 1)) },
      },
    })
    this.quad = new FullScreenQuad(this.material)
    this.clear()
  }

  get texture() {
    return this.read.texture
  }

  impulseAt(x, z, strength, radius) {
    return { u: (x - this.min.x) / this.ext.x, v: (z - this.min.y) / this.ext.y, strength, radius }
  }

  clear() {
    const r = this.renderer
    const prevColor = new THREE.Color()
    r.getClearColor(prevColor)
    const prevAlpha = r.getClearAlpha()
    r.setClearColor(0x000000, 0)
    for (const target of [this.read, this.write]) {
      r.setRenderTarget(target)
      r.clear()
    }
    r.setClearColor(prevColor, prevAlpha)
    r.setRenderTarget(null)
  }

  step(queue) {
    const batch = queue.splice(0, 4)
    const slots = this.material.uniforms.uImpulse.value
    slots.forEach((slot, i) => {
      const imp = batch[i]
      if (imp) slot.set(imp.u, imp.v, imp.strength, imp.radius)
      else slot.set(0, 0, 0, 1)
    })
    this.carry.x += Math.abs(this.flow.x) * SIM_CURRENT
    this.carry.y += Math.abs(this.flow.y) * SIM_CURRENT
    let sx = 0
    let sy = 0
    if (this.carry.x >= 1) {
      this.carry.x -= 1
      sx = Math.sign(this.flow.x)
    }
    if (this.carry.y >= 1) {
      this.carry.y -= 1
      sy = Math.sign(this.flow.y)
    }
    this.material.uniforms.uCurrent.value.set(sx / this.width, sy / this.height)

    this.material.uniforms.tState.value = this.read.texture
    this.renderer.setRenderTarget(this.write)
    this.quad.render(this.renderer)
    ;[this.read, this.write] = [this.write, this.read]
  }

  update(delta, queue) {
    const STEP = Q.low ? 1 / 60 : 1 / 120
    const MAX = Q.low ? 2 : 4
    this.accum += delta
    let steps = 0
    while (this.accum >= STEP && steps < MAX) {
      this.step(queue)
      this.accum -= STEP
      steps++
    }
    if (steps === MAX) this.accum = 0
    if (queue.length > 64) queue.splice(0, queue.length - 64)
    this.renderer.setRenderTarget(null)
  }

  dispose() {
    this.read.dispose()
    this.write.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}

function makeSkyTexture(dir) {
  const W = 1024
  const H = 512
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')

  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#6f95d6')
  sky.addColorStop(0.5, '#c9dcf5')
  sky.addColorStop(0.75, '#f2e8d5')
  sky.addColorStop(1, '#8d8a84')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)

  const u = Math.atan2(dir.z, dir.x) / (2 * Math.PI) + 0.5
  const v = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) / Math.PI + 0.5
  const x = u * W
  const y = (1 - v) * H
  for (const offset of [-W, 0, W]) {
    const glow = g.createRadialGradient(x + offset, y, 0, x + offset, y, 110)
    glow.addColorStop(0, 'rgba(255,252,240,1)')
    glow.addColorStop(0.12, 'rgba(255,244,215,0.95)')
    glow.addColorStop(1, 'rgba(255,232,190,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, W, H)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeRockTexture(title, glowHex) {
  const W = 512
  const H = 1024
  const css = '#' + glowHex.toString(16).padStart(6, '0')
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return c
  }

  const c = mk()
  const ctx = c.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#3a3a40')
  bg.addColorStop(1, '#1e1f24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // strata
  for (let i = 0; i < (Q.low ? 30 : 70); i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)'
    ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 10)
  }
  // speckle
  for (let i = 0; i < (Q.low ? 1500 : 4000); i++) {
    const v = 25 + Math.random() * 35
    ctx.fillStyle = `rgba(${v},${v},${v + 5},0.2)`
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 15, 0, Math.PI * 2)
    ctx.fill()
  }
  // moss near the waterline
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = 'rgba(40,70,50,0.12)'
    ctx.beginPath()
    ctx.arc(Math.random() * W, H * (0.6 + Math.random() * 0.4), Math.random() * 18, 0, Math.PI * 2)
    ctx.fill()
  }
  // cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    let x = Math.random() * W
    let y = Math.random() * H
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 60
      y += Math.random() * 50
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const frame = (g, col, lw) => {
    g.strokeStyle = col
    g.lineWidth = lw
    g.strokeRect(36, 36, W - 72, H - 72)
    g.strokeRect(58, 58, W - 116, H - 116)
  }
  const font = `bold ${title.length > 6 ? 70 : 88}px Georgia`

  frame(ctx, 'rgba(0,0,0,0.6)', 8)
  ctx.textAlign = 'center'
  ctx.font = font
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillText(title, W / 2, H / 2 + 24)
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillText(title, W / 2, H / 2 + 21)

  // emissive map: only the runes and title glow
  const gc = mk()
  const g = gc.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  frame(g, css, 5)
  g.textAlign = 'center'
  g.font = font
  g.shadowColor = css
  g.shadowBlur = 18
  g.fillStyle = css
  g.fillText(title, W / 2, H / 2 + 24)

  const map = new THREE.CanvasTexture(c)
  map.anisotropy = 8
  map.colorSpace = THREE.SRGBColorSpace
  const glow = new THREE.CanvasTexture(gc)
  glow.colorSpace = THREE.SRGBColorSpace
  return { map, glow }
}

function makeRockGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 10, 24, 8)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  const n = (x, y, z) =>
    Math.sin(x * 3.1 + y * 2.7 + z * 1.3) * Math.cos(z * 4.2 - y * 1.9) * 0.5 +
    Math.sin(x * 7.3 + z * 6.1 + y * 5.2) * 0.25 +
    0.5
  const s = Math.max(w, 0.8)

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const front = v.z > d / 2 - 0.01
    const back = v.z < -d / 2 + 0.01
    const t = (v.y + h / 2) / h

    v.x *= 1 - 0.18 * t * t // taper toward the top
    const amp = (front ? 0.03 : back ? 0.3 : 0.18) * s
    const dx = v.x / (w / 2)
    const dz = v.z / (d / 2)
    const len = Math.hypot(dx, dz) || 1
    const nz = n(v.x, v.y, v.z) * amp
    v.x += (dx / len) * nz
    v.z += (dz / len) * nz

    if (t > 0.88) v.y -= Math.abs(n(v.x * 2, 0, v.z * 2)) * h * 0.08 * (front ? 0.3 : 1) // jagged top
    v.y -= (v.x / (w / 2)) * h * 0.03 // slanted, broken-off top

    pos.setXYZ(i, v.x, v.y, v.z)
  }

  const out = geo.toNonIndexed()
  out.computeVertexNormals()
  return out
}

function ripple(x, z, strength = -0.25, radius = 1.5) {
  if (waterSim) impulses.push(waterSim.impulseAt(x, z, strength, radius))
}

function ringRipple(x, z, r, n, strength) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    ripple(x + Math.cos(a) * r, z + Math.sin(a) * r, strength)
  }
}

function makeSplash() {
  sp.max = Q.low ? 150 : 500
  sp.pos = new Float32Array(sp.max * 3).fill(-1000)
  sp.vel = new Float32Array(sp.max * 3)
  sp.life = new Float32Array(sp.max)

  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  rg.addColorStop(0, 'rgba(255,255,255,1)')
  rg.addColorStop(0.4, 'rgba(200,230,255,0.6)')
  rg.addColorStop(1, 'rgba(200,230,255,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 32, 32)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(sp.pos, 3))
  sp.points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c),
      color: 0xcfe8ff,
      size: worldSpan * 0.012,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  sp.points.frustumCulled = false
  scene.add(sp.points)
}

function spawnSplash(x, y, z, count, power) {
  if (!sp.points) return
  for (let i = 0; i < count; i++) {
    const k = sp.next++ % sp.max
    const a = Math.random() * Math.PI * 2
    const lateral = power * (0.2 + Math.random() * 0.5)
    sp.pos.set([x, y, z], k * 3)
    sp.vel.set([Math.cos(a) * lateral, power * (0.5 + Math.random() * 0.8), Math.sin(a) * lateral], k * 3)
    sp.life[k] = 0.8 + Math.random() * 1.0
  }
}

function updateSplash(delta) {
  if (!sp.points) return
  const gravity = worldSpan * 0.5
  for (let k = 0; k < sp.max; k++) {
    if (sp.life[k] <= 0) continue
    const i = k * 3
    sp.vel[i + 1] -= gravity * delta
    sp.pos[i] += sp.vel[i] * delta
    sp.pos[i + 1] += sp.vel[i + 1] * delta
    sp.pos[i + 2] += sp.vel[i + 2] * delta
    sp.life[k] -= delta
    if (sp.pos[i + 1] < waterLevel && sp.vel[i + 1] < 0) {
      if (Math.random() < 0.3) ripple(sp.pos[i], sp.pos[i + 2], -0.08, 1.2) // droplets land as ripples
      sp.life[k] = 0
    }
    if (sp.life[k] <= 0) sp.pos[i + 1] = -1000
  }
  sp.points.geometry.attributes.position.needsUpdate = true
}

function updateDust(delta) {
  if (!dust) return
  const a = dust.geometry.attributes.position.array
  const s = worldSpan
  for (let i = 0; i < Q.dust; i++) {
    const k = i * 3
    a[k] += Math.sin(elapsed * 0.4 + i) * s * 0.004 * delta * 10
    a[k + 1] += s * 0.004 * delta * (0.5 + (i % 5) * 0.2)
    a[k + 2] += Math.cos(elapsed * 0.3 + i * 1.7) * s * 0.004 * delta * 10
    if (a[k + 1] > waterLevel + s * 0.35) a[k + 1] = waterLevel
  }
  dust.geometry.attributes.position.needsUpdate = true
}

function makeDust(center, span) {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  rg.addColorStop(0, 'rgba(255,255,255,1)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 32, 32)

  const arr = new Float32Array(Q.dust * 3)
  for (let i = 0; i < Q.dust; i++) {
    arr[i * 3] = center.x + (Math.random() - 0.5) * span * 0.6
    arr[i * 3 + 1] = waterLevel + Math.random() * span * 0.35
    arr[i * 3 + 2] = center.z + (Math.random() - 0.5) * span * 0.9
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c),
      color: 0xffe2b0,
      size: span * 0.01,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  scene.add(dust)
}

function setup() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05060a)
  scene.fog = new THREE.FogExp2(0x0b0f17, 0.02)

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: Q.low ? 'low-power' : 'high-performance' })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = EXPOSURE
  renderer.localClippingEnabled = true
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = Q.low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    failed.value = true
  })
  box.value.appendChild(renderer.domElement)

  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.msaa }))
  composer.addPass(new RenderPass(scene, camera))

  overlay = new THREE.Scene()
  overlay.add(new THREE.HemisphereLight(0xfff0d8, 0x303040, 1.4))
  fill = new THREE.DirectionalLight(0xffe2b0, 2.2)
  overlay.add(fill, fill.target)
  const overlayPass = new RenderPass(overlay, camera)
  overlayPass.clear = false
  overlayPass.clearDepth = true
  composer.addPass(overlayPass)

  godRays = new GodRaysPass(scene, camera)
  godRays.enabled = Q.godRays
  composer.addPass(godRays)
  if (Q.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.6, 0.8))
  composer.addPass(new OutputPass())

  scene.environmentIntensity = ENV_INTENSITY
  scene.add(new THREE.HemisphereLight(0x8a96b8, 0x0e0e14, 0.15))

  resize()

  new HDRLoader().load(
    '/hall.hdr',
    (tex) => {
      if (disposed) return tex.dispose()
      tex.mapping = THREE.EquirectangularReflectionMapping
      environmentMap = tex
      scene.environment = tex
      overlay.environment = tex
      overlay.environmentIntensity = 0.5
    },
    undefined,
    (err) => console.warn('Could not load /hall.hdr:', err),
  )

  new GLTFLoader().load('/throne.glb', onModelLoaded, undefined, onModelError)

  document.fonts?.load(`600 40px ${SERIF}`)
  document.fonts?.load(`500 40px ${SERIF}`)
}

function onModelError(err) {
  console.error('Could not load /throne.glb:', err)
  if (disposed) return
  loading.value = false
  failed.value = true
}

function onModelLoaded(gltf) {
  if (disposed) return disposeObject(gltf.scene)

  scene.add(gltf.scene)
  gltf.scene.updateMatrixWorld(true)

  const waterSources = []
  const openings = []
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return
    const isOpening = /window|glass|crack/i.test(obj.name)
    obj.castShadow = !isOpening
    obj.receiveShadow = true
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    materials.forEach((m) => {
      m.side = THREE.DoubleSide
      if (m.isMeshStandardMaterial && m.metalness < 0.5) m.roughness = Math.max(m.roughness, MIN_ROUGHNESS)
    })
    if (isOpening) openings.push(obj)
    if (obj.name.startsWith('Water')) waterSources.push(obj)
    if (PILLAR_NAME.test(obj.name)) obstacles.push(new THREE.Box3().setFromObject(obj))
  })

  const bounds = new THREE.Box3().setFromObject(gltf.scene)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const startMarker = gltf.scene.getObjectByName('CamStart')
  const throneMarker = gltf.scene.getObjectByName('CamThrone')

  if (startMarker && throneMarker) {
    startMarker.getWorldPosition(pos)
    throneMarker.getWorldPosition(throne)
  } else {
    pos.set(center.x, center.y + 1.6, center.z + size.z / 2)
    throne.set(center.x, center.y + 1.6, center.z - size.z / 2)
  }

  pos.y = Math.max(pos.y - CAMERA_DROP, bounds.min.y + 0.3)
  to.lerpVectors(pos, throne, STOP_FRACTION)
  to.y = pos.y

  const span = Math.max(pos.distanceTo(throne), 1)
  const unit = (span / 20) ** 2
  const dir = new THREE.Vector3().subVectors(throne, pos).setY(0).normalize()
  const side = new THREE.Vector3(-dir.z, 0, dir.x)

  pos.addScaledVector(side, span * CAMERA_SHIFT_RIGHT)
  to.addScaledVector(side, span * CAMERA_SHIFT_RIGHT)

  viewPos.copy(to).addScaledVector(dir, -span * 0.1)

  const glow = new THREE.PointLight(0xffd9a0, 55 * unit, 0, 2)
  glow.position.set(throne.x, throne.y + 3, throne.z + 1)
  glow.castShadow = Q.pointShadow
  glow.shadow.mapSize.set(1024, 1024)
  glow.shadow.bias = -0.0001
  glow.shadow.normalBias = 0.05
  glow.shadow.camera.far = span * 3
  scene.add(glow)
  flickers.push({ light: glow, base: glow.intensity, amp: 0.04, phase: 1.7 })

  const mid = new THREE.Vector3().lerpVectors(pos, throne, 0.6)
  for (const s of Q.torches ? [-1, 1] : []) {
    const torch = new THREE.PointLight(0xff7030, 25 * unit, 0, 2)
    torch.position.copy(mid).addScaledVector(side, s * span * 0.2)
    torch.position.y = pos.y + 1.5
    scene.add(torch)
    flickers.push({ light: torch, base: torch.intensity, amp: 0.14, phase: Math.random() * 10 })
  }

  const maxDim = Math.max(size.x, size.y, size.z)
  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY)
  const aim = new THREE.Vector3().lerpVectors(pos, throne, 0.5)
  aim.y = bounds.min.y
  const run = maxDim * 0.6
  sun.target.position.copy(aim)
  sun.position
    .copy(aim)
    .addScaledVector(dir, run)
    .setY(aim.y + run * Math.tan(THREE.MathUtils.degToRad(SUN_ELEVATION_DEG)))
  sun.castShadow = true
  sun.shadow.mapSize.set(Q.sunShadow, Q.sunShadow)
  sun.shadow.bias = -0.0001
  sun.shadow.normalBias = 0.03
  const half = maxDim * 0.6
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 0.5, far: maxDim * 3 })
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(sun, sun.target)
  sunDir.subVectors(sun.position, sun.target.position).normalize()

  const bounce = new THREE.PointLight(0x664422, 10 * unit, 0, 2)
  bounce.position.copy(aim).setY(aim.y + span * 0.15)
  scene.add(bounce)

  skyTexture = makeSkyTexture(sunDir)
  scene.background = skyTexture
  scene.backgroundIntensity = SKY_INTENSITY

  worldSpan = span
  if (waterSources.length) createWater(waterSources, glow, span, dir)

  makeDust(to, span)
  makeSplash()
  godRays.hide = [...openings, waterSurface, dust, sp.points].filter(Boolean)

  createRocks(to, side, dir, span, size, pos)

  smoothLookAt.copy(throne)
  renderer.shadowMap.needsUpdate = true
  loading.value = false
}

function wrapText(ctx, text, maxW) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function rule(ctx, x1, x2, y) {
  const g = ctx.createLinearGradient(x1, 0, x2, 0)
  g.addColorStop(0, 'rgba(255,217,160,0.8)')
  g.addColorStop(1, 'rgba(255,217,160,0)')
  ctx.fillStyle = g
  ctx.fillRect(x1, y, x2 - x1, 3)
}

function makeCardTexture(W, H, paint) {
  const k = Q.cardScale
  const c = document.createElement('canvas')
  c.width = W * k
  c.height = H * k
  const ctx = c.getContext('2d')
  ctx.scale(k, k)
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#2b2d33')
  bg.addColorStop(1, '#16171b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const blots = Q.low ? 1000 : 2500
  for (let i = 0; i < blots; i++) {
    const v = 20 + Math.random() * 30
    ctx.fillStyle = `rgba(${v},${v},${v + 6},0.18)`
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 14, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(255,217,160,0.55)'
  ctx.lineWidth = 4
  ctx.strokeRect(28, 28, W - 56, H - 56)
  ctx.strokeStyle = 'rgba(255,217,160,0.2)'
  ctx.lineWidth = 2
  ctx.strokeRect(46, 46, W - 92, H - 92)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  paint(ctx, W, H)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = Q.low ? 2 : 8
  return tex
}

const paintSkills = (group) => (ctx, W) => {
  ctx.fillStyle = GOLD
  ctx.font = `600 88px ${SERIF}`
  ctx.fillText(group.title, 90, 165)
  rule(ctx, 90, W - 90, 205)
  group.items.forEach(([name, level], i) => {
    const y = 290 + i * 118
    ctx.fillStyle = CREAM
    ctx.font = `600 50px ${SERIF}`
    ctx.fillText(name, 90, y)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(90, y + 22, W - 180, 12)
    const g = ctx.createLinearGradient(90, 0, W - 90, 0)
    g.addColorStop(0, '#b8864a')
    g.addColorStop(1, GOLD)
    ctx.fillStyle = g
    ctx.fillRect(90, y + 22, (W - 180) * level, 12)
  })
}

const paintProject = (p, index) => (ctx, W, H) => {
  const pad = 80
  ctx.fillStyle = 'rgba(255,217,160,0.12)'
  ctx.font = `700 170px ${SERIF}`
  ctx.fillText(String(index + 1).padStart(2, '0'), pad, 230)

  ctx.fillStyle = GOLD
  ctx.font = `600 72px ${SERIF}`
  let y = 340
  for (const l of wrapText(ctx, p.name, W - pad * 2)) {
    ctx.fillText(l, pad, y)
    y += 78
  }
  rule(ctx, pad, W - pad, y - 36)

  ctx.fillStyle = CREAM
  ctx.font = `500 42px ${SERIF}`
  y += 24
  for (const l of wrapText(ctx, p.blurb, W - pad * 2)) {
    ctx.fillText(l, pad, y)
    y += 56
  }

  ctx.font = `600 34px ${SERIF}`
  let tx = pad
  let ty = H - (p.url ? 290 : 220)
  for (const t of p.tech) {
    const pw = ctx.measureText(t).width + 44
    if (tx + pw > W - pad) {
      tx = pad
      ty += 72
    }
    ctx.fillStyle = 'rgba(255,217,160,0.12)'
    ctx.strokeStyle = 'rgba(255,217,160,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(tx, ty, pw, 56, 28)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = GOLD
    ctx.fillText(t, tx + 22, ty + 38)
    tx += pw + 16
  }
  if (p.url) {
    ctx.fillStyle = GOLD
    ctx.font = `600 38px ${SERIF}`
    ctx.fillText('View project  →', pad, H - 90)
  }
}

const paintAbout = () => (ctx, W, H) => {
  const pad = 90
  ctx.fillStyle = GOLD
  ctx.font = `600 120px ${SERIF}`
  ctx.fillText('About Me', pad, 210)
  ctx.fillStyle = 'rgba(232,226,212,0.7)'
  ctx.font = `italic 400 52px ${SERIF}`
  ctx.fillText(`${NAME} — ${TITLE}`, pad, 285)
  rule(ctx, pad, W - pad, 320)

  ctx.fillStyle = CREAM
  ctx.font = `500 46px ${SERIF}`
  let y = 410
  for (const para of ABOUT.paragraphs) {
    for (const l of wrapText(ctx, para, W - pad * 2)) {
      ctx.fillText(l, pad, y)
      y += 62
    }
    y += 30
  }

  const colW = (W - pad * 2) / ABOUT.facts.length
  ABOUT.facts.forEach(([label, value], i) => {
    ctx.fillStyle = GOLD
    ctx.font = `600 30px ${SERIF}`
    ctx.fillText(label.toUpperCase(), pad + i * colW, H - 175)
    ctx.fillStyle = CREAM
    ctx.font = `500 44px ${SERIF}`
    ctx.fillText(value, pad + i * colW, H - 120)
  })
}

const jitter = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function makeSlabGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 14, 14, 1)
  const p = geo.attributes.position
  const edge = Math.min(w, h) * 0.012
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const onRim = Math.abs(Math.abs(x) - w / 2) < 1e-4 || Math.abs(Math.abs(y) - h / 2) < 1e-4
    if (onRim) {
      p.setX(i, x + (jitter(x, y) - 0.5) * edge * 2)
      p.setY(i, y + (jitter(y, x) - 0.5) * edge * 2)
    }
    if (p.getZ(i) < 0) p.setZ(i, p.getZ(i) - jitter(x * 3, y * 3) * d * 0.4)
  }
  geo.computeVertexNormals()
  return geo
}

function createRocks(centerPos, sideVec, forwardVec, span, size, entrancePos) {
  worldSpan = span
  const rockW = Math.max(0.8, span * 0.05)
  rockHeight = Math.max(2.0, span * 0.12)
  const rockD = Math.max(0.25, span * 0.02)

  const aboutAt = centerPos.clone().lerp(entrancePos, 0.5)
  const sideAt = centerPos.clone().lerp(entrancePos, SIDE_ROCK_DEPTH)
  const backPos = centerPos.clone().addScaledVector(forwardVec, -span * SIDE_CAMERA_BACK)
  const maxSide = Math.min(size.x * 0.2, span * 0.12)
  rockClip.constant = -waterLevel

  // true if a rock standing at p would not overlap any pillar footprint
  const clear = (p) => {
    const b = new THREE.Box3(
      new THREE.Vector3(p.x - rockW * 0.9, -1e3, p.z - rockW * 0.9),
      new THREE.Vector3(p.x + rockW * 0.9, 1e3, p.z + rockW * 0.9),
    )
    return !obstacles.some((o) => o.intersectsBox(b))
  }

  for (const key of ROCK_KEYS) {
    const tex = makeRockTexture(ROCK_TITLES[key], ROCK_GLOW[key])
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map,
      bumpMap: tex.map,
      bumpScale: 2,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
      emissive: ROCK_GLOW[key],
      emissiveMap: tex.glow,
      emissiveIntensity: 0.25,
      clippingPlanes: [rockClip],
    })

    const base = key === 'about' ? aboutAt : sideAt
    const p = base.clone()
    let lateral = ROCK_LATERAL[key] * maxSide
    for (let i = 0; i < 8; i++) {
      p.copy(base).addScaledVector(sideVec, lateral)
      if (clear(p)) break
      lateral *= 0.85
    }

    // About keeps the original close-up camera; Skills/Projects use the pulled-back one
    const view = key === 'about' ? viewPos.clone() : backPos.clone()

    const mesh = new THREE.Mesh(makeRockGeometry(rockW, rockHeight, rockD), mat)
    const baseY = waterLevel - rockHeight - 0.5
    mesh.position.set(p.x, baseY, p.z)
    mesh.lookAt(view.x, baseY, view.z)
    mesh.visible = false
    overlay.add(mesh)

    rocks[key] = {
      mesh,
      baseY,
      targetY: waterLevel + rockHeight * 0.42, // base just meets the waterline
      lookY: waterLevel + rockHeight * 0.35,
      pieces: [],
      stone: null,
      viewPos: view,
      shake: 0,
      baseQuat: mesh.quaternion.clone(),
      lastRip: 0,
    }
  }
}

function breakRock(key) {
  const rock = rocks[key]
  broken.value = { ...broken.value, [key]: true }
  rock.mesh.visible = false

  const origin = rock.mesh.position.clone()
  spawnSplash(origin.x, waterLevel + rockHeight * 0.3, origin.z, Q.low ? 50 : 140, worldSpan * 0.4)
  ringRipple(origin.x, origin.z, worldSpan * 0.05, 12, -0.5)
  camShake = 1

  const vp = rock.viewPos
  const f = new THREE.Vector3(vp.x - origin.x, 0, vp.z - origin.z)
  const dist = f.length()
  f.normalize()
  const right = new THREE.Vector3(f.z, 0, -f.x)
  const u = worldSpan
  const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const visW = visH * camera.aspect

  let w, h, px, cols, items
  if (key === 'skills') {
    w = u * 0.14; h = w * 0.75; px = [1024, 768]; cols = 2
    items = SKILLS.map((g) => ({ paint: paintSkills(g) }))
  } else if (key === 'projects') {
    w = u * 0.13; h = w * 1.333; px = [768, 1024]; cols = camera.aspect < 1 ? 1 : 3
    items = PROJECTS.map((p, i) => ({ paint: paintProject(p, i), url: p.url }))
  } else {
    w = u * 0.3; h = w * (2 / 3); px = [1536, 1024]; cols = 1
    items = [{ paint: paintAbout() }]
  }

  const rows = Math.ceil(items.length / cols)
  const baseGap = u * 0.012
  const fit = Math.min(
    1,
    (visW * 0.9) / (cols * w + (cols - 1) * baseGap),
    (visH * 0.65) / (rows * h + (rows - 1) * baseGap),
  )
  w *= fit
  h *= fit
  const gap = baseGap * fit

  const slots = items.map((_, i) => {
    const inRow = Math.min(cols, items.length - Math.floor(i / cols) * cols)
    return {
      x: ((i % cols) - (inRow - 1) / 2) * (w + gap),
      y: ((rows - 1) / 2 - Math.floor(i / cols)) * (h + gap),
    }
  })
  const totalH = rows * h + (rows - 1) * gap
  const centerY = waterLevel + 0.7 + totalH / 2
  rock.lookY = centerY

  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.95, metalness: 0.05, flatShading: true })
  rock.stone = stone

  items.forEach((item, i) => {
    const tex = makeCardTexture(px[0], px[1], item.paint)
    const face = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.6,
    })
    const piece = new THREE.Mesh(makeSlabGeometry(w, h, w * 0.06), [stone, stone, stone, stone, face, stone])
    piece.position.copy(origin)
    piece.lookAt(vp.x, piece.position.y, vp.z)
    piece.visible = false
    piece.scale.setScalar(0.1)
    piece.userData = {
      origin: origin.clone(),
      target: new THREE.Vector3(
        origin.x + right.x * slots[i].x,
        centerY + slots[i].y,
        origin.z + right.z * slots[i].x,
      ),
      baseQuat: piece.quaternion.clone(),
      start: elapsed + i * 0.14,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
      url: item.url || '',
      vis: 1,
    }
    overlay.add(piece)
    rock.pieces.push(piece)
  })
}

function resetRock(key) {
  const r = rocks[key]
  r.pieces.forEach((p) => {
    overlay.remove(p)
    p.geometry.dispose()
    p.material[4].map.dispose()
    p.material[4].dispose()
  })
  r.stone?.dispose()
  r.pieces = []
  r.mesh.position.y = r.baseY
  r.mesh.visible = false
  broken.value = { ...broken.value, [key]: false }
}

function animatePiece(p, active, delta) {
  const ud = p.userData
  ud.vis = THREE.MathUtils.clamp(ud.vis + (active ? delta : -delta) * 2.5, 0, 1)
  const raw = prefersReducedMotion ? 1 : THREE.MathUtils.clamp((elapsed - ud.start) / 1.4, 0, 1)
  p.visible = raw > 0 && ud.vis > 0
  const e = (1 - Math.pow(1 - raw, 3)) * ud.vis
  p.position.lerpVectors(ud.origin, ud.target, e)
  p.position.y +=
    (Math.sin(Math.PI * raw) * worldSpan * 0.05 + Math.sin(elapsed * 1.3 + ud.phase) * worldSpan * 0.003 * e) * ud.vis
  p.scale.setScalar(0.1 + 0.9 * e)
  tmpE.set(
    Math.sin(elapsed * 0.7 + ud.phase) * 0.02 * e,
    (1 - e) * ud.spin + Math.sin(elapsed * 0.5 + ud.phase) * 0.03 * e,
    0,
  )
  tmpQ.setFromEuler(tmpE)
  p.quaternion.copy(ud.baseQuat).multiply(tmpQ)
}

function createWater(sources, glow, span, dir) {
  const pieces = sources.map((mesh) => {
    const baked = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
    const flat = baked.index ? baked.toNonIndexed() : baked
    const slim = new THREE.BufferGeometry()
    slim.setAttribute('position', flat.getAttribute('position'))
    mesh.visible = false
    return slim
  })
  const geometry = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces)
  if (!geometry) return

  const bbox = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position'))
  const simMin = new THREE.Vector2(bbox.min.x, bbox.min.z)
  const simExt = new THREE.Vector2(Math.max(bbox.max.x - bbox.min.x, 0.01), Math.max(bbox.max.z - bbox.min.z, 0.01))
  waterSim = new WaterSim(renderer, simMin, simExt, new THREE.Vector2(-dir.x, -dir.z))

  geometry.computeBoundingBox()
  const waterY = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2
  waterLevel = waterY
  waterPlane.constant = -waterY
  geometry.translate(0, -waterY, 0)
  geometry.rotateX(Math.PI / 2)

  const fog = scene.fog
  const shader = {
    name: 'FlowingWater',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      tSim: { value: null },
      uSimMin: { value: simMin },
      uSimExt: { value: simExt },
      uSimTexel: { value: new THREE.Vector2(1 / waterSim.width, 1 / waterSim.height) },
      uWaveGain: { value: WAVE_GAIN },
      uWarp: { value: span * 0.15 },
      uPointer: { value: new THREE.Vector3() },
      uPointerSize: { value: span * POINTER_MARKER },
      uScale: { value: (WATER_SCALE * 20) / span },
      uSlope: { value: WATER_SLOPE },
      uFlow: { value: new THREE.Vector2(-dir.x, -dir.z).multiplyScalar(FLOW_SPEED * (span / 20)) },
      uSpan: { value: span },
      uGlowPos: { value: glow.position },
      uGlowColor: { value: new THREE.Color(0xffd9a0) },
      uDeep: { value: new THREE.Color(WATER_DEEP) },
      uShallow: { value: new THREE.Color(WATER_SHALLOW) },
      uFogColor: { value: fog.color },
      uFogDensity: { value: fog.density },
    },
    vertexShader: waterVertex,
    fragmentShader: (Q.low ? '#define LOW\n' : '') + waterFragment,
  }

  waterSurface = new Reflector(geometry, {
    shader,
    textureWidth: Q.reflect,
    textureHeight: Q.reflect,
    clipBias: 0.003,
  })
  waterSurface.position.set(0, waterY, 0)
  waterSurface.rotation.x = -Math.PI / 2
  waterSurface.material.transparent = true
  waterSurface.material.side = THREE.DoubleSide
  waterSurface.material.uniforms.tSim.value = waterSim.texture
  waterUniforms = waterSurface.material.uniforms
  scene.add(waterSurface)
}

function resize() {
  if (!renderer || !composer || !camera || !box.value) return
  const w = box.value.clientWidth
  const h = box.value.clientHeight
  if (!w || !h) return

  const dpr = Math.min(window.devicePixelRatio, Q.dpr)
  renderer.setPixelRatio(dpr)
  composer.setPixelRatio(dpr)
  renderer.setSize(w, h)
  composer.setSize(w, h)
  camera.aspect = w / h
  camera.setFocalLength(FOCAL_LENGTH)
  camera.updateProjectionMatrix()
}

function onPointerMove(e) {
  if (e.pointerType === 'touch') return
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  pointerDirty = true
}

function pickables() {
  const r = rocks[viewMode.value]
  if (!r) return []
  return broken.value[viewMode.value] ? r.pieces.filter((p) => p.userData.url) : [r.mesh]
}

function onSceneClick(e) {
  if (loading.value || failed.value) return
  if (!arrived.value) {
    enter()
    return
  }
  if (flying.value) return

  if (typeof e?.clientX === 'number') {
    pointerVec.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  } else pointerVec.set(pointer.x, pointer.y)
  raycaster.setFromCamera(pointerVec, camera)
  const hits = raycaster.intersectObjects(pickables())
  if (!hits.length) return

  const obj = hits[0].object
  const key = ROCK_KEYS.find((k) => rocks[k]?.mesh === obj)
  if (key) breakRock(key)
  else if (obj.userData.url) window.open(obj.userData.url, '_blank', 'noopener')
}

function enter() {
  if (loading.value || failed.value || flying.value || arrived.value) return
  if (prefersReducedMotion) {
    pos.copy(to)
    arrived.value = true
    return
  }
  from.copy(pos)
  progress = 0
  flying.value = true
}

function setView(view) {
  const next = viewMode.value === view ? 'center' : view
  viewMode.value = next
  const r = rocks[next]
  if (r && !broken.value[next]) {
    r.shake = 1
    const { x, z } = r.mesh.position
    spawnSplash(x, waterLevel, z, Q.low ? 30 : 80, worldSpan * 0.25)
    ringRipple(x, z, worldSpan * 0.04, 10, -0.35)
  }
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function updateFlight(delta) {
  if (!flying.value) return
  progress = Math.min(progress + delta / FLIGHT_SECONDS, 1)
  pos.lerpVectors(from, to, easeInOutQuad(progress))
  if (progress === 1) {
    flying.value = false
    arrived.value = true
  }
}

function updateView(delta) {
  if (!arrived.value) return

  let targetPos = to
  let targetLook = throne
  const r = rocks[viewMode.value]
  if (r) {
    targetPos = r.viewPos
    lookTarget.copy(r.mesh.position)
    lookTarget.y = r.lookY
    targetLook = lookTarget
  }

  const k = 1 - Math.exp(-4 * delta)
  pos.lerp(targetPos, k)
  smoothLookAt.lerp(targetLook, k)
}

function updateRocks(delta) {
  const k = 1 - Math.exp(-3 * delta)
  for (const key of ROCK_KEYS) {
    const r = rocks[key]
    if (!r) continue
    const active = viewMode.value === key
    if (!broken.value[key]) {
      const ty = active ? r.targetY + Math.sin(elapsed * 1.4) * 0.04 : r.baseY
      r.mesh.position.y += (ty - r.mesh.position.y) * k
      r.mesh.visible = active || r.mesh.position.y > r.baseY + 0.05

      r.shake = Math.max(0, r.shake - delta * 0.8)
      const s2 = r.shake * r.shake
      tmpE.set(Math.sin(elapsed * 47) * 0.05 * s2, 0, Math.cos(elapsed * 39) * 0.06 * s2)
      tmpQ.setFromEuler(tmpE)
      r.mesh.quaternion.copy(r.baseQuat).multiply(tmpQ)

      if (active && elapsed - r.lastRip > 0.45) {
        r.lastRip = elapsed
        ringRipple(r.mesh.position.x, r.mesh.position.z, worldSpan * 0.04, 6, -0.08)
      }

      const te = hoveredRock === r.mesh ? 1.6 : 0.25
      r.mesh.material.emissiveIntensity += (te - r.mesh.material.emissiveIntensity) * 0.1
    }
    for (const p of r.pieces) animatePiece(p, active, delta)
    if (!active && r.pieces.length && r.pieces.every((p) => p.userData.vis <= 0)) resetRock(key)
  }
}

function updateRipples() {
  if (!waterSurface || !waterSim || !(pointerDirty || flying.value)) return
  pointerDirty = false

  pointerVec.set(pointer.x, pointer.y)
  raycaster.setFromCamera(pointerVec, camera)

  const hit = raycaster.ray.intersectPlane(waterPlane, hitPoint)
  const u = hit ? (hit.x - waterSim.min.x) / waterSim.ext.x : -1
  const v = hit ? (hit.z - waterSim.min.y) / waterSim.ext.y : -1
  if (!hit || u < 0 || u > 1 || v < 0 || v > 1) {
    hasLastDrop = false
    pointerAim.active = 0
    return
  }

  const { x, z } = hit
  pointerAim.x = x
  pointerAim.z = z
  pointerAim.active = 1

  const push = (px, pz) => impulses.push(waterSim.impulseAt(px, pz, -POINTER_STRENGTH, POINTER_RADIUS))

  if (!hasLastDrop) {
    push(x, z)
    lastDropX = x
    lastDropZ = z
    hasLastDrop = true
    return
  }

  const dx = x - lastDropX
  const dz = z - lastDropZ
  const dist = Math.hypot(dx, dz)
  const spacing = waterSim.cellSize * POINTER_RADIUS * 0.6
  if (dist < spacing) return
  const count = Math.min(Math.ceil(dist / spacing), 12)
  for (let i = 1; i <= count; i++) {
    const t = i / count
    push(lastDropX + dx * t, lastDropZ + dz * t)
  }
  lastDropX = x
  lastDropZ = z

  // fast sweeps flick droplets off the surface
  if (dist > worldSpan * 0.02) {
    spawnSplash(x, waterLevel, z, Math.min(6, Math.ceil(dist / (worldSpan * 0.01))), worldSpan * 0.1)
  }
}

function updateGodRays() {
  if (!godRays || !Q.godRays) return
  const facing = camera.getWorldDirection(camDir).dot(sunDir)
  sunPoint.copy(camera.position).addScaledVector(sunDir, 1000).project(camera)
  godRays.sunUv.set(sunPoint.x * 0.5 + 0.5, sunPoint.y * 0.5 + 0.5)
  godRays.strength = loading.value ? 0 : GODRAY_STRENGTH * THREE.MathUtils.smoothstep(facing, -0.05, 0.5)
}

function updateHover() {
  if (isTouch || !arrived.value || flying.value) {
    hoveredRock = null
    return
  }
  pointerVec.set(pointer.x, pointer.y)
  raycaster.setFromCamera(pointerVec, camera)
  const hits = raycaster.intersectObjects(pickables())
  hoveredRock = hits.length ? hits[0].object : null
  if (box.value) box.value.style.cursor = hoveredRock ? 'pointer' : 'auto'
}

function animate(nowMs) {
  frameId = requestAnimationFrame(animate)
  if (Q.low && nowMs - lastFrameMs < 30) return

  const delta = Math.min((nowMs - (lastFrameMs || nowMs)) / 1000, 0.1)
  lastFrameMs = nowMs
  elapsed += delta

  updateFlight(delta)
  updateView(delta)
  updateHover()
  updateRocks(delta)

  const k = 1 - Math.exp(-DRIFT_SPEED * delta)
  drift.x += (pointer.x - drift.x) * k
  drift.y += (pointer.y - drift.y) * k

  camera.position.copy(pos)
  camera.lookAt(smoothLookAt)
  camera.translateX(drift.x * 0.7)
  camera.translateY(drift.y * 0.35)

  camShake = Math.max(0, camShake - delta * 1.6)
  if (camShake > 0) {
    const m = camShake * camShake * worldSpan * 0.006
    camera.translateX((Math.random() - 0.5) * m)
    camera.translateY((Math.random() - 0.5) * m)
  }
  camera.updateMatrixWorld()

  fill.position.copy(camera.position)
  fill.target.position.copy(smoothLookAt)

  updateRipples()
  updateGodRays()
  updateSplash(delta)
  if (waterSim) waterSim.update(delta, impulses)
  if (waterUniforms) {
    waterUniforms.uTime.value = elapsed
    waterUniforms.tSim.value = waterSim.texture
    pointerGlow += (pointerAim.active - pointerGlow) * (1 - Math.exp(-10 * delta))
    waterUniforms.uPointer.value.set(pointerAim.x, pointerAim.z, pointerGlow)
  }
  if (dust) {
    dust.position.y = Math.sin(elapsed * 0.2) * 0.3
    updateDust(delta)
  }
  for (const f of flickers) {
    const n =
      Math.sin(elapsed * 9 + f.phase) * 0.5 +
      Math.sin(elapsed * 23 + f.phase * 2.3) * 0.3 +
      Math.sin(elapsed * 41 + f.phase * 0.7) * 0.2
    f.light.intensity = f.base * (1 + f.amp * n)
  }

  composer.render()
}

function disposeObject(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return
    obj.geometry?.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    materials.forEach((m) => {
      if (!m) return
      Object.values(m).forEach((v) => v && v.isTexture && v.dispose())
      m.dispose()
    })
  })
}

onMounted(() => {
  setup()
  window.addEventListener('pointermove', onPointerMove)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(box.value)
  frameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frameId)
  window.removeEventListener('pointermove', onPointerMove)
  resizeObserver?.disconnect()

  waterSim?.dispose()
  waterSurface?.dispose()
  if (scene) disposeObject(scene)
  if (overlay) disposeObject(overlay)
  if (dust) {
    dust.geometry.dispose()
    dust.material.map.dispose()
    dust.material.dispose()
  }
  if (sp.points) {
    sp.points.geometry.dispose()
    sp.points.material.map.dispose()
    sp.points.material.dispose()
  }
  skyTexture?.dispose()
  environmentMap?.dispose()
  composer?.dispose()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');

.wrap {
  position: fixed;
  inset: 0;
  background: #05060a;
  color: #e8e2d4;
  font-family: 'Cormorant Garamond', Georgia, serif;
}

.scene {
  position: absolute;
  inset: 0;
  cursor: pointer;
  touch-action: manipulation;
}

.scene:focus-visible {
  outline: 2px solid #e8e2d4;
  outline-offset: -4px;
}

.scene :deep(canvas) {
  display: block;
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
}

.msg {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 1.6rem;
  letter-spacing: 0.04em;
  text-align: center;
  pointer-events: none;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}

.pulse {
  animation: pulse 2.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

.info {
  position: absolute;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  transition: opacity 1.6s ease;
  pointer-events: none;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.85);
}

.info.show {
  opacity: 1;
}

.info h1 {
  margin: 0;
  font-size: clamp(2.6rem, 7vw, 5rem);
  font-weight: 600;
}

.info p {
  margin: 0.4rem 0 0;
  font-size: clamp(1.2rem, 2.6vw, 1.8rem);
}

.nav-arrows {
  position: absolute;
  top: 50%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 2rem;
  box-sizing: border-box;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.6s ease;
  z-index: 10;
}

.nav-arrows.show {
  opacity: 1;
}

.nav-arrows.show .arrow-btn {
  pointer-events: auto;
}

.arrow-btn {
  background: rgba(10, 12, 18, 0.6);
  border: 1px solid rgba(232, 226, 212, 0.3);
  color: #e8e2d4;
  padding: 1rem 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  transition: all 0.3s ease;
  font-family: 'Cormorant Garamond', Georgia, serif;
  border-radius: 2px;
}

.arrow-btn:hover {
  background: rgba(232, 226, 212, 0.1);
  border-color: rgba(232, 226, 212, 0.6);
}

.arrow-btn span {
  font-size: 2.5rem;
  line-height: 1;
}

.arrow-btn small {
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.arrow-btn.active {
  background: rgba(255, 217, 160, 0.15);
  border-color: #ffd9a0;
  color: #ffd9a0;
}

.about-btn {
  position: absolute;
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.6s ease, background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  z-index: 10;
}

.about-btn.show {
  opacity: 1;
  pointer-events: auto;
}

.about-btn span {
  font-size: 1.6rem;
}

.hint {
  position: absolute;
  left: 50%;
  bottom: 9%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 1.3rem;
  letter-spacing: 0.08em;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
}

.hint.show {
  opacity: 0.9;
  animation: pulse 2.4s ease-in-out infinite;
}

@media (orientation: portrait) {
  .nav-arrows {
    top: auto;
    bottom: calc(1.5rem + env(safe-area-inset-bottom));
    transform: none;
    padding: 0 1rem;
  }
  .arrow-btn { padding: 0.6rem 1rem; }
  .arrow-btn span { font-size: 2rem; }
  .about-btn { top: calc(4% + env(safe-area-inset-top)); }
  .info { bottom: 22%; }
  .hint { bottom: 17%; font-size: 1.1rem; }
}

@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
  .info { transition: none; }
  .nav-arrows { transition: none; }
  .about-btn { transition: none; }
  .hint.show { animation: none; }
}
</style>