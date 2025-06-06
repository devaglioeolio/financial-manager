import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Goals from '../views/Goals.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/goals',
      name: 'Goals',
      component: Goals,
      meta: { requiresAuth: true }
    }
  ]
})

export default router 