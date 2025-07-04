import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Goals from '../views/Goals.vue'
import Notifications from '../views/Notifications.vue'
import NotificationSettings from '../views/NotificationSettings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Dashboard
    },
    {
      path: '/dashboard',
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
      path: '/assets',
      name: 'Assets',
      component: Dashboard, // 임시로 Dashboard 사용, 나중에 별도 컴포넌트 생성 가능
      meta: { requiresAuth: true }
    }
  ]
})

export default router 