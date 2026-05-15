<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { useRouter, useRoute } from 'vue-router'

const themeStore = useThemeStore()
const router = useRouter()
const route = useRoute()
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const isLanding = ref(route.path === '/')

function handleScroll() {
  isScrolled.value = window.scrollY > 50
}

function toggleTheme() { themeStore.toggleTheme() }
function toggleLang() { themeStore.setLang(themeStore.lang === 'zh' ? 'en' : 'zh') }

function goTo(path) {
  isMobileMenuOpen.value = false
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

router.afterEach((to) => {
  isLanding.value = to.path === '/'
})

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
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
          <a @click.prevent="goTo('/writing')">{{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</a>
        </template>
        <template v-else>
          <a @click.prevent="goTo('/speaking')" :class="{ active: route.path === '/speaking' }">{{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</a>
          <a @click.prevent="goTo('/listening')" :class="{ active: route.path === '/listening' }">{{ themeStore.lang === 'zh' ? '听力' : 'Listening' }}</a>
          <a @click.prevent="goTo('/writing')" :class="{ active: route.path === '/writing' }">{{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</a>
          <a @click.prevent="goTo('/vocabulary')" :class="{ active: route.path === '/vocabulary' }">{{ themeStore.lang === 'zh' ? '词汇' : 'Vocabulary' }}</a>
        </template>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" @click="toggleLang" :title="themeStore.lang === 'zh' ? 'English' : '中文'">
          {{ themeStore.lang === 'zh' ? 'EN' : '中' }}
        </button>
        <button class="icon-btn" @click="toggleTheme" :title="themeStore.theme === 'light' ? '深色模式' : '浅色模式'">
          {{ themeStore.theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <button class="cta-btn" @click="goTo('/speaking')">
          {{ themeStore.lang === 'zh' ? '开始学习' : 'Start' }}
        </button>
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
  .cta-btn { padding: 6px 14px; font-size: 0.75rem; }
  .mobile-menu-btn { display: flex; }
}
</style>
