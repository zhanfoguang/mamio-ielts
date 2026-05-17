<script setup>
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'
import heroImage from '../../assets/hero.png'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()
</script>

<template>
  <section class="hero">
    <img class="hero-bg" :src="heroImage" alt="" aria-hidden="true" />
    <div class="hero-scrim"></div>
    <div class="hero-content container">
      <p class="hero-kicker fade-up visible">
        {{ themeStore.lang === 'zh' ? '给目标分和考试日期，Mamio 每天告诉你先练什么' : 'Set your target band and exam date. Mamio tells you what to practice first.' }}
      </p>
      <h1 class="hero-title fade-up visible">
        {{ themeStore.lang === 'zh' ? '雅思备考，不再瞎练' : 'IELTS prep without guessing' }}<br />
        <span class="title-highlight">{{ themeStore.lang === 'zh' ? '从 AI 反馈到下一步行动' : 'From AI feedback to your next action' }}</span>
      </h1>
      <p class="hero-subtitle fade-up visible">
        {{ themeStore.lang === 'zh' ? '口语和写作给出评分、弱点和复习项；词汇用间隔重复；Dashboard 自动排出今天最该做的一件事。' : 'Speaking and writing produce scores, weak spots, and review items. Vocabulary uses spaced repetition. The dashboard picks today’s next best task.' }}
      </p>
      <div class="hero-actions fade-up visible">
        <button v-if="authStore.isLoggedIn" class="btn-primary-lg" @click="router.push('/dashboard')">
          {{ themeStore.lang === 'zh' ? '查看今日计划' : 'View Today’s Plan' }}
        </button>
        <button v-else class="btn-primary-lg" @click="router.push('/login')">
          {{ themeStore.lang === 'zh' ? '免费试用 3 天' : 'Start 3-Day Trial' }}
        </button>
        <a href="#pricing" class="btn-outline-lg">
          {{ themeStore.lang === 'zh' ? '查看激活方式' : 'See Activation' }}
        </a>
      </div>
      <div class="hero-stats fade-up visible">
        <div class="stat">
          <span class="stat-value">1</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '今日主任务' : 'Daily priority' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">4</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '评分维度' : 'Rubric scores' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">SRS</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '复习系统' : 'Review system' }}</span>
        </div>
      </div>
    </div>
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
  background: #0b0f14;
}

.hero-content {
  text-align: center;
  position: relative;
  z-index: 2;
  color: var(--white);
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-2xl);
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.42;
  image-rendering: auto;
}

.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(5, 8, 12, 0.62);
}

.hero-kicker {
  max-width: 720px;
  margin: 0 auto var(--space-lg);
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
}

.hero-title {
  font-size: clamp(3rem, 6vw, 6rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  margin-bottom: var(--space-lg);
}

.title-highlight {
  color: rgba(255, 255, 255, 0.72);
}

.hero-subtitle {
  font-size: var(--font-size-lg);
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: var(--space-2xl);
  letter-spacing: 0;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
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
  background: var(--white);
  color: var(--black);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: opacity var(--transition-fast);
  display: inline-flex;
  align-items: center;
}

.btn-primary-lg:hover { opacity: 0.85; }

.btn-outline-lg {
  padding: 14px 36px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
  display: inline-flex;
  align-items: center;
}

.btn-outline-lg:hover { background: rgba(255, 255, 255, 0.12); }

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
  color: rgba(255, 255, 255, 0.66);
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.25);
}

@media (max-width: 768px) {
  .hero {
    min-height: 80vh;
    align-items: flex-end;
  }

  .hero-stats {
    gap: 20px;
  }

  .stat-divider {
    height: 30px;
  }

  .hero-title {
    font-size: 2.7rem;
  }
}
</style>
