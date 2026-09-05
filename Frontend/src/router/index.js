import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/gallery',
      name: 'Gallery',
      component: () => import('../views/Gallery.vue')
    }
  ],
})

export default router
