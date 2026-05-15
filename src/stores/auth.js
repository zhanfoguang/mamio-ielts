import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('mamio-token') || null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isPaid = computed(() => user.value?.role === 'paid' || user.value?.role === 'admin')
  const isTrial = computed(() => user.value?.role === 'trial')
  const isExpired = computed(() => user.value?.role === 'expired')
  const trialDaysLeft = computed(() => {
    if (!user.value?.trial_start || user.value.role !== 'trial') return 0
    const start = new Date(user.value.trial_start)
    const days = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24))
    return Math.max(0, 3 - days)
  })

  async function login(email, password) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.token
      user.value = data.user
      localStorage.setItem('mamio-token', data.token)
      return data
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, nickname) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', { email, password, nickname })
      token.value = data.token
      user.value = data.user
      localStorage.setItem('mamio-token', data.token)
      return data
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
      }
    }
  }

  async function activate(code) {
    const { data } = await api.post('/auth/activate', { code })
    user.value = { ...user.value, ...data.user }
    return data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('mamio-token')
  }

  // Auto-fetch user on init
  if (token.value) {
    fetchMe()
  }

  return {
    user, token, loading, isLoggedIn, isAdmin, isPaid, isTrial, isExpired, trialDaysLeft,
    login, register, fetchMe, activate, logout
  }
})
