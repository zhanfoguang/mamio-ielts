<script setup>
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'
import { useCheckinStore } from '../stores/checkin'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const checkinStore = useCheckinStore()
const router = useRouter()

const weekDays = checkinStore.getWeekDays()

// Load all history
const speakingHistory = ref([])
const writingHistory = ref([])

// Practice stats for today
const today = new Date().toISOString().split('T')[0]
const dailyGoal = 10

const todayStats = computed(() => {
  const speaking = speakingHistory.value.filter(h => h.date?.startsWith(today)).length
  const writing = writingHistory.value.filter(h => h.date?.startsWith(today)).length
  const vocab = JSON.parse(localStorage.getItem('mamio-progress') || '{}').vocabulary?.learned || 0
  return { speaking, writing, vocab, total: speaking + writing }
})

// Score trends (last 10 entries per module)
const speakingScores = computed(() => {
  return speakingHistory.value
    .filter(h => h.score)
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({ index: i + 1, score: h.score, date: h.date }))
})

const writingScores = computed(() => {
  return writingHistory.value
    .filter(h => h.score)
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({ index: i + 1, score: h.score, date: h.date }))
})

const avgSpeakingScore = computed(() => {
  const scores = speakingHistory.value.filter(h => h.score).map(h => h.score)
  if (scores.length === 0) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

const avgWritingScore = computed(() => {
  const scores = writingHistory.value.filter(h => h.score).map(h => h.score)
  if (scores.length === 0) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

// Heatmap data (last 28 days = 4 weeks)
const heatmapDays = computed(() => {
  const days = []
  const todayDate = new Date()
  for (let i = 27; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const speakingCount = speakingHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const writingCount = writingHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const total = speakingCount + writingCount
    days.push({
      date: dateStr,
      day: d.getDate(),
      count: total,
      level: total === 0 ? 0 : total <= 2 ? 1 : total <= 5 ? 2 : total <= 8 ? 3 : 4
    })
  }
  return days
})

// Recommendation
const recommendation = computed(() => {
  const speakingCount = speakingHistory.value.length
  const writingCount = writingHistory.value.length
  const vocab = JSON.parse(localStorage.getItem('mamio-progress') || '{}').vocabulary?.learned || 0

  if (speakingCount === 0 && writingCount === 0) {
    return {
      icon: '🎯',
      zh: '开始你的第一次练习吧！建议从口语 Part 1 开始',
      en: 'Start your first practice! Try Speaking Part 1',
      path: '/speaking'
    }
  }

  // Find weakest area
  const avgSpk = avgSpeakingScore.value ? parseFloat(avgSpeakingScore.value) : 0
  const avgWrt = avgWritingScore.value ? parseFloat(avgWritingScore.value) : 0

  if (avgSpk > 0 && avgSpk < 6) {
    return {
      icon: '🎤',
      zh: `口语平均 ${avgSpk} 分，建议多练习 Part 2 长回答`,
      en: `Speaking avg ${avgSpk}, practice Part 2 long answers`,
      path: '/speaking'
    }
  }
  if (avgWrt > 0 && avgWrt < 6) {
    return {
      icon: '✍️',
      zh: `写作平均 ${avgWrt} 分，建议练习 Task 2 议论文`,
      en: `Writing avg ${avgWrt}, practice Task 2 essays`,
      path: '/writing'
    }
  }
  if (vocab < 50) {
    return {
      icon: '📚',
      zh: '词汇量还需要积累，每天学习 10 个新词',
      en: 'Build your vocabulary, learn 10 new words daily',
      path: '/vocabulary'
    }
  }
  return {
    icon: '✨',
    zh: '保持练习节奏，尝试 AI 对话模式提升口语',
    en: 'Keep practicing, try AI conversation mode for speaking',
    path: '/speaking'
  }
})

// Module stats
const moduleStats = computed(() => [
  {
    icon: '🎤',
    labelZh: '口语练习',
    labelEn: 'Speaking',
    count: speakingHistory.value.length,
    score: avgSpeakingScore.value,
    color: 'var(--blue)'
  },
  {
    icon: '✍️',
    labelZh: '写作练习',
    labelEn: 'Writing',
    count: writingHistory.value.length,
    score: avgWritingScore.value,
    color: 'var(--green)'
  },
  {
    icon: '📚',
    labelZh: '词汇掌握',
    labelEn: 'Vocabulary',
    count: (JSON.parse(localStorage.getItem('mamio-progress') || '{}').vocabulary?.learned || 0),
    score: null,
    color: 'var(--purple)'
  }
])

// Score chart (simple SVG sparkline)
function getSparklinePath(scores) {
  if (scores.length < 2) return ''
  const width = 200
  const height = 40
  const maxScore = 9
  const step = width / (scores.length - 1)
  return scores.map((s, i) => {
    const x = i * step
    const y = height - ((s.score / maxScore) * height)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow, var(--amber))'
  return 'var(--red)'
}

onMounted(() => {
  speakingHistory.value = JSON.parse(localStorage.getItem('mamio-speaking-history') || '[]')
  writingHistory.value = JSON.parse(localStorage.getItem('mamio-writing-history') || '[]')
})
</script>

<template>
  <div class="dashboard-page">
    <div class="container">
      <!-- Header -->
      <div class="dashboard-header">
        <div>
          <h1>{{ themeStore.lang === 'zh' ? '学习中心' : 'Dashboard' }}</h1>
          <p class="welcome">
            {{ authStore.user?.nickname
              ? (themeStore.lang === 'zh' ? `${authStore.user.nickname}，继续你的学习之旅` : `${authStore.user.nickname}, continue your journey`)
              : (themeStore.lang === 'zh' ? '继续你的学习之旅' : 'Continue your learning journey')
            }}
          </p>
        </div>
      </div>

      <!-- Today's progress -->
      <div class="today-card">
        <div class="today-header">
          <div>
            <h3>{{ themeStore.lang === 'zh' ? '今日进度' : "Today's Progress" }}</h3>
            <p class="today-sub">{{ themeStore.lang === 'zh' ? `目标 ${dailyGoal} 次练习` : `Goal: ${dailyGoal} practices` }}</p>
          </div>
          <div class="today-count">
            <span class="today-num">{{ todayStats.total }}</span>
            <span class="today-label">/ {{ dailyGoal }}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: Math.min(100, (todayStats.total / dailyGoal) * 100) + '%' }"></div>
        </div>
        <div class="today-breakdown">
          <span class="breakdown-item">🎤 {{ todayStats.speaking }}</span>
          <span class="breakdown-item">✍️ {{ todayStats.writing }}</span>
        </div>
      </div>

      <!-- Recommendation -->
      <div class="recommendation-card" @click="router.push(recommendation.path)">
        <span class="rec-icon">{{ recommendation.icon }}</span>
        <div class="rec-text">
          <span class="rec-label">{{ themeStore.lang === 'zh' ? '今日推荐' : 'Recommendation' }}</span>
          <span class="rec-content">{{ themeStore.lang === 'zh' ? recommendation.zh : recommendation.en }}</span>
        </div>
        <span class="rec-arrow">→</span>
      </div>

      <div class="dashboard-grid">
        <!-- Left column -->
        <div class="dashboard-left">
          <!-- Streak + Heatmap -->
          <div class="card">
            <div class="card-header">
              <h3>{{ themeStore.lang === 'zh' ? '学习日历' : 'Study Calendar' }}</h3>
              <span class="streak-badge">
                🔥 {{ checkinStore.currentStreak }} {{ themeStore.lang === 'zh' ? '天连续' : 'day streak' }}
              </span>
            </div>
            <div class="heatmap">
              <div v-for="(day, i) in heatmapDays" :key="i" class="heat-cell" :class="'level-' + day.level" :title="day.date + ': ' + day.count + (themeStore.lang === 'zh' ? '次练习' : ' practices')">
                <span class="heat-day">{{ day.day }}</span>
              </div>
            </div>
            <div class="heatmap-legend">
              <span class="legend-label">{{ themeStore.lang === 'zh' ? '少' : 'Less' }}</span>
              <div class="legend-cell level-0"></div>
              <div class="legend-cell level-1"></div>
              <div class="legend-cell level-2"></div>
              <div class="legend-cell level-3"></div>
              <div class="legend-cell level-4"></div>
              <span class="legend-label">{{ themeStore.lang === 'zh' ? '多' : 'More' }}</span>
            </div>
          </div>

          <!-- Module stats -->
          <div class="card">
            <h3 class="card-title">{{ themeStore.lang === 'zh' ? '模块统计' : 'Module Stats' }}</h3>
            <div class="module-list">
              <div v-for="m in moduleStats" :key="m.labelEn" class="module-item">
                <span class="module-icon">{{ m.icon }}</span>
                <div class="module-info">
                  <span class="module-name">{{ themeStore.lang === 'zh' ? m.labelZh : m.labelEn }}</span>
                  <span class="module-count">{{ m.count }} {{ themeStore.lang === 'zh' ? '次' : 'sessions' }}</span>
                </div>
                <div v-if="m.score" class="module-score" :style="{ color: getScoreColor(parseFloat(m.score)) }">
                  {{ m.score }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="dashboard-right">
          <!-- Score trends -->
          <div class="card">
            <h3 class="card-title">{{ themeStore.lang === 'zh' ? '分数趋势' : 'Score Trends' }}</h3>

            <div v-if="speakingScores.length > 0" class="trend-section">
              <div class="trend-header">
                <span class="trend-label">🎤 {{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</span>
                <span class="trend-avg" :style="{ color: getScoreColor(parseFloat(avgSpeakingScore)) }">{{ avgSpeakingScore }}</span>
              </div>
              <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path :d="getSparklinePath(speakingScores)" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div v-if="writingScores.length > 0" class="trend-section">
              <div class="trend-header">
                <span class="trend-label">✍️ {{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</span>
                <span class="trend-avg" :style="{ color: getScoreColor(parseFloat(avgWritingScore)) }">{{ avgWritingScore }}</span>
              </div>
              <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path :d="getSparklinePath(writingScores)" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div v-if="speakingScores.length === 0 && writingScores.length === 0" class="empty-trend">
              <p>{{ themeStore.lang === 'zh' ? '完成练习后这里会显示分数趋势' : 'Score trends will appear after practice' }}</p>
            </div>
          </div>

          <!-- Check-in -->
          <div class="card">
            <div class="card-header">
              <h3>{{ themeStore.lang === 'zh' ? '每周打卡' : 'Weekly Check-in' }}</h3>
            </div>
            <div class="week-grid">
              <div v-for="day in weekDays" :key="day.date" class="day-item" :class="{ checked: day.isChecked, today: day.isToday }">
                <span class="day-label">{{ day.day }}</span>
                <div class="day-dot"><span v-if="day.isChecked" class="check-icon">✓</span></div>
              </div>
            </div>
            <button class="checkin-btn" @click="checkinStore.checkin()" :disabled="checkinStore.isChecked(today)">
              {{ checkinStore.isChecked(today) ? (themeStore.lang === 'zh' ? '已打卡 ✓' : 'Checked In ✓') : (themeStore.lang === 'zh' ? '打卡' : 'Check In') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Quick links -->
      <h2 class="section-title">{{ themeStore.lang === 'zh' ? '开始学习' : 'Start Learning' }}</h2>
      <div class="quick-links">
        <router-link v-for="link in [
          { path: '/speaking', icon: '🎤', labelZh: '口语练习', labelEn: 'Speaking Practice' },
          { path: '/listening', icon: '👂', labelZh: '听力练习', labelEn: 'Listening Practice' },
          { path: '/writing', icon: '✍️', labelZh: '写作练习', labelEn: 'Writing Practice' },
          { path: '/vocabulary', icon: '📚', labelZh: '词汇学习', labelEn: 'Vocabulary' }
        ]" :key="link.path" :to="link.path" class="quick-link">
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

/* Today card */
.today-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-md);
}

.today-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.today-header h3 {
  font-weight: 700;
  font-size: var(--font-size-base);
}

.today-sub {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.today-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.today-num {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--text-primary);
}

.today-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-md);
}

.progress-fill {
  height: 100%;
  background: var(--green);
  border-radius: 4px;
  transition: width var(--transition-base);
}

.today-breakdown {
  display: flex;
  gap: var(--space-lg);
}

.breakdown-item {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Recommendation */
.recommendation-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 14px 20px;
  background: var(--blue-soft);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--space-xl);
}

.recommendation-card:hover {
  transform: translateX(4px);
}

.rec-icon {
  font-size: 1.5rem;
}

.rec-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rec-label {
  font-size: var(--font-size-xs);
  color: var(--blue);
  font-weight: 600;
}

.rec-content {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.rec-arrow {
  color: var(--blue);
  font-weight: 600;
}

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.card-header h3 {
  font-weight: 700;
  font-size: var(--font-size-base);
}

.card-title {
  font-weight: 700;
  font-size: var(--font-size-base);
  margin-bottom: var(--space-md);
}

.streak-badge {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

/* Heatmap */
.heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: var(--space-md);
}

.heat-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.heat-day { opacity: 0.7; }

.level-0 { background: var(--bg-tertiary); color: var(--text-tertiary); }
.level-1 { background: #dcfce7; color: #166534; }
.level-2 { background: #86efac; color: #166534; }
.level-3 { background: #22c55e; color: white; }
.level-4 { background: #15803d; color: white; }

[data-theme="dark"] .level-0 { background: var(--bg-tertiary); }
[data-theme="dark"] .level-1 { background: #14532d; color: #86efac; }
[data-theme="dark"] .level-2 { background: #166534; color: #86efac; }
[data-theme="dark"] .level-3 { background: #15803d; color: white; }
[data-theme="dark"] .level-4 { background: #22c55e; color: white; }

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.legend-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Module stats */
.module-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.module-icon { font-size: 1.2rem; }

.module-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.module-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.module-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.module-score {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

/* Score trends */
.trend-section {
  margin-bottom: var(--space-md);
}

.trend-section:last-child { margin-bottom: 0; }

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trend-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.trend-avg {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.sparkline {
  width: 100%;
  height: 40px;
}

.empty-trend {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* Week grid */
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
}

.day-item.checked .day-dot { background: var(--black); color: var(--white); }
[data-theme="dark"] .day-item.checked .day-dot { background: var(--white); color: var(--black); }
.day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--black); }
[data-theme="dark"] .day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--white); }

.check-icon { font-weight: 700; }

.checkin-btn {
  width: 100%;
  padding: 10px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
}
[data-theme="dark"] .checkin-btn { background: var(--white); color: var(--black); }
.checkin-btn:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: default; }

/* Section title + quick links */
.section-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
.link-label { flex: 1; font-weight: 600; font-size: var(--font-size-sm); }
.link-arrow { color: var(--text-tertiary); }

@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .quick-links { grid-template-columns: 1fr; }
}
</style>
