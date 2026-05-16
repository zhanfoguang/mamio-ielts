<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { useRouter, useRoute } from 'vue-router'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const showUserMenu = ref(false)

const isLanding = ref(route.path === '/')
const userAreaRef = ref(null)

function handleClickOutside(e) {
  if (showUserMenu.value && userAreaRef.value && !userAreaRef.value.contains(e.target)) {
    showUserMenu.value = false
  }
}

function handleScroll() {
  isScrolled.value = window.scrollY > 50
}

function toggleTheme() { themeStore.toggleTheme() }
function toggleLang() { themeStore.setLang(themeStore.lang === 'zh' ? 'en' : 'zh') }

function goTo(path) {
  isMobileMenuOpen.value = false
  showUserMenu.value = false
  router.push(path)
}

function scrollToSection(id) {
  isMobileMenuOpen.value = false
  if (route.path !== '/') {
    router.push('/#' + id)
    return
  }
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function handleLogout() {
  authStore.logout()
  showUserMenu.value = false
  router.push('/login')
}

function getRoleLabel(role) {
  const labels = { admin: '管理员', paid: '已激活', trial: '试用', expired: '已过期' }
  const labelsEn = { admin: 'Admin', paid: 'Active', trial: 'Trial', expired: 'Expired' }
  return themeStore.lang === 'zh' ? labels[role] : labelsEn[role]
}

router.afterEach((to) => {
  isLanding.value = to.path === '/'
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="header" :class="{ scrolled: isScrolled }">
    <div class="header-inner">
      <div class="logo" @click="goTo('/')">
        <span class="logo-icon">M</span>
        <span class="logo-text">mamio</span>
      </div>

      <nav class="nav-links" :class="{ open: isMobileMenuOpen }">
        <template v-if="isLanding">
          <a @click.prevent="scrollToSection('features')">{{ themeStore.lang === 'zh' ? '功能' : 'Features' }}</a>
          <a @click.prevent="goTo('/speaking')">{{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</a>
          <a @click.prevent="goTo('/listening')">{{ themeStore.lang === 'zh' ? '听力' : 'Listening' }}</a>
          <a @click.prevent="goTo('/reading')">{{ themeStore.lang === 'zh' ? '阅读' : 'Reading' }}</a>
          <a @click.prevent="goTo('/writing')">{{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</a>
          <a @click.prevent="goTo('/mock')">{{ themeStore.lang === 'zh' ? '模考' : 'Mock' }}</a>
        </template>
        <template v-else>
          <a @click.prevent="goTo('/speaking')" :class="{ active: route.path === '/speaking' }">{{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</a>
          <a @click.prevent="goTo('/listening')" :class="{ active: route.path === '/listening' }">{{ themeStore.lang === 'zh' ? '听力' : 'Listening' }}</a>
          <a @click.prevent="goTo('/reading')" :class="{ active: route.path === '/reading' }">{{ themeStore.lang === 'zh' ? '阅读' : 'Reading' }}</a>
          <a @click.prevent="goTo('/writing')" :class="{ active: route.path === '/writing' }">{{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</a>
          <a @click.prevent="goTo('/vocabulary')" :class="{ active: route.path === '/vocabulary' }">{{ themeStore.lang === 'zh' ? '词汇' : 'Vocab' }}</a>
          <a @click.prevent="goTo('/mock')" :class="{ active: route.path === '/mock', mockLink: true }">{{ themeStore.lang === 'zh' ? '模考' : 'Mock' }}</a>
        </template>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" @click="toggleLang" :title="themeStore.lang === 'zh' ? 'English' : '中文'">
          {{ themeStore.lang === 'zh' ? 'EN' : '中' }}
        </button>
        <button class="icon-btn" @click="toggleTheme" :title="themeStore.theme === 'light' ? '深色模式' : '浅色模式'">
          {{ themeStore.theme === 'light' ? '🌙' : '☀️' }}
        </button>

        <!-- User info (logged in) -->
        <div v-if="authStore.isLoggedIn" class="user-area" ref="userAreaRef">
          <button class="user-btn" @click="showUserMenu = !showUserMenu">
            <span class="user-avatar">{{ (authStore.user?.nickname || 'U')[0].toUpperCase() }}</span>
            <span class="user-info">
              <span class="user-name">{{ authStore.user?.nickname }}</span>
              <span class="user-role" :class="authStore.user?.role">{{ getRoleLabel(authStore.user?.role) }}</span>
            </span>
          </button>

          <!-- Dropdown -->
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-header">
              <span class="dropdown-email">{{ authStore.user?.email }}</span>
              <span v-if="authStore.isTrial" class="dropdown-trial">
                {{ themeStore.lang === 'zh' ? '剩余' : '' }} {{ authStore.trialDaysLeft }} {{ themeStore.lang === 'zh' ? '天试用' : 'days trial' }}
              </span>
              <span v-if="authStore.user?.expires_at" class="dropdown-expires">
                {{ themeStore.lang === 'zh' ? '到期：' : 'Expires: ' }}{{ new Date(authStore.user.expires_at).toLocaleDateString() }}
              </span>
            </div>
            <button class="dropdown-item" @click="goTo('/login')">
              {{ themeStore.lang === 'zh' ? '激活码' : 'Activate Code' }}
            </button>
            <button v-if="authStore.isAdmin" class="dropdown-item" @click="goTo('/admin')">
              {{ themeStore.lang === 'zh' ? '管理面板' : 'Admin Panel' }}
            </button>
            <button class="dropdown-item logout" @click="handleLogout">
              {{ themeStore.lang === 'zh' ? '退出登录' : 'Logout' }}
            </button>
          </div>
        </div>

        <!-- Not logged in -->
        <template v-else>
          <button class="cta-btn" @click="goTo('/login')">
            {{ themeStore.lang === 'zh' ? '登录' : 'Login' }}
          </button>
        </template>

        <button class="mobile-menu-btn" @click="isMobileMenuOpen = !isMobileMenuOpen">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--header-height);
  transition: all var(--transition-base);
  background: transparent;
}

.header.scrolled {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border-color);
}

[data-theme="dark"] .header.scrolled {
  background: rgba(0, 0, 0, 0.72);
}

.header-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.2rem;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--black);
  color: var(--white);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
}

[data-theme="dark"] .logo-icon {
  background: var(--white);
  color: var(--black);
}

.nav-links {
  display: flex;
  gap: 28px;
}

.nav-links a {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
  font-weight: 500;
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
  background: var(--bg-tertiary);
}

.icon-btn:hover { background: var(--border-color); }

.cta-btn {
  padding: 8px 20px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  transition: opacity var(--transition-fast);
}

[data-theme="dark"] .cta-btn {
  background: var(--white);
  color: var(--black);
}

.cta-btn:hover { opacity: 0.85; }

/* User area */
.user-area {
  position: relative;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  transition: background var(--transition-fast);
}

.user-btn:hover { background: var(--border-color); }

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--blue);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.user-role {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.user-role.admin { color: var(--purple); }
.user-role.paid { color: var(--green); }
.user-role.trial { color: var(--blue); }
.user-role.expired { color: var(--red); }

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  overflow: hidden;
  z-index: 200;
}

.dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-email {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.dropdown-trial {
  font-size: var(--font-size-xs);
  color: var(--blue);
  font-weight: 600;
}

.dropdown-expires {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 16px;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.dropdown-item:hover { background: var(--bg-tertiary); }
.dropdown-item.logout { color: var(--red); }

.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
}

.mobile-menu-btn span {
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 1px;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
    position: absolute;
    top: var(--header-height);
    left: 0;
    right: 0;
    background: var(--bg-primary);
    flex-direction: column;
    padding: 16px 24px;
    gap: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .nav-links.open { display: flex; }
  .user-info { display: none; }
  .mobile-menu-btn { display: flex; }
}
</style>
