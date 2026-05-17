import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginPage.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordPage.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/speaking',
      name: 'speaking',
      component: () => import('../views/SpeakingPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/listening',
      name: 'listening',
      component: () => import('../views/ListeningPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/writing',
      name: 'writing',
      component: () => import('../views/WritingPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vocabulary',
      name: 'vocabulary',
      component: () => import('../views/VocabPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reading',
      name: 'reading',
      component: () => import('../views/ReadingPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('../views/ReviewPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/mock',
      name: 'mock',
      component: () => import('../views/MockExamPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

// Auth guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('mamio-token')
  if (to.meta.requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin) {
    // Check admin by decoding JWT payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role === 'admin') {
        next()
      } else {
        next('/')
      }
    } catch {
      next('/login')
    }
  } else {
    next()
  }
})

export default router
