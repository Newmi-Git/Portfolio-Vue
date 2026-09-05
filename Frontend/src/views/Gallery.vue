<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Later: replace this with real data — fetched from your API,
// or pulled from a Pinia store populated by the admin-only page.
const images = ref([])

const selectedImage = ref(null)

function openLightbox(image) {
  selectedImage.value = image
}

function closeLightbox() {
  selectedImage.value = null
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeLightbox()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="gallery-page">
    <header class="gallery-header">
      <h1>Gallery</h1>
      <p class="subtitle">A collection of moments</p>
    </header>

    <TransitionGroup v-if="images.length" name="frame" tag="div" class="masonry">
      <figure
        v-for="image in images"
        :key="image.id"
        class="frame"
        @click="openLightbox(image)"
      >
        <img :src="image.src" :alt="image.alt" loading="lazy" />
        <figcaption>{{ image.alt }}</figcaption>
      </figure>
    </TransitionGroup>

    <div v-else class="empty-state">
      <p class="empty-line">The gallery is quiet, for now.</p>
      <p class="empty-hint">New photographs will appear here soon.</p>
    </div>

    <Transition name="fade">
      <div v-if="selectedImage" class="lightbox" @click="closeLightbox">
        <figure class="lightbox-frame" @click.stop>
          <img :src="selectedImage.src" :alt="selectedImage.alt" />
          <figcaption>{{ selectedImage.alt }}</figcaption>
        </figure>
        <button class="lightbox-close" @click="closeLightbox" aria-label="Close">&times;</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.gallery-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(2rem, 6vw, 4rem) clamp(1.25rem, 4vw, 2rem) clamp(3rem, 8vw, 6rem);
}

/* ---------- Header ---------- */
.gallery-header {
  padding-bottom: 1.75rem;
  margin-bottom: clamp(1.75rem, 5vw, 3rem);
  border-bottom: 1px solid var(--hairline);
}

.gallery-header h1 {
  font-size: clamp(2.1rem, 6vw, 3rem);
  font-style: italic;
  letter-spacing: 0.01em;
}

.subtitle {
  margin: 0.5rem 0 0;
  color: var(--mist);
  font-size: clamp(0.85rem, 2vw, 0.95rem);
  font-weight: 300;
}

/* ---------- Masonry ---------- */
.masonry {
  column-count: 3;
  column-gap: 1.5rem;
}

@media (max-width: 900px) {
  .masonry {
    column-count: 2;
    column-gap: 1rem;
  }
}

@media (max-width: 560px) {
  .masonry {
    column-count: 1;
  }
}

.frame {
  position: relative;
  margin: 0 0 1.5rem;
  break-inside: avoid;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid transparent;
  transition: border-color 0.35s ease;
}

@media (max-width: 560px) {
  .frame {
    margin-bottom: 1rem;
  }
}

.frame img {
  display: block;
  width: 100%;
  height: auto;
  filter: grayscale(12%) brightness(0.86) contrast(1.02);
  transition: filter 0.5s ease, transform 0.6s ease;
}

.frame:hover img,
.frame:focus-visible img {
  filter: grayscale(0%) brightness(1) contrast(1);
  transform: scale(1.015);
}

.frame:hover,
.frame:focus-visible {
  border-color: var(--hairline);
}

.frame figcaption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.5rem 1rem 0.85rem;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--parchment);
  background: linear-gradient(to top, rgba(12, 10, 16, 0.88), transparent);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.frame:hover figcaption,
.frame:focus-visible figcaption {
  opacity: 1;
  transform: translateY(0);
}

/* On touch devices there's no hover, so keep captions legible without it */
@media (hover: none) {
  .frame figcaption {
    opacity: 1;
    transform: translateY(0);
    font-size: 0.85rem;
    padding: 1.1rem 0.85rem 0.65rem;
  }
  .frame:hover img {
    transform: none;
  }
}

/* ---------- Empty state ---------- */
.empty-state {
  text-align: center;
  padding: clamp(3.5rem, 12vw, 6rem) 1rem;
  border: 1px solid var(--hairline);
}

.empty-line {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(1.2rem, 4vw, 1.5rem);
  color: var(--parchment);
  margin: 0 0 0.75rem;
}

.empty-hint {
  margin: 0;
  color: var(--mist-dim);
  font-size: 0.85rem;
}

/* ---------- Lightbox ---------- */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(12, 10, 16, 0.92);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: clamp(1.25rem, 6vw, 3rem);
}

.lightbox-frame {
  margin: 0;
  max-width: 90vw;
  max-height: 85vh;
  border: 1px solid var(--hairline);
  padding: 0.75rem;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-frame img {
  max-width: 100%;
  max-height: 68vh;
  display: block;
}

.lightbox-frame figcaption {
  margin-top: 0.85rem;
  font-family: var(--font-display);
  font-style: italic;
  color: var(--mist);
  font-size: 0.95rem;
  text-align: center;
}

.lightbox-close {
  position: absolute;
  top: clamp(1rem, 4vw, 2rem);
  right: clamp(1rem, 4vw, 2rem);
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--parchment);
  font-size: 1.4rem;
  cursor: pointer;
  transition: border-color 0.25s ease, color 0.25s ease;
}

.lightbox-close:hover {
  border-color: var(--brass);
  color: var(--brass-bright);
}

/* ---------- Transitions ---------- */
.frame-enter-active,
.frame-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.frame-enter-from,
.frame-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>