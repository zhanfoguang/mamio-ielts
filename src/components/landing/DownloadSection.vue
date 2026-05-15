<script setup>
import { useRouter } from 'vue-router'
import { useThemeStore } from '../../stores/theme'
const themeStore = useThemeStore()
const router = useRouter()

const modules = [
  { key: 'speaking', icon: '🎙️', route: '/speaking' },
  { key: 'listening', icon: '👂', route: '/listening' },
  { key: 'writing', icon: '✍️', route: '/writing' },
  { key: 'vocabulary', icon: '📚', route: '/vocabulary' }
]
</script>

<template>
  <section id="start" class="section start-section">
    <div class="container">
      <div class="section-header">
        <p class="section-label">{{ themeStore.lang === 'zh' ? '开始学习' : 'START LEARNING' }}</p>
        <h2 class="section-title light">{{ themeStore.lang === 'zh' ? '网页端直接使用' : 'Use Directly in Your Browser' }}</h2>
        <p class="section-desc light">{{ themeStore.lang === 'zh' ? '无需下载，打开浏览器即可开始雅思备考' : 'No download needed, start IELTS prep right in your browser' }}</p>
      </div>

      <div class="module-grid">
        <div v-for="m in modules" :key="m.key" class="module-card" @click="router.push(m.route)">
          <span class="module-icon">{{ m.icon }}</span>
          <h3 class="module-name">{{ themeStore.lang === 'zh' ? ({
            speaking: '口语练习',
            listening: '听力训练',
            writing: '写作批改',
            vocabulary: '词汇闪卡'
          })[m.key] : ({
            speaking: 'Speaking',
            listening: 'Listening',
            writing: 'Writing',
            vocabulary: 'Vocabulary'
          })[m.key] }}</h3>
          <p class="module-desc">{{ themeStore.lang === 'zh' ? '点击直接进入练习' : 'Click to start practicing' }}</p>
        </div>
      </div>

      <div class="cta-area">
        <button class="cta-btn-lg" @click="router.push('/speaking')">
          {{ themeStore.lang === 'zh' ? '立即开始' : 'Get Started Now' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.start-section {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .start-section {
  background: #0a0a0a;
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.section-label {
  color: rgba(255, 255, 255, 0.4);
}

.section-title.light {
  color: var(--white);
}

.section-desc.light {
  color: rgba(255, 255, 255, 0.6);
  margin-left: auto;
  margin-right: auto;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-width: 800px;
  margin: 0 auto var(--space-2xl);
}

.module-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
}

.module-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.module-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: var(--space-md);
}

.module-name {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: 4px;
}

.module-desc {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.4);
}

.cta-area {
  text-align: center;
}

.cta-btn-lg {
  display: inline-block;
  padding: 16px 48px;
  background: var(--white);
  color: var(--black);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-lg);
  transition: opacity var(--transition-fast);
}

.cta-btn-lg:hover { opacity: 0.85; }

@media (max-width: 768px) {
  .module-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
