<script setup>
import { useRouter } from 'vue-router'
import { useThemeStore } from '../../stores/theme'
const themeStore = useThemeStore()
const router = useRouter()

const featureIcons = {
  speaking: '🎙️',
  listening: '👂',
  writing: '✍️',
  vocabulary: '📚',
  dailyCheckin: '📅',
  aiScoring: '🤖'
}

const featureRoutes = {
  speaking: '/speaking',
  listening: '/listening',
  writing: '/writing',
  vocabulary: '/vocabulary',
  dailyCheckin: '/dashboard',
  aiScoring: '/speaking'
}

const featureKeys = ['speaking', 'listening', 'writing', 'vocabulary', 'dailyCheckin', 'aiScoring']

function goToFeature(key) {
  router.push(featureRoutes[key])
}
</script>

<template>
  <section id="features" class="section">
    <div class="container">
      <div class="section-header">
        <p class="section-label">{{ themeStore.lang === 'zh' ? '核心功能' : 'CORE FEATURES' }}</p>
        <h2 class="section-title">{{ themeStore.lang === 'zh' ? '核心功能' : 'Core Features' }}</h2>
        <p class="section-desc">{{ themeStore.lang === 'zh' ? '沉浸式雅思备考体验，听说读写全面提升' : 'Immersive IELTS prep experience across all four skills' }}</p>
      </div>

      <div class="features-grid">
        <div v-for="key in featureKeys" :key="key" class="feature-card" @click="goToFeature(key)">
          <div class="feature-icon">{{ featureIcons[key] }}</div>
          <h3 class="feature-title">{{ themeStore.lang === 'zh' ? ({
            speaking: '口语练习',
            listening: '听力训练',
            writing: '写作批改',
            vocabulary: '词汇闪卡',
            dailyCheckin: '每日打卡',
            aiScoring: 'AI 评分'
          })[key] : ({
            speaking: 'Speaking Practice',
            listening: 'Listening Training',
            writing: 'Writing Feedback',
            vocabulary: 'Vocabulary Cards',
            dailyCheckin: 'Daily Check-in',
            aiScoring: 'AI Scoring'
          })[key] }}</h3>
          <p class="feature-desc">{{ themeStore.lang === 'zh' ? ({
            speaking: '雅思口语 Part 1/2/3 全真模拟，AI 实时评分，录音转文字分析',
            listening: '四段听力真题模拟，逐句跟读，听写练习提升听力能力',
            writing: 'Task 1 & Task 2 写作练习，AI 从四个维度给出评分和改进建议',
            vocabulary: '按雅思话题分类词汇，间隔重复算法科学记忆，AI 生成更多词汇',
            dailyCheckin: '坚持每日学习打卡，追踪学习进度，养成良好学习习惯',
            aiScoring: '基于 DeepSeek AI 的智能评分系统，精准分析你的薄弱环节'
          })[key] : ({
            speaking: 'Full IELTS Speaking Part 1/2/3 simulation with AI scoring and speech-to-text analysis',
            listening: 'Four-section IELTS listening simulation with sentence-by-sentence follow-along and dictation',
            writing: 'Task 1 & Task 2 writing practice with AI feedback across four scoring dimensions',
            vocabulary: 'Topic-based IELTS vocabulary with spaced repetition and AI-generated word lists',
            dailyCheckin: 'Daily learning check-in to track progress and build consistent study habits',
            aiScoring: 'DeepSeek AI-powered scoring system that precisely identifies your weak spots'
          })[key] }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.section-desc {
  margin-left: auto;
  margin-right: auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.feature-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  transition: all var(--transition-base);
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: var(--space-md);
}

.feature-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.feature-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
