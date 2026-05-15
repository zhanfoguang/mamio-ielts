<script setup>
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
</script>

<template>
  <section class="hero">
    <div class="hero-content container">
      <h1 class="hero-title fade-up visible">
        {{ themeStore.lang === 'zh' ? '雅思备考' : 'IELTS Prep' }}<br />
        <span class="title-highlight">{{ themeStore.lang === 'zh' ? '听说读写一站式训练' : 'All-in-One Speaking, Listening, Writing & Vocab' }}</span>
      </h1>
      <p class="hero-subtitle fade-up visible">
        {{ themeStore.lang === 'zh' ? 'AI 评分 · 语音识别 · 间隔重复 · 打卡追踪' : 'AI Scoring · Speech Recognition · Spaced Repetition · Check-in Tracking' }}
      </p>
      <div class="hero-actions fade-up visible">
        <button v-if="authStore.isLoggedIn" class="btn-primary-lg" @click="router.push('/speaking')">
          {{ themeStore.lang === 'zh' ? '开始学习' : 'Start Learning' }}
        </button>
        <button v-else class="btn-primary-lg" @click="router.push('/login')">
          {{ themeStore.lang === 'zh' ? '免费注册' : 'Sign Up Free' }}
        </button>
        <a href="#features" class="btn-outline-lg">
          {{ themeStore.lang === 'zh' ? '了解功能' : 'Explore Features' }}
        </a>
      </div>
      <div class="hero-stats fade-up visible">
        <div class="stat">
          <span class="stat-value">4</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '练习模块' : 'Practice Modules' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">AI</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '智能评分' : 'Smart Scoring' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">100%</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '网页端' : 'Web-based' }}</span>
        </div>
      </div>
    </div>
    <div class="hero-gradient"></div>
  </section>
</template>

<style scoped>
.hero {
  min-height: 92vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding-top: var(--header-height);
}

.hero-content {
  text-align: center;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(3rem, 6vw, 6rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1.05;
  margin-bottom: var(--space-lg);
}

.title-highlight {
  color: var(--gray-500);
}

[data-theme="dark"] .title-highlight {
  color: var(--gray-400);
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--text-secondary);
  margin-bottom: var(--space-2xl);
  letter-spacing: 0.02em;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: var(--space-3xl);
  flex-wrap: wrap;
}

.btn-primary-lg {
  padding: 14px 36px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: opacity var(--transition-fast);
  display: inline-flex;
  align-items: center;
}

.btn-primary-lg:hover { opacity: 0.85; }

[data-theme="dark"] .btn-primary-lg {
  background: var(--white);
  color: var(--black);
}

.btn-outline-lg {
  padding: 14px 36px;
  border: 1.5px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
  display: inline-flex;
  align-items: center;
}

.btn-outline-lg:hover { background: var(--bg-tertiary); }

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-color);
}

.hero-gradient {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(96, 165, 250, 0.08), transparent 70%);
  pointer-events: none;
}

@media (max-width: 768px) {
  .hero {
    min-height: 80vh;
  }

  .hero-stats {
    gap: 20px;
  }

  .stat-divider {
    height: 30px;
  }
}
</style>
