<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Set this to your photo (e.g. import pfp from '@/assets/pfp.jpg') to replace the placeholder
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

// Menu blocks. Give `src` an image to replace the placeholder.
// `image: false` means the block only shows its title (like "Other" in the sketch).
const sections = [
  { title: 'Photography', image: true, src: '', alt: 'Photography preview' },
  { title: 'Full-Stack Programmer', image: true, src: '', alt: 'Full-stack projects preview' },
  { title: 'Other', image: false },
]

const menuOpen = ref(false)
const toggleMenu = () => { menuOpen.value = !menuOpen.value }

const onKeydown = (event) => {
  if (event.key === 'Escape') menuOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="home-page">
    <main class="home-stage">
      <section class="home-intro">
        <figure class="home-pfp">
          <img v-if="pfpSrc" :src="pfpSrc" alt="Portrait of Yaghya Abdul" />
          <span v-else>PFP</span>
        </figure>

        <div class="home-text">
          <h1 class="home-name"><span>YAGHYA</span> <span>ABDUL</span></h1>
          <h2 class="home-role"><span>Full-Stack</span> <span>Programmer</span></h2>
          <p class="home-craft">Photographer</p>
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

    <!-- The menu panel. The button lives INSIDE it, so it travels with the panel. -->
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

      <!-- inert while closed, so keyboard focus can't land on hidden content -->
      <div id="home-menu-body" class="home-menu-body" :inert="menuOpen ? null : ''">
        <section v-for="section in sections" :key="section.title" class="home-block">
          <h3 class="home-block-title">{{ section.title }}</h3>

          <div v-if="section.image" class="home-block-image">
            <img v-if="section.src" :src="section.src" :alt="section.alt" />
            <span v-else>Image</span>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ==========================================================
   HOME PAGE — every class is prefixed "home-".
   The root is fixed to the viewport, so the page never scrolls
   and nothing leaks to <html> or <body>.
   ========================================================== */

/* Registered so the button border can rotate and the arrow can turn smoothly.
   Browsers without @property still work; they just skip the smooth part. */
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
  --home-gold: #f0e68c;                       /* headings, name, text */
  --home-peach: #fad9c8;                      /* logo-style accent */
  --home-line: rgba(240, 230, 140, 0.28);     /* faint gold borders */
  --home-line-strong: rgba(240, 230, 140, 0.6);
  --home-border-w: 2px;
  --home-ease: cubic-bezier(0.22, 1, 0.36, 1); /* fast start, soft landing */
  --home-font: "Times New Roman", Times, "Liberation Serif", serif;

  position: fixed;
  inset: 0;
  overflow: hidden;              /* no scrolling */
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

/* ---------- Layout: intro sits in the middle of the screen ---------- */
.home-stage {
  position: relative;
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

.home-intro {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
  margin: 0;
}

/* ---------- PFP ---------- */
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

/* Viewfinder corners */
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

/* ---------- Text ---------- */
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

/* ---------- Socials (bottom right) ---------- */
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

/* ==========================================================
   MENU PANEL
   Desktop: slides up from the bottom.
   Mobile:  slides in from the right (see the media query below).
   ========================================================== */
.home-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 78dvh;
  z-index: 5;
  background: var(--home-bg);
  border-top: var(--home-border-w) solid var(--home-line);
  transform: translateY(100%);            /* hidden below the screen */
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

/* A block: title on top, image box inside it */
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
  min-height: 2.4em;                 /* keeps the image boxes lined up */
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

/* ==========================================================
   BUTTON: rides on the panel's edge, so it moves with it.
   Orbiting light, pulse ring, bobbing arrow.
   ========================================================== */
.home-peek {
  --home-angle: 0deg;

  position: absolute;
  left: 50%;
  bottom: 100%;                      /* sits on top of the panel */
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
  /* solid fill inside, a rotating gold/peach light around the border */
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

/* Ring that pulses outward from the button */
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

/* The arrow: points up when closed, down when open (turns smoothly) */
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

/* Bobs along the direction the arrow points, whatever its rotation */
@keyframes home-bob {
  0%, 100% { transform: rotate(var(--home-rot)) translateY(1px); }
  50%      { transform: rotate(var(--home-rot)) translateY(-5px); }
}

@media (prefers-reduced-motion: reduce) {
  .home-peek,
  .home-peek::after,
  .home-peek-icon { animation: none; }

  .home-menu,
  .home-peek,
  .home-peek-icon,
  .home-socials a,
  .home-social-icon { transition: none; }
}

/* ---------- Icons only on small / short screens ---------- */
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

/* ==========================================================
   MOBILE (portrait): the menu slides in from the right
   ========================================================== */
@media (max-width: 640px) {
  .home-stage {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;         /* intro sits in the middle */
    /* leaves room for the side tab on the right */
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

  /* Titles sit in a box, aligned left */
  .home-text {
    width: 100%;
    padding: 1rem 1.2rem;
    background: var(--home-surface);
    border: var(--home-border-w) solid var(--home-line);
    border-radius: 14px;
  }

  /* Socials stay pinned to the bottom, clear of the side tab */
  .home-socials {
    left: max(5vmin, env(safe-area-inset-left));
    right: calc(env(safe-area-inset-right) + 3.4rem);
  }

  /* Panel: full height, slides in from the right, leaves room for the tab */
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

  /* Blocks stack, and share the height equally so nothing scrolls */
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

  /* Button becomes a half-circle tab on the panel's left edge, pointing left */
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

  /* Points left to pull the menu out, right to push it back */
  .home-peek-icon { --home-rot: -90deg; }
  .home-menu--open .home-peek-icon { --home-rot: 90deg; }
}

/* ---------- Very short landscape screens ---------- */
@media (max-height: 420px) {
  .home-pfp { height: 56dvh; }
}
</style>