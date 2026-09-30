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

    <p v-if="failed" class="msg">The throne room couldn't load. Refresh the page to try again.</p>
    <p v-else-if="loading" class="msg">Loading...</p>
    <p v-else-if="!flying && !arrived" class="msg pulse">Click anywhere to enter</p>

    <div class="info" :class="{ show: arrived && !brokenLeft && !brokenRight }">
      <h1>{{ NAME }}</h1>
      <p>{{ TITLE }}</p>
    </div>

    <div class="nav-arrows" :class="{ show: arrived }">
      <button class="arrow-btn left" @click.stop="setView('left')" :class="{ active: viewMode === 'left' }">
        <span>‹</span>
        <small>Skills</small>
      </button>
      <button class="arrow-btn right" @click.stop="setView('right')" :class="{ active: viewMode === 'right' }">
        <small>Contact</small>
        <span>›</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

const NAME = 'Yaghya Abdul'
const TITLE = 'Software Developer'

const FLIGHT_SECONDS = 5
const STOP_FRACTION = 0.70 
const ENV_INTENSITY = 0.35 
const EXPOSURE = 0.85
const FOCAL_LENGTH = 15 
const CAMERA_DROP = 7.0 
const CAMERA_SHIFT_RIGHT = 0.009 
const DROP_COUNT = 8
const DROP_MIN_STEP = 0.15 
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
const WATER_REFLECTION_SIZE = 1024
const WATER_DEEP = 0x0a2a36
const WATER_SHALLOW = 0x1d5a66
const SIM_RESOLUTION = 512 
const WAVE_GAIN = 0.01 
const POINTER_STRENGTH = 0.09 
const POINTER_RADIUS = 0.5 
const POINTER_MARKER = 0.01 
const SIM_CURRENT = 0.1 
const DRIP_INTERVAL = 0 

const box = ref(null)
const loading = ref(true)
const failed = ref(false)
const flying = ref(false)
const arrived = ref(false)
const viewMode = ref('center')
const brokenLeft = ref(false)
const brokenRight = ref(false)

const pointer = { x: 0, y: 0 }
const drift = { x: 0, y: 0 }
let pointerDirty = false

const pos = new THREE.Vector3(0, 2, 10)
const throne = new THREE.Vector3(0, 2, -10)
const from = new THREE.Vector3()
const to = new THREE.Vector3()
const viewLeftPos = new THREE.Vector3()
const viewRightPos = new THREE.Vector3()
const smoothLookAt = new THREE.Vector3()
let waterLevel = 0

let progress = 0

const impulses = []
let waterSim = null
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitPoint = new THREE.Vector3()
const pointerAim = { x: 0, z: 0, active: 0 }
let pointerGlow = 0
let loggedHit = false
let dripTimer = 1
let lastDropX = 0
let lastDropZ = 0
let hasLastDrop = false 

let renderer = null
let scene = null
let camera = null
let composer = null
let godRays = null
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

let leftRock = null
let rightRock = null
let leftRockTargetY = 0
let rightRockTargetY = 0
let leftRockBaseY = 0
let rightRockBaseY = 0
let rockHeight = 0

let hoveredRock = null
const leftPieces = []
const rightPieces = []

const drips = []
const dripGeo = new THREE.SphereGeometry(0.18, 6, 6)
const dripMat = new THREE.MeshStandardMaterial({ 
  color: 0x88ccff, 
  transparent: true, 
  opacity: 0.9, 
  roughness: 0.1, 
  metalness: 0.3,
  emissive: 0x113344
})

const sunDir = new THREE.Vector3(0, 1, 0)
const sunPoint = new THREE.Vector3()
const camDir = new THREE.Vector3()
const raycaster = new THREE.Raycaster()
const pointerVec = new THREE.Vector2()

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

    vec2 g = waterSlope(p - f * t, 5);
    g += 0.6 * waterSlope(p * 1.7 + vec2(f.y, -f.x) * 0.4 * t - f * 1.6 * t + 7.1, 4);
    g += 0.4 * waterSlope(p * 3.1 - f * 2.2 * t + vec2(3.7, 9.2), 3);
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

    const cell = Math.max(ext.x, ext.y) / SIM_RESOLUTION
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
    const STEP = 1 / 120
    this.accum += delta
    let steps = 0
    while (this.accum >= STEP && steps < 4) {
      this.step(queue)
      this.accum -= STEP
      steps++
    }
    if (steps === 4) this.accum = 0
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

function makeRockTexture(title) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')
  
  ctx.fillStyle = '#2a2a2e'
  ctx.fillRect(0, 0, 512, 512)
  
  for(let i=0; i<4000; i++) {
    const v = 25 + Math.random() * 35
    ctx.fillStyle = `rgba(${v}, ${v}, ${v+5}, 0.2)`
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = Math.random() * 15
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.font = 'bold 80px Georgia'
  ctx.textAlign = 'center'
  ctx.fillText(title, 256, 280)
  
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillText(title, 256, 278)
  
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  return tex
}

function makeRockGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 8, 16, 8)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    
    const isFrontFace = v.z > d / 2 - 0.01
    const isBackFace = v.z < -d / 2 + 0.01
    let displacement = 0.3
    
    if (isFrontFace) displacement = 0.08
    if (isBackFace) displacement = 0.45
    
    const dir = v.clone().normalize()
    const noise = (Math.sin(v.x * 3.1 + v.y * 2.7) * Math.cos(v.z * 4.2)) * 0.5 + 0.5
    
    v.addScaledVector(dir, noise * displacement)
    
    if (v.y > h / 2 - 0.2) {
      v.y += (Math.random() - 0.5) * 0.3
      v.x += (Math.random() - 0.5) * 0.2
      v.z += (Math.random() - 0.5) * 0.2
    }
    if (v.y < -h / 2 + 0.2 && !isFrontFace && !isBackFace) {
      v.y -= Math.random() * 0.3
      v.x += (Math.random() - 0.5) * 0.2
      v.z += (Math.random() - 0.5) * 0.2
    }
    
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  
  const finalGeo = geo.toNonIndexed()
  finalGeo.computeVertexNormals()
  return finalGeo
}

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.2 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a);
    }
  `
}

function setup() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05060a)
  scene.fog = new THREE.FogExp2(0x0b0f17, 0.02) 

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = EXPOSURE
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  box.value.appendChild(renderer.domElement)

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  
  godRays = new GodRaysPass(scene, camera)
  composer.addPass(godRays)
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.6, 0.8))
  
  const vignettePass = new ShaderPass(VignetteShader)
  vignettePass.uniforms.offset.value = 1.1
  vignettePass.uniforms.darkness.value = 1.2
  composer.addPass(vignettePass)

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
    },
    undefined,
    (err) => console.warn('Could not load /hall.hdr:', err),
  )

  new GLTFLoader().load('/throne.glb', onModelLoaded, undefined, onModelError)
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

  const camOffset = span * 0.1
  viewLeftPos.copy(to).addScaledVector(dir, -camOffset)
  viewRightPos.copy(to).addScaledVector(dir, -camOffset)

  const glow = new THREE.PointLight(0xffd9a0, 55 * unit, 0, 2)
  glow.position.set(throne.x, throne.y + 3, throne.z + 1)
  glow.castShadow = true
  glow.shadow.mapSize.set(1024, 1024)
  glow.shadow.bias = -0.0001
  glow.shadow.normalBias = 0.05
  glow.shadow.camera.far = span * 3
  scene.add(glow)
  flickers.push({ light: glow, base: glow.intensity, amp: 0.04, phase: 1.7 })

  const mid = new THREE.Vector3().lerpVectors(pos, throne, 0.6)
  for (const s of [-1, 1]) {
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
  sun.shadow.mapSize.set(4096, 4096)
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

  if (waterSources.length) createWater(waterSources, glow, span, dir)

  godRays.hide = [...openings, waterSurface].filter(Boolean)

  createRocks(to, side, dir, span, size, pos)

  for(let i=0; i<150; i++) {
    const m = new THREE.Mesh(dripGeo, dripMat.clone())
    m.visible = false
    m.castShadow = false
    scene.add(m)
    drips.push({ mesh: m, vy: 0, active: false })
  }

  smoothLookAt.copy(throne)
  renderer.shadowMap.needsUpdate = true
  loading.value = false
}

function createRocks(centerPos, sideVec, forwardVec, span, size, entrancePos) {
  const rockW = Math.max(0.8, span * 0.05)
  rockHeight = Math.max(2.0, span * 0.12)
  const rockD = Math.max(0.25, span * 0.02)
  
  const leftGeo = makeRockGeometry(rockW, rockHeight, rockD)
  const rightGeo = makeRockGeometry(rockW, rockHeight, rockD)
  
  const leftTex = makeRockTexture('SKILLS')
  const rightTex = makeRockTexture('CONTACT')
  
  const leftMat = new THREE.MeshStandardMaterial({ 
    map: leftTex, 
    roughness: 0.9, 
    metalness: 0.1, 
    flatShading: true,
    emissive: 0x00ffff,
    emissiveIntensity: 0.0 
  })
  const rightMat = new THREE.MeshStandardMaterial({ 
    map: rightTex, 
    roughness: 0.9, 
    metalness: 0.1, 
    flatShading: true,
    emissive: 0xff00ff,
    emissiveIntensity: 0.0 
  })
  
  leftRock = new THREE.Mesh(leftGeo, leftMat)
  rightRock = new THREE.Mesh(rightGeo, rightMat)
  
  leftRock.castShadow = true
  rightRock.castShadow = true
  
  const rockForward = centerPos.clone().lerp(entrancePos, 0.5)
  const safeSide = size.x * 0.2
  
  leftRock.position.copy(rockForward).addScaledVector(sideVec, -safeSide)
  leftRock.lookAt(entrancePos.x, leftRock.position.y, entrancePos.z)
  
  rightRock.position.copy(rockForward).addScaledVector(sideVec, safeSide)
  rightRock.lookAt(entrancePos.x, rightRock.position.y, entrancePos.z)
  
  leftRockBaseY = waterLevel - rockHeight - 0.5
  leftRockTargetY = waterLevel + 0.8
  leftRock.position.y = leftRockBaseY
  
  rightRockBaseY = waterLevel - rockHeight - 0.5
  rightRockTargetY = waterLevel + 0.8
  rightRock.position.y = rightRockBaseY
  
  scene.add(leftRock, rightRock)
}

function breakRock(side) {
  const isLeft = side === 'left'
  const mainRock = isLeft ? leftRock : rightRock
  const piecesArray = isLeft ? leftPieces : rightPieces
  
  if (isLeft) brokenLeft.value = true
  else brokenRight.value = true
  
  mainRock.visible = false
  
  const skills = isLeft 
    ? ['Vue 3', 'Three.js', 'TypeScript', 'Node.js']
    : ['Email', 'GitHub', 'LinkedIn', 'Twitter']
    
  const basePos = mainRock.position.clone()
  
  skills.forEach((skill, i) => {
    const w = 0.6
    const h = 0.9
    const d = 0.3
    const geo = makeRockGeometry(w, h, d)
    const tex = makeRockTexture(skill)
    const mat = new THREE.MeshStandardMaterial({ 
      map: tex, 
      roughness: 0.9, 
      metalness: 0.1, 
      flatShading: true,
      emissive: isLeft ? 0x002244 : 0x330022,
      emissiveIntensity: 0.2
    })
    const piece = new THREE.Mesh(geo, mat)
    piece.position.copy(basePos)
    piece.castShadow = true
    
    const angle = (i / skills.length) * Math.PI * 2
    piece.userData = {
      vx: Math.cos(angle) * (2.0 + Math.random() * 2.0),
      vy: 2.0 + Math.random() * 3.0,
      vz: Math.sin(angle) * (2.0 + Math.random() * 2.0),
      baseY: basePos.y,
      phase: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2.0
    }
    scene.add(piece)
    piecesArray.push(piece)
  })
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

  const box = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position'))
  const simMin = new THREE.Vector2(box.min.x, box.min.z)
  const simExt = new THREE.Vector2(Math.max(box.max.x - box.min.x, 0.01), Math.max(box.max.z - box.min.z, 0.01))
  waterSim = new WaterSim(renderer, simMin, simExt, new THREE.Vector2(-dir.x, -dir.z))

  geometry.computeBoundingBox()
  const waterY = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2
  waterLevel = waterY
  waterPlane.constant = -waterY
  if (pos.y <= waterY) console.warn('[water] the camera is below the water surface, so reflections will not draw')
  console.info('[water] simulation grid', waterSim.width, 'x', waterSim.height, 'water level', waterY.toFixed(2))
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
    fragmentShader: waterFragment,
  }

  waterSurface = new Reflector(geometry, {
    shader,
    textureWidth: WATER_REFLECTION_SIZE,
    textureHeight: WATER_REFLECTION_SIZE,
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

  const dpr = Math.min(window.devicePixelRatio, 2)
  renderer.setPixelRatio(dpr)
  composer.setPixelRatio(dpr)
  renderer.setSize(w, h)
  composer.setSize(w, h)
  camera.aspect = w / h
  camera.setFocalLength(FOCAL_LENGTH) 
  camera.updateProjectionMatrix()
}

function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  pointerDirty = true
}

function onSceneClick() {
  if (loading.value || failed.value) return
  if (!arrived.value) {
    enter()
    return
  }
  if (flying.value) return
  
  pointerVec.set(pointer.x, pointer.y)
  raycaster.setFromCamera(pointerVec, camera)
  const intersects = []
  if (!brokenLeft.value && leftRock) intersects.push(leftRock)
  if (!brokenRight.value && rightRock) intersects.push(rightRock)
  
  const hits = raycaster.intersectObjects(intersects)
  if (hits.length > 0) {
    const hit = hits[0].object
    if (hit === leftRock) breakRock('left')
    else if (hit === rightRock) breakRock('right')
  }
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

function setView(direction) {
  viewMode.value = viewMode.value === direction ? 'center' : direction
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
  
  if (viewMode.value === 'left') {
    targetPos = viewLeftPos
    targetLook = leftRock.position
  } else if (viewMode.value === 'right') {
    targetPos = viewRightPos
    targetLook = rightRock.position
  }
  
  const k = 1 - Math.exp(-4 * delta)
  pos.lerp(targetPos, k)
  smoothLookAt.lerp(targetLook, k)
}

function updateRocks(delta) {
  if (!leftRock || !rightRock) return
  
  const lerpK = 1 - Math.exp(-3 * delta)
  
  if (!brokenLeft.value) {
    const targetLY = viewMode.value === 'left' ? leftRockTargetY : leftRockBaseY
    leftRock.position.y += (targetLY - leftRock.position.y) * lerpK
    
    const targetEmissive = hoveredRock === leftRock ? 1.5 : 0.0
    leftRock.material.emissiveIntensity += (targetEmissive - leftRock.material.emissiveIntensity) * 0.1
  }
  
  if (!brokenRight.value) {
    const targetRY = viewMode.value === 'right' ? rightRockTargetY : rightRockBaseY
    rightRock.position.y += (targetRY - rightRock.position.y) * lerpK
    
    const targetEmissive = hoveredRock === rightRock ? 1.5 : 0.0
    rightRock.material.emissiveIntensity += (targetEmissive - rightRock.material.emissiveIntensity) * 0.1
  }
  
  const updatePieces = (pieces) => {
    for (const p of pieces) {
      const ud = p.userData
      
      ud.vx *= 0.96
      ud.vz *= 0.96
      ud.vy *= 0.96
      
      p.position.x += ud.vx * delta
      p.position.z += ud.vz * delta
      
      const targetY = ud.baseY + Math.sin(elapsed * 1.5 + ud.phase) * 0.5
      ud.vy += (targetY - p.position.y) * 0.1
      p.position.y += ud.vy * delta
      
      p.rotation.x += ud.rotSpeed * delta
      p.rotation.y += ud.rotSpeed * 0.5 * delta
    }
  }
  
  updatePieces(leftPieces)
  updatePieces(rightPieces)
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
  if (!loggedHit) {
    loggedHit = true
    console.info('[water] the pointer reached the water at', x.toFixed(2), z.toFixed(2))
  }

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
}

function updateGodRays() {
  if (!godRays) return
  const facing = camera.getWorldDirection(camDir).dot(sunDir)
  sunPoint.copy(camera.position).addScaledVector(sunDir, 1000).project(camera)
  godRays.sunUv.set(sunPoint.x * 0.5 + 0.5, sunPoint.y * 0.5 + 0.5)
  godRays.strength = loading.value ? 0 : GODRAY_STRENGTH * THREE.MathUtils.smoothstep(facing, -0.05, 0.5)
}

function updateHover() {
  if (!arrived.value || flying.value) {
    hoveredRock = null
    return
  }
  
  pointerVec.set(pointer.x, pointer.y)
  raycaster.setFromCamera(pointerVec, camera)
  const intersects = []
  if (!brokenLeft.value && leftRock) intersects.push(leftRock)
  if (!brokenRight.value && rightRock) intersects.push(rightRock)
  
  const hits = raycaster.intersectObjects(intersects)
  if (hits.length > 0) {
    hoveredRock = hits[0].object
    if (box.value) box.value.style.cursor = 'pointer'
  } else {
    hoveredRock = null
    if (box.value) box.value.style.cursor = 'auto'
  }
}

function animate(nowMs) {
  frameId = requestAnimationFrame(animate)

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
  camera.updateMatrixWorld()

  updateRipples()
  updateGodRays()
  if (waterSim) {
    if (DRIP_INTERVAL > 0) {
      dripTimer -= delta
      if (dripTimer <= 0) {
        dripTimer = DRIP_INTERVAL * (0.5 + Math.random())
        impulses.push({
          u: 0.05 + Math.random() * 0.9,
          v: 0.05 + Math.random() * 0.9,
          strength: -(0.25 + Math.random() * 0.35),
          radius: 2 + Math.random() * 2,
        })
      }
    }
    waterSim.update(delta, impulses)
  }
  if (waterUniforms) {
    waterUniforms.uTime.value = elapsed
    if (waterSim) waterUniforms.tSim.value = waterSim.texture
    pointerGlow += (pointerAim.active - pointerGlow) * (1 - Math.exp(-10 * delta))
    waterUniforms.uPointer.value.set(pointerAim.x, pointerAim.z, pointerGlow)
  }
  for (const f of flickers) {
    const n = Math.sin(elapsed * 9 + f.phase) * 0.5 + Math.sin(elapsed * 23 + f.phase * 2.3) * 0.3 + Math.sin(elapsed * 41 + f.phase * 0.7) * 0.2
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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap');

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
}

.scene:focus-visible {
  outline: 2px solid #e8e2d4;
  outline-offset: -4px;
}

.scene :deep(canvas) {
  display: block;
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

@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
  .info { transition: none; }
  .nav-arrows { transition: none; }
}
</style>