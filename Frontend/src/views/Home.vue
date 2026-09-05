<script setup>
import { ref } from 'vue'

const drawerOpen = ref(false)

// Point each of these at the real destination for that side of what you do.
const categories = [
  { label: 'Photography', href: 'https://example.com/photography' },
  { label: 'Full-Stack Programmer', href: 'https://github.com/Newmi-Git' },
  { label: 'Other', href: '#' },
]
</script>

<template>
  <div class="home">
    <div class="site-frame">
      <!-- ============ PROFILE VIEW ============ -->
      <div class="panel profile-panel" :class="{ 'panel--hidden': drawerOpen }">
        <div class="pfp-box">
          <span class="placeholder-label">PFP</span>
        </div>

        <div class="identity">
          <p class="name-line">YAGHYA</p>
          <p class="name-line">ABDUL</p>
          <h1 class="role-primary">Full-Stack Programmer</h1>
          <p class="role-secondary">Photographer</p>
        </div>

        <a class="socials-box" href="#" target="_blank" rel="noopener">
          <span class="placeholder-label">SOCIALS</span>
        </a>
      </div>

      <!-- ============ DRAWER VIEW ============ -->
      <div class="panel drawer-panel" :class="{ 'panel--hidden': !drawerOpen }">
        <div class="drawer-bar" />
        <div class="drawer-columns">
          <a
            v-for="cat in categories"
            :key="cat.label"
            :href="cat.href"
            target="_blank"
            rel="noopener"
            class="category-column"
          >
            <span class="category-label">{{ cat.label }}</span>
            <span class="category-box" />
          </a>
        </div>
      </div>

      <!-- ============ TOGGLE TAB ============ -->
      <button
        class="drawer-tab"
        :class="{ 'drawer-tab--open': drawerOpen }"
        @click="drawerOpen = !drawerOpen"
        :aria-expanded="drawerOpen"
        aria-label="Toggle profession list"
      >
        <span class="chevron" />
      </button>
    </div>
  </div>
</template>

<style scoped>
:global(html),
:global(body) {
  overflow: hidden;
}

.home {
  height: 100vh;
  height: 100svh;
  width: 100vw;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.site-frame {
  position: relative;
  width: min(94vw, 900px);
  height: min(80vh, 90vw * 0.62);
  aspect-ratio: 16 / 10;
  max-height: 90vh;
  border: 1px solid #fff;
}

/* Both panels occupy the exact same box, so the frame never changes size */
.panel {
  position: absolute;
  inset: 0;
  transition: opacity 0.3s ease;
}

.panel--hidden {
  opacity: 0;
  pointer-events: none;
}

/* ============ PROFILE PANEL ============ */
.profile-panel {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1rem, 4vw, 2.5rem);
  align-items: center;
  padding: clamp(1.25rem, 4vw, 2.5rem);
}

.pfp-box {
  width: clamp(110px, 24vw, 190px);
  height: 100%;
  max-height: 78%;
  border: 1px solid var(--brass);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--brass);
}

.identity {
  display: flex;
  flex-direction: column;
}

.name-line {
  margin: 0;
  font-family: var(--font-body);
  font-weight: 400;
  font-size: clamp(0.75rem, 1.8vw, 0.9rem);
  letter-spacing: 0.04em;
  color: var(--brass);
  line-height: 1.35;
}

.role-primary {
  margin: 0.5rem 0 0;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: clamp(1.3rem, 4.2vw, 2.2rem);
  color: #fff;
  line-height: 1.2;
}

.role-secondary {
  margin: 0.4rem 0 0;
  font-family: var(--font-body);
  font-weight: 400;
  font-size: clamp(0.8rem, 2vw, 1.1rem);
  color: #fff;
}

.socials-box {
  position: absolute;
  right: clamp(1.25rem, 4vw, 2.5rem);
  bottom: clamp(1.25rem, 4vw, 2.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--brass);
  text-decoration: none;
  transition: background 0.2s ease;
}

.socials-box:hover {
  background: rgba(184, 148, 92, 0.1);
}

/* ============ DRAWER PANEL ============ */
.drawer-panel {
  display: flex;
  flex-direction: column;
}

.drawer-bar {
  height: clamp(28px, 6%, 40px);
  border-bottom: 1px solid #fff;
  flex-shrink: 0;
}

.drawer-columns {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  min-height: 0;
}

.category-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: clamp(0.75rem, 3vw, 1.25rem);
  border-left: 1px solid #fff;
  text-decoration: none;
  transition: background 0.2s ease;
  min-height: 0;
}

.category-column:first-child {
  border-left: none;
}

.category-column:hover {
  background: rgba(184, 148, 92, 0.08);
}

.category-label {
  font-family: var(--font-body);
  font-size: clamp(0.75rem, 2vw, 1rem);
  font-weight: 400;
  color: #fff;
  text-align: center;
  flex-shrink: 0;
}

.category-box {
  display: block;
  width: 100%;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--brass);
  transition: border-color 0.2s ease;
}

.category-column:hover .category-box {
  border-color: var(--brass-bright);
}

/* ============ TOGGLE TAB ============ */
.drawer-tab {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -19px;
  width: 46px;
  height: 20px;
  border: 1px solid #fff;
  border-top: none;
  border-radius: 0 0 23px 23px;
  background: #000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  cursor: pointer;
  transition: top 0s, bottom 0s;
  z-index: 2;
}

.drawer-tab--open {
  bottom: auto;
  top: -19px;
  border-top: 1px solid #fff;
  border-bottom: none;
  border-radius: 23px 23px 0 0;
  align-items: flex-start;
  padding-bottom: 0;
  padding-top: 4px;
}

.chevron {
  width: 7px;
  height: 7px;
  border-right: 1px solid #fff;
  border-bottom: 1px solid #fff;
  transform: rotate(45deg) translateY(-2px);
}

.drawer-tab--open .chevron {
  transform: rotate(225deg) translateY(2px);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 640px) {
  .site-frame {
    width: 94vw;
    height: 82vh;
    aspect-ratio: auto;
  }

  .profile-panel {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    overflow-y: auto;
  }

  .pfp-box {
    height: clamp(90px, 30vh, 160px);
    width: clamp(90px, 30vh, 160px);
  }

  .socials-box {
    position: static;
    margin-top: 1rem;
  }

  .drawer-columns {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .category-column {
    border-left: none;
    border-top: 1px solid #fff;
  }

  .category-column:first-child {
    border-top: none;
  }
}
</style>