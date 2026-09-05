<script setup>
import { ref } from 'vue'

const images = ref([
  { id: 1, src: '/images/photo1.jpg', alt: 'Photo 1' },
  { id: 2, src: '/images/photo2.jpg', alt: 'Photo 2' },
])

const selectedImage = ref(null)
const fileInput = ref(null)

// Add via file upload
function handleFileSelect(event) {
  const files = Array.from(event.target.files)

  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      images.value.push({
        id: Date.now() + Math.random(), // unique id, avoids collisions on rapid adds
        src: e.target.result,           // base64 data URL
        alt: file.name,
      })
    }
    reader.readAsDataURL(file)
  })

  event.target.value = '' // reset input so selecting the same file again still fires change
}

function triggerFileInput() {
  fileInput.value.click()
}

function openLightbox(image) {
  selectedImage.value = image
}

function closeLightbox() {
  selectedImage.value = null
}

function removeImage(id) {
  images.value = images.value.filter((img) => img.id !== id)
}
</script>

<template>
  <div class="gallery-page">
    <div class="gallery-header">
      <h1>Gallery</h1>
      <button @click="triggerFileInput">+ Add Photo</button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="handleFileSelect"
      />
    </div>

    <TransitionGroup name="gallery" tag="div" class="gallery-grid">
      <div
        v-for="image in images"
        :key="image.id"
        class="gallery-item"
      >
        <img :src="image.src" :alt="image.alt" loading="lazy" @click="openLightbox(image)" />
        <button class="remove-btn" @click="removeImage(image.id)">×</button>
      </div>
    </TransitionGroup>

    <div v-if="selectedImage" class="lightbox" @click="closeLightbox">
      <img :src="selectedImage.src" :alt="selectedImage.alt" />
    </div>
  </div>
</template>

<style scoped>
.gallery-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.gallery-item {
  position: relative;
}

.gallery-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.lightbox img {
  max-width: 90%;
  max-height: 90%;
}

/* Enter/leave animation for new images */
.gallery-enter-active,
.gallery-leave-active {
  transition: all 0.4s ease;
}
.gallery-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.gallery-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>