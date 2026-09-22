<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const pfpSrc = ''

const githubIcon =
  'M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z'
const instagramIcon =
  'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 1.8A3.2 3.2 0 0 0 3.8 7v10A3.2 3.2 0 0 0 7 20.2h10a3.2 3.2 0 0 0 3.2-3.2V7A3.2 3.2 0 0 0 17 3.8H7Z'
const linkedinIcon =
  'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.07 3.79-2.07 4.05 0 4.8 2.66 4.8 6.13V21h-4v-4.95c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z'

const socials = [
  { label: 'GitHub', href: 'https://github.com/Newmi-Git', icon: githubIcon },
  { label: 'Instagram', href: '#', icon: instagramIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yaghya-abdul-b85aa1346/', icon: linkedinIcon },
]

const sections = [
  { key: 'photography', title: 'Photography', image: true, src: '', alt: 'Photography preview' },
  { key: 'programmer', title: 'Full-Stack Programmer', image: true, src: '', alt: 'Full-stack projects preview' },
  { key: 'other', title: 'Other', image: false },
]

const menuOpen = ref(false)
const toggleMenu = () => { menuOpen.value = !menuOpen.value }

const onKeydown = (event) => {
  if (event.key === 'Escape') menuOpen.value = false
}

const showStar = ref(false)
const shakeOn = ref(false)
const showStarfield = ref(false)

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

const smallStarShadow = ref('')
const twinkleStars = ref([])

const generateStarfield = () => {
  const small = []
  for (let i = 0; i < 160; i++) {
    const x = Math.round(Math.random() * 100)
    const y = Math.round(Math.random() * 100)
    small.push(`${x}vw ${y}vh #fff`)
  }
  smallStarShadow.value = small.join(', ')

  const twinkles = []
  for (let i = 0; i < 26; i++) {
    twinkles.push({
      id: i,
      top: Math.round(Math.random() * 100),
      left: Math.round(Math.random() * 100),
      size: 2 + Math.round(Math.random() * 3),
      delay: (Math.random() * 4).toFixed(2),
      duration: (2.5 + Math.random() * 3).toFixed(2),
    })
  }
  twinkleStars.value = twinkles
}

const shootVars = ref({})

const computeShootVars = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const d = Math.sqrt(vw * vw + vh * vh)
  const angleDeg = (Math.atan2(vw, vh) * 180) / Math.PI
  shootVars.value = {
    '--home-shoot-dx': `-${vw}px`,
    '--home-shoot-dy': `${vh}px`,
    '--home-trail-angle': `${angleDeg}deg`,
    '--home-trail-len': `${d}px`,
  }
}

let starTimer = null
let shakeTimer = null
let fieldTimer = null

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', computeShootVars)
  generateStarfield()
  computeShootVars()

  if (prefersReducedMotion) {
    showStarfield.value = true
    return
  }

  starTimer = setTimeout(() => {
    showStar.value = true

    shakeTimer = setTimeout(() => {
      shakeOn.value = true
      setTimeout(() => { shakeOn.value = false }, 450)
    }, 750)

    fieldTimer = setTimeout(() => {
      showStar.value = false
      showStarfield.value = true
    }, 1300)
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', computeShootVars)
  clearTimeout(starTimer)
  clearTimeout(shakeTimer)
  clearTimeout(fieldTimer)
})
</script>

<template>
  <div class="home-page">
    <div class="home-starfield" :class="{ 'home-starfield--visible': showStarfield }">
      <div class="home-starfield-dots" :style="{ boxShadow: smallStarShadow }"></div>
      <span
        v-for="star in twinkleStars"
        :key="star.id"
        class="home-twinkle"
        :style="{
          top: star.top + '%',
          left: star.left + '%',
          width: star.size + 'px',
          height: star.size + 'px',
          animationDelay: star.delay + 's',
          animationDuration: star.duration + 's',
        }"
      ></span>
    </div>

    <div v-if="showStar" class="home-shooting-star-layer" :style="shootVars">
      <div class="home-star-trail"></div>
      <div class="home-shooting-star"></div>
    </div>

    <main class="home-stage" :class="{ 'home-stage--shake': shakeOn }">
      <section class="home-intro">
        <figure class="home-pfp">
          <img v-if="pfpSrc" :src="pfpSrc" alt="Portrait of Yaghya Abdul" />
          <span v-else>PFP</span>
        </figure>

        <div class="home-text">
          <h1 class="home-name animate__animated animate__fadeInLeft animate__fast"><span>YAGHYA</span> <span>ABDUL</span></h1>
          <h2 class="home-role animate__animated animate__fadeInLeft animate__faster"><span>Full-Stack</span> <span>Programmer</span></h2>
          <p class="home-craft animate__animated animate__fadeInLeft animate__fast">Photographer</p>
        </div>
      </section>

      <nav class="home-socials" aria-label="Social links">
        <ul>
          <li v-for="social in socials" :key="social.label">
            <a :href="social.href" rel="noopener" target="_blank">
              <svg class="home-social-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="social.icon" />
              </svg>
              <span class="home-social-label">{{ social.label }}</span>
            </a>
          </li>
        </ul>
      </nav>
    </main>
    <aside
      class="home-menu"
      :class="{ 'home-menu--open': menuOpen }"
      aria-label="Menu"
    >
      <button
        class="home-peek"
        type="button"
        aria-controls="home-menu-body"
        :aria-expanded="menuOpen"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="toggleMenu"
      >
        <span class="home-peek-icon" aria-hidden="true">&#9650;</span>
      </button>

      <div id="home-menu-body" class="home-menu-body" :inert="menuOpen ? null : ''">
        <section
          v-for="section in sections"
          :key="section.title"
          class="home-block"
          :class="'home-block--' + section.key"
        >
          <h3 class="home-block-title">{{ section.title }}</h3>

          <div v-if="section.image" class="home-block-image">
            <img v-if="section.src" :src="section.src" :alt="section.alt" />
            <span v-else>Image</span>

            <div v-if="section.key === 'photography'" class="home-aperture">
              <span class="home-aperture-blades"></span>
              <span class="home-aperture-ring"></span>
            </div>

            <div v-if="section.key === 'programmer'" class="home-code-anim">
              <span class="home-code-line" v-for="n in 4" :key="n"></span>
              <span class="home-code-cursor"></span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
@property --home-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@property --home-rot {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.home-page {
  --home-bg: #000000;
  --home-surface: #050505;
  --home-gold: #f0e68c;                  
  --home-peach: #fad9c8;                   
  --home-line: rgba(240, 230, 140, 0.28);     
  --home-line-strong: rgba(240, 230, 140, 0.6);
  --home-border-w: 2px;
  --home-ease: cubic-bezier(0.22, 1, 0.36, 1); 
  --home-font: "Times New Roman", Times, "Liberation Serif", serif;

  position: fixed;
  inset: 0;
  overflow: hidden;            
  overscroll-behavior: none;
  background: var(--home-bg);
  color: var(--home-gold);
  font-family: var(--home-font);
}

.home-page *,
.home-page *::before,
.home-page *::after {
  box-sizing: border-box;
}

.home-starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  transition: opacity 2.4s ease;
  pointer-events: none;
}

.home-starfield--visible { opacity: 1; }

.home-starfield-dots {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
}

.home-twinkle {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: home-twinkle ease-in-out infinite;
}

@keyframes home-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.3); }
}

.home-shooting-star-layer {
  position: absolute;
  inset: 0;
  z-index: 15;
  overflow: hidden;
  pointer-events: none;
}

.home-shooting-star {
  position: absolute;
  top: 6%;
  right: 4%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, var(--home-gold) 45%, transparent 75%);
  box-shadow:
    0 0 20px 6px var(--home-gold),
    0 0 44px 14px rgba(240, 230, 140, 0.55),
    0 0 80px 26px rgba(250, 217, 200, 0.3);
  animation: home-shoot 1.15s cubic-bezier(0.5, 0, 0.85, 0.4) forwards;
}

@keyframes home-shoot {
  0% { transform: translate(0, 0) scale(0.3); opacity: 0; }
  8% { opacity: 1; }
  100% {
    transform: translate(var(--home-shoot-dx, -125vw), var(--home-shoot-dy, 130vh)) scale(1.1);
    opacity: 0;
  }
}

.home-star-trail {
  position: absolute;
  top: 6%;
  right: 4%;
  width: 4px;
  height: var(--home-trail-len, 170vmax);
  transform-origin: top center;
  transform: rotate(var(--home-trail-angle, 60deg)) scaleY(0);
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.9),
    var(--home-gold) 12%,
    rgba(240, 230, 140, 0.35) 30%,
    transparent 55%
  );
  filter: blur(0.5px);
  animation:
    home-trail-grow 1.15s cubic-bezier(0.5, 0, 0.85, 0.4) forwards,
    home-trail-fade 2.2s ease-in 1s forwards;
}

@keyframes home-trail-grow {
  0% { transform: rotate(var(--home-trail-angle, 60deg)) scaleY(0); opacity: 0; }
  10% { opacity: 0.9; }
  100% { transform: rotate(var(--home-trail-angle, 60deg)) scaleY(1); opacity: 0.9; }
}

@keyframes home-trail-fade {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

.home-stage {
  position: relative;
  z-index: 2;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(4vmin, env(safe-area-inset-top))
    max(5vmin, env(safe-area-inset-right))
    max(4vmin, env(safe-area-inset-bottom))
    max(5vmin, env(safe-area-inset-left));
}

.home-stage--shake { animation: home-shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }

@keyframes home-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-8px, 5px); }
  20% { transform: translate(7px, -5px); }
  30% { transform: translate(-6px, 6px); }
  40% { transform: translate(6px, -6px); }
  50% { transform: translate(-5px, 4px); }
  60% { transform: translate(5px, -4px); }
  70% { transform: translate(-4px, 3px); }
  80% { transform: translate(4px, -3px); }
  90% { transform: translate(-2px, 2px); }
}

.home-intro {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
  margin: 0;
}

.home-pfp {
  position: relative;
  margin: 0;
  height: min(52dvh, 560px);
  aspect-ratio: 4 / 5;
  max-width: 42vw;
  display: grid;
  place-items: center;
  background: var(--home-surface);
  border-radius: 14px;
  color: var(--home-line-strong);
  font-size: 0.85rem;
  font-style: italic;
}

.home-pfp img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.home-pfp::after {
  --c: var(--home-peach);
  content: "";
  position: absolute;
  inset: -12px;
  pointer-events: none;
  background:
    linear-gradient(var(--c), var(--c)) top left     / 28px var(--home-border-w),
    linear-gradient(var(--c), var(--c)) top left     / var(--home-border-w) 28px,
    linear-gradient(var(--c), var(--c)) top right    / 28px var(--home-border-w),
    linear-gradient(var(--c), var(--c)) top right    / var(--home-border-w) 28px,
    linear-gradient(var(--c), var(--c)) bottom left  / 28px var(--home-border-w),
    linear-gradient(var(--c), var(--c)) bottom left  / var(--home-border-w) 28px,
    linear-gradient(var(--c), var(--c)) bottom right / 28px var(--home-border-w),
    linear-gradient(var(--c), var(--c)) bottom right / var(--home-border-w) 28px;
  background-repeat: no-repeat;
}
.home-text { text-align: left; }

.home-name {
  margin: 0 0 0.5em;
  font-weight: 400;
  font-style: italic;
  font-size: clamp(1.1rem, 3.2vmin, 2rem);
  line-height: 1.2;
  letter-spacing: 0.06em;
  color: var(--home-gold);
}

.home-name span { display: block; }

.home-role {
  margin: 0;
  font-weight: 700;
  font-size: clamp(2.2rem, 8.5vmin, 6.5rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--home-gold);
}

.home-role span { display: block; }

.home-craft {
  margin: 0.5em 0 0;
  font-weight: 400;
  font-style: italic;
  font-size: clamp(1.2rem, 4vmin, 2.6rem);
  line-height: 1.1;
  color: var(--home-peach);
}

.home-socials {
  position: absolute;
  right: max(5vmin, env(safe-area-inset-right));
  bottom: max(4vmin, env(safe-area-inset-bottom));
  min-width: 12rem;
  padding: 1rem 1.4rem;
  background: var(--home-surface);
  border: var(--home-border-w) solid var(--home-line);
  border-radius: 14px;
}

.home-socials ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.home-socials a {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--home-gold);
  font-size: 1.05rem;
  font-style: italic;
  text-decoration: none;
  padding: 0.15rem 0;
  border-bottom: 1px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.home-socials a:hover,
.home-socials a:focus-visible {
  color: var(--home-peach);
  border-bottom-color: var(--home-peach);
  outline: none;
}

.home-social-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex: none;
  fill: currentColor;
  transition: transform 0.2s ease;
}

.home-socials a:hover .home-social-icon,
.home-socials a:focus-visible .home-social-icon {
  transform: translateY(-2px);
}

.home-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 78dvh;
  z-index: 5;
  background: var(--home-bg);
  border-top: var(--home-border-w) solid var(--home-line);
  transform: translateY(100%);      
  transition: transform 0.45s var(--home-ease);
  will-change: transform;
}

.home-menu--open { transform: translateY(0); }

.home-menu-body {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(0.6rem, 1.4vw, 1.2rem);
  padding:
    clamp(0.8rem, 2vmin, 1.4rem)
    max(2.5vw, env(safe-area-inset-right))
    calc(clamp(0.8rem, 2vmin, 1.4rem) + env(safe-area-inset-bottom))
    max(2.5vw, env(safe-area-inset-left));
}

.home-block {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  padding: 1rem;
  background: var(--home-surface);
  border: var(--home-border-w) solid var(--home-line);
  border-radius: 14px;
}

.home-block-title {
  margin: 0;
  min-height: 2.4em;               
  display: grid;
  place-items: center;
  text-align: center;
  text-wrap: balance;
  font-weight: 400;
  font-style: italic;
  font-size: clamp(1.1rem, 2.6vmin, 1.7rem);
  line-height: 1.2;
  color: var(--home-gold);
}

.home-block-image {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(240, 230, 140, 0.04);
  border: var(--home-border-w) solid var(--home-line);
  border-radius: 10px;
  color: var(--home-line-strong);
  font-size: 0.9rem;
  font-style: italic;
}

.home-block-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-aperture {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.home-aperture-blades {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(240, 230, 140, 0.95) 0deg 10deg,
    rgba(5, 5, 5, 0.92) 10deg 60deg
  );
  clip-path: circle(55% at 50% 50%);
  opacity: 0;
}

.home-aperture-ring {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  border: 2px solid var(--home-line-strong);
  opacity: 0;
}

.home-block--photography:hover .home-aperture-blades {
  opacity: 1;
  animation: home-aperture-cycle 1.1s ease-in-out;
}

.home-block--photography:hover .home-aperture-ring {
  opacity: 1;
  animation: home-aperture-ring-pulse 1.1s ease-in-out;
}

@keyframes home-aperture-cycle {
  0% { clip-path: circle(55% at 50% 50%); }
  45% { clip-path: circle(6% at 50% 50%); }
  100% { clip-path: circle(55% at 50% 50%); }
}

@keyframes home-aperture-ring-pulse {
  0%, 100% { transform: scale(1); }
  45% { transform: scale(0.85); }
}

.home-code-anim {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0 14%;
  pointer-events: none;
}

.home-code-line {
  display: block;
  height: 6px;
  width: 0;
  border-radius: 3px;
  background: var(--home-gold);
  opacity: 0.9;
}

.home-code-line:nth-child(2) { background: var(--home-peach); }
.home-code-line:nth-child(3) { background: var(--home-gold); }
.home-code-line:nth-child(4) { background: var(--home-peach); }

.home-code-cursor {
  display: none;
  width: 8px;
  height: 16px;
  background: var(--home-gold);
}

.home-block--programmer:hover .home-code-line {
  animation: home-code-type 0.5s steps(10) forwards;
}

.home-block--programmer:hover .home-code-line:nth-child(1) { animation-delay: 0s; width: 70%; }
.home-block--programmer:hover .home-code-line:nth-child(2) { animation-delay: 0.15s; width: 45%; }
.home-block--programmer:hover .home-code-line:nth-child(3) { animation-delay: 0.3s; width: 60%; }
.home-block--programmer:hover .home-code-line:nth-child(4) { animation-delay: 0.45s; width: 30%; }

.home-block--programmer:hover .home-code-cursor {
  display: block;
  animation: home-code-blink 0.8s steps(1) infinite;
  animation-delay: 0.6s;
}

@keyframes home-code-type {
  from { width: 0; }
}

@keyframes home-code-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.home-peek {
  --home-angle: 0deg;

  position: absolute;
  left: 50%;
  bottom: 100%;                   
  transform: translateX(-50%);
  width: clamp(84px, 11vw, 124px);
  height: clamp(42px, 5.5vw, 62px);
  padding: 0 0 4px;
  display: grid;
  place-items: center;
  color: var(--home-gold);
  font-size: 1.1rem;
  line-height: 1;
  border: var(--home-border-w) solid transparent;
  border-bottom: 0;
  border-radius: 999px 999px 0 0;
  background:
    linear-gradient(var(--home-bg), var(--home-bg)) padding-box,
    conic-gradient(
      from var(--home-angle),
      var(--home-line) 0 55%,
      var(--home-gold) 78%,
      var(--home-peach) 90%,
      var(--home-line) 100%
    ) border-box;
  cursor: pointer;
  animation: home-orbit 4s linear infinite;
  transition: height 0.25s ease, color 0.2s ease, box-shadow 0.25s ease;
}

.home-peek::after {
  content: "";
  position: absolute;
  inset: -2px;
  border: 1px solid var(--home-gold);
  border-bottom: 0;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transform-origin: 50% 100%;
  animation: home-pulse 2.6s ease-out infinite;
}

.home-peek:hover {
  height: clamp(50px, 6.5vw, 72px);
  color: var(--home-peach);
  box-shadow: 0 0 26px rgba(240, 230, 140, 0.28);
  animation-duration: 1.8s;
}

.home-peek:active { transform: translateX(-50%) translateY(2px); }

.home-peek:focus-visible {
  outline: 2px solid var(--home-peach);
  outline-offset: 4px;
}

.home-peek-icon {
  --home-rot: 0deg;
  display: block;
  line-height: 1;
  transform: rotate(var(--home-rot));
  transition: --home-rot 0.45s var(--home-ease);
  animation: home-bob 1.8s ease-in-out infinite;
}

.home-menu--open .home-peek-icon { --home-rot: 180deg; }

.home-peek:hover .home-peek-icon { animation-duration: 0.9s; }

@keyframes home-orbit {
  to { --home-angle: 360deg; }
}

@keyframes home-pulse {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes home-bob {
  0%, 100% { transform: rotate(var(--home-rot)) translateY(1px); }
  50%      { transform: rotate(var(--home-rot)) translateY(-5px); }
}

@media (prefers-reduced-motion: reduce) {
  .home-peek,
  .home-peek::after,
  .home-peek-icon,
  .home-shooting-star,
  .home-star-trail,
  .home-stage--shake,
  .home-twinkle,
  .home-block--photography:hover .home-aperture-blades,
  .home-block--photography:hover .home-aperture-ring,
  .home-block--programmer:hover .home-code-line,
  .home-block--programmer:hover .home-code-cursor { animation: none; }

  .home-menu,
  .home-peek,
  .home-peek-icon,
  .home-socials a,
  .home-social-icon,
  .home-starfield { transition: none; }

  .home-starfield { opacity: 1; }
}

@media (max-width: 640px), (max-height: 420px) {
  .home-socials { min-width: 0; padding: 0.8rem 1.2rem; }

  .home-socials ul {
    grid-auto-flow: column;
    justify-content: space-between;
    gap: 1.4rem;
  }

  .home-social-icon { width: 1.5rem; height: 1.5rem; }

  .home-social-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

@media (max-width: 640px) {
  .home-stage {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;       
    padding-right: calc(env(safe-area-inset-right) + 3.4rem);
  }

  .home-intro {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.4rem;
    width: 100%;
  }

  .home-pfp {
    height: min(30dvh, 260px);
    aspect-ratio: 3 / 4;
    max-width: 100%;
    border-radius: 28px;
  }

  .home-text {
    width: 100%;
    padding: 1rem 1.2rem;
    background: var(--home-surface);
    border: var(--home-border-w) solid var(--home-line);
    border-radius: 14px;
  }

  .home-socials {
    left: max(5vmin, env(safe-area-inset-left));
    right: calc(env(safe-area-inset-right) + 3.4rem);
  }

  .home-menu {
    left: auto;
    right: 0;
    top: 0;
    bottom: 0;
    width: calc(100% - 3.4rem);
    height: auto;
    border-top: 0;
    border-left: var(--home-border-w) solid var(--home-line);
    transform: translateX(100%);
  }

  .home-menu--open { transform: translateX(0); }

  .home-menu-body {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding:
      max(1rem, env(safe-area-inset-top))
      max(1rem, env(safe-area-inset-right))
      max(1rem, env(safe-area-inset-bottom))
      1rem;
  }

  .home-block {
    flex: 1 1 0;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
  }

  .home-block-title {
    min-height: 0;
    font-size: 1.15rem;
  }

  .home-peek {
    left: auto;
    right: 100%;
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
    width: 44px;
    height: 92px;
    padding: 0;
    border: var(--home-border-w) solid transparent;
    border-right: 0;
    border-radius: 999px 0 0 999px;
    transition: width 0.25s ease, color 0.2s ease, box-shadow 0.25s ease;
  }

  .home-peek::after {
    border: 1px solid var(--home-gold);
    border-right: 0;
    transform-origin: 100% 50%;
  }

  .home-peek:hover {
    width: 52px;
    height: 92px;
  }

  .home-peek:active { transform: translateY(-50%) translateX(2px); }

  .home-peek-icon { --home-rot: -90deg; }
  .home-menu--open .home-peek-icon { --home-rot: 90deg; }
}

@media (max-height: 420px) {
  .home-pfp { height: 56dvh; }
}
</style>