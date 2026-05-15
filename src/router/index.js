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
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardPage.vue')
    },
    {
      path: '/speaking',
      name: 'speaking',
      component: () => import('../views/SpeakingPage.vue')
    },
    {
      path: '/listening',
      name: 'listening',
      component: () => import('../views/ListeningPage.vue')
    },
    {
      path: '/writing',
      name: 'writing',
      component: () => import('../views/WritingPage.vue')
    },
    {
      path: '/vocabulary',
      name: 'vocabulary',
      component: () => import('../views/VocabPage.vue')
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

export default router
