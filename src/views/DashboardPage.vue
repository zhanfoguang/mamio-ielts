<script setup>
import { ref, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useCheckinStore } from '../stores/checkin'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const checkinStore = useCheckinStore()
const router = useRouter()
const weekDays = checkinStore.getWeekDays()

const stats = ref([
  { key: 'speaking', icon: '🎤', labelZh: '口语练习', labelEn: 'Speaking', value: 0 },
  { key: 'listening', icon: '👂', labelZh: '听力练习', labelEn: 'Listening', value: 0 },
  { key: 'writing', icon: '✍️', labelZh: '写作练习', labelEn: 'Writing', value: 0 },
  { key: 'vocabulary', icon: '📚', labelZh: '词汇掌握', labelEn: 'Vocabulary', value: 0 }
])

onMounted(() => {
  const progress = JSON.parse(localStorage.getItem('mamio-progress') || '{}')
  if (progress.speaking) stats.value[0].value = progress.speaking.count || 0
  if (progress.listening) stats.value[1].value = progress.listening.count || 0
  if (progress.writing) stats.value[2].value = progress.writing.count || 0
  if (progress.vocabulary) stats.value[3].value = progress.vocabulary.learned || 0
})

const quickLinks = [
  { path: '/speaking', icon: '🎤', labelZh: '口语练习', labelEn: 'Speaking Practice' },
  { path: '/listening', icon: '👂', labelZh: '听力练习', labelEn: 'Listening Practice' },
  { path: '/writing', icon: '✍️', labelZh: '写作练习', labelEn: 'Writing Practice' },
  { path: '/vocabulary', icon: '📚', labelZh: '词汇学习', labelEn: 'Vocabulary' }
]
</script>

<template>
  <div class="dashboard-page">
    <div class="container">
      <div class="dashboard-header">
        <div>
          <h1>{{ themeStore.lang === 'zh' ? '学习中心' : 'Dashboard' }}</h1>
          <p class="welcome">{{ themeStore.lang === 'zh' ? '继续你的学习之旅' : 'Continue your learning journey' }}</p>
        </div>
      </div>

      <!-- Check-in -->
      <div class="checkin-section">
        <div class="checkin-card">
          <div class="checkin-header">
            <h3>{{ themeStore.lang === 'zh' ? '每日打卡' : 'Daily Check-in' }}</h3>
            <span class="streak">{{ themeStore.lang === 'zh' ? '连续' : 'Streak' }}: {{ checkinStore.currentStreak }} {{ themeStore.lang === 'zh' ? '天' : 'days' }}</span>
          </div>
          <div class="week-grid">
            <div v-for="day in weekDays" :key="day.date" class="day-item" :class="{ checked: day.isChecked, today: day.isToday }">
              <span class="day-label">{{ day.day }}</span>
              <div class="day-dot"><span v-if="day.isChecked" class="check-icon">✓</span></div>
            </div>
          </div>
          <button class="checkin-btn" @click="checkinStore.checkin()" :disabled="checkinStore.isChecked(new Date().toISOString().split('T')[0])">
            {{ checkinStore.isChecked(new Date().toISOString().split('T')[0]) ? (themeStore.lang === 'zh' ? '已打卡 ✓' : 'Checked In ✓') : (themeStore.lang === 'zh' ? '打卡' : 'Check In') }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div v-for="s in stats" :key="s.key" class="stat-card">
          <span class="stat-icon">{{ s.icon }}</span>
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? s.labelZh : s.labelEn }}</span>
        </div>
      </div>

      <!-- Quick Links -->
      <h2 class="section-title">{{ themeStore.lang === 'zh' ? '开始学习' : 'Start Learning' }}</h2>
      <div class="quick-links">
        <router-link v-for="link in quickLinks" :key="link.path" :to="link.path" class="quick-link">
          <span class="link-icon">{{ link.icon }}</span>
          <span class="link-label">{{ themeStore.lang === 'zh' ? link.labelZh : link.labelEn }}</span>
          <span class="link-arrow">→</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
}

.dashboard-header h1 {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.welcome {
  color: var(--text-secondary);
  margin-top: 4px;
}

.logout-btn {
  padding: 8px 20px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.checkin-section {
  margin-bottom: var(--space-xl);
}

.checkin-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.checkin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.checkin-header h3 { font-weight: 700; }
.streak { font-size: var(--font-size-sm); color: var(--text-tertiary); }

.week-grid {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: var(--space-md);
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.day-label { font-size: var(--font-size-xs); color: var(--text-tertiary); font-weight: 600; }

.day-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-item.checked .day-dot { background: var(--black); color: var(--white); }
[data-theme="dark"] .day-item.checked .day-dot { background: var(--white); color: var(--black); }
.day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--black); }
[data-theme="dark"] .day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--white); }

.checkin-btn {
  width: 100%;
  padding: 12px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
}
[data-theme="dark"] .checkin-btn { background: var(--white); color: var(--black); }
.checkin-btn:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: default; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: var(--space-2xl);
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-icon { font-size: 1.5rem; }
.stat-value { font-size: var(--font-size-2xl); font-weight: 800; }
.stat-label { font-size: var(--font-size-xs); color: var(--text-tertiary); }

.section-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.quick-link:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.link-icon { font-size: 1.3rem; }
.link-label { flex: 1; font-weight: 600; }
.link-arrow { color: var(--text-tertiary); }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
