import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Goals from '../views/Goals.vue'
import Notifications from '../views/Notifications.vue'
import NotificationSettings from '../views/NotificationSettings.vue'
import TrendAnalysis from '../views/TrendAnalysis.vue'

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
    },
    {
      path: '/notifications',
      name: 'Notifications',
      component: Notifications,
      meta: { requiresAuth: true }
    },
    {
      path: '/notification-settings',
      name: 'NotificationSettings',
      component: NotificationSettings,
      meta: { requiresAuth: true }
    },
    {
      path: '/trend-analysis',
      name: 'TrendAnalysis',
      component: TrendAnalysis,
      meta: { requiresAuth: true }
    }
  ]
})

export default router 