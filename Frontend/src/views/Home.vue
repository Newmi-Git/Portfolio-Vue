<template>
  <div class="wrap">
    <div ref="box" class="scene" @click="enter"></div>
    <p v-if="loading" class="msg">Loading...</p>
    <p v-else-if="!flying && !arrived" class="msg pulse">Click anywhere to enter</p>
    <div class="info" :class="{ show: arrived }">
      <h1>Your Name</h1>
      <p>Software Developer</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const box = ref(null)
const loading = ref(true)
const flying = ref(false)
const arrived = ref(false)

const mouse = { x: 0, y: 0 }
const drift = { x: 0, y: 0 }

const pos = new THREE.Vector3(0, 2, 10)
const throne = new THREE.Vector3(0, 2, -10)
const from = new THREE.Vector3()
const to = new THREE.Vector3()
let progress = 0

const drops = []
for (let i = 0; i < 8; i++) drops.push(new THREE.Vector3(0, 0, -999))
let nextDrop = 0
let lastX = 0
let lastZ = 0

let renderer, scene, camera, water, waterMaterial, frameId, composer
const clock = new THREE.Clock()
const raycaster = new THREE.Raycaster()

const vertexShader = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uDrops[8];
  varying vec3 vWorld;

  void main() {
    float ripple = 0.0;
    for (int i = 0; i < 8; i++) {
      float age = uTime - uDrops[i].z;
      float dist = distance(vWorld.xz, uDrops[i].xy);
      ripple += sin(dist * 28.0 - age * 7.0) * exp(-dist * 2.5) * exp(-age * 1.2) * step(0.0, age);
    }
    float shimmer = sin(vWorld.x * 3.0 + uTime * 0.6) * sin(vWorld.z * 3.0 - uTime * 0.5) * 0.03;
    vec3 dark = vec3(0.02, 0.06, 0.09);
    vec3 bright = vec3(0.3, 0.5, 0.6);
    float mixAmount = clamp(0.5 + ripple * 0.5 + shimmer, 0.0, 1.0);
    gl_FragColor = vec4(mix(dark, bright, mixAmount * 0.6), 0.88);
  }
`

function setup() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05060a)
  scene.fog = new THREE.FogExp2(0x05060a, 0.03)

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.toneMapping = THREE.ACESFilmicToneMapping 
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  box.value.appendChild(renderer.domElement)
  resize()

  scene.add(new THREE.AmbientLight(0xffffff, 2))
  scene.add(new THREE.HemisphereLight(0xaab4d0, 0x1a1a22, 0.8))
  new RGBELoader().load('/hall.hdr', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = tex
  })

  new GLTFLoader().load('/throne.glb', onLoaded, undefined, (err) => console.log(err))

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.85))
  composer.addPass(new OutputPass())
}

function onLoaded(gltf) {
  scene.add(gltf.scene)

  const startMarker = gltf.scene.getObjectByName('CamStart')
  const throneMarker = gltf.scene.getObjectByName('CamThrone')
  if (startMarker) startMarker.getWorldPosition(pos)
  if (throneMarker) throneMarker.getWorldPosition(throne)

  const bounds = new THREE.Box3().setFromObject(gltf.scene)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  console.log('markers found:', !!startMarker, !!throneMarker)
  console.log('size:', size, 'center:', center)

  if (!startMarker || !throneMarker) {
    pos.set(center.x, center.y + 1.6, center.z + size.z / 2)
    throne.set(center.x, center.y + 1.6, center.z - size.z / 2)
  }
  const back = new THREE.Vector3().subVectors(pos, throne)
  back.y = 0
  back.normalize()
  to.copy(throne).addScaledVector(back, 4)
  to.y = pos.y

  const glow = new THREE.PointLight(0xffd9a0, 40, 0, 2)
  glow.castShadow = true
  glow.shadow.mapSize.set(2048, 2048)
  glow.position.set(throne.x, throne.y + 3, throne.z + 1)
  scene.add(glow)

  gltf.scene.traverse((obj) => {    
    if (obj.isMesh) {
     obj.material.side = THREE.DoubleSide
     obj.castShadow = true
     obj.receiveShadow = true
    }
    if (obj.isMesh && obj.name.startsWith('Water')) water = obj
  })

  if (water) {
    waterMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: { uTime: { value: 0 }, uDrops: { value: drops } },
    })
    water.material = waterMaterial
  }
  loading.value = false
}

function resize() {
  const w = box.value.clientWidth
  const h = box.value.clientHeight
  renderer.setSize(w, h)
  composer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  
}

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1
}

function enter() {
  if (loading.value || flying.value || arrived.value) return
  from.copy(pos)
  progress = 0
  flying.value = true
}

function animate() {
  frameId = requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.elapsedTime

  if (flying.value) {
    progress = Math.min(progress + delta / 5, 1)
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2
    pos.lerpVectors(from, to, eased)
    if (progress === 1) {
      flying.value = false
      arrived.value = true
    }
  }

  drift.x += (mouse.x - drift.x) * 0.04
  drift.y += (mouse.y - drift.y) * 0.04

  camera.position.copy(pos)
  camera.lookAt(throne)
  camera.translateX(drift.x * 0.7)
  camera.translateY(-drift.y * 0.35)

  if (water) {
    raycaster.setFromCamera(new THREE.Vector2(mouse.x, -mouse.y), camera)
    const hit = raycaster.intersectObject(water)[0]
    if (hit) {
      const dx = hit.point.x - lastX
      const dz = hit.point.z - lastZ
      if (Math.sqrt(dx * dx + dz * dz) > 0.15) {
        drops[nextDrop].set(hit.point.x, hit.point.z, time)
        nextDrop = (nextDrop + 1) % 8
        lastX = hit.point.x
        lastZ = hit.point.z
      }
    }
    waterMaterial.uniforms.uTime.value = time
  }

  composer.render()
}

onMounted(() => {
  setup()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', resize)
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', resize)
  renderer.dispose()
  renderer.domElement.remove()
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
  pointer-events: auto;
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

@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
  .info { transition: none; }
}
</style>