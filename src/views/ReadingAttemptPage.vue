<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { getReadingRecord } from '../services/progress'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const attempt = ref(null)
const loading = ref(true)

const report = computed(() => attempt.value?.details?.report || {})
const questionTypes = computed(() => attempt.value?.details?.questionTypes || [])

function loadLocalAttempt(id) {
  try {
    return JSON.parse(localStorage.getItem('mamio-reading-history') || '[]').find(item => String(item.id) === String(id)) || null
  } catch {
    return null
  }
}

function scoreTone(score) {
  if (score >= 80) return 'good'
  if (score >= 60) return 'ok'
  return 'weak'
}

onMounted(async () => {
  const id = route.params.id
  try {
    attempt.value = await getReadingRecord(id)
  } catch {
    attempt.value = loadLocalAttempt(id)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="attempt-page">
    <div class="container">
      <button class="back-btn" @click="router.push('/reading')">
        {{ themeStore.lang === 'zh' ? '返回阅读' : 'Back to Reading' }}
      </button>

      <div v-if="loading" class="empty-card">{{ themeStore.lang === 'zh' ? '加载中...' : 'Loading...' }}</div>
      <div v-else-if="!attempt" class="empty-card">{{ themeStore.lang === 'zh' ? '找不到这次阅读记录' : 'Reading attempt not found' }}</div>

      <template v-else>
        <section class="attempt-hero">
          <div>
            <span class="kicker">{{ themeStore.lang === 'zh' ? '阅读复盘' : 'Reading Review' }}</span>
            <h1>{{ attempt.passage }}</h1>
            <p>{{ new Date(attempt.date).toLocaleString() }}</p>
          </div>
          <div class="score-ring" :class="scoreTone(attempt.score)">
            <strong>{{ attempt.score ?? '-' }}%</strong>
            <span>{{ attempt.correct ?? 0 }}/{{ attempt.total ?? 0 }}</span>
          </div>
        </section>

        <section class="metric-grid">
          <div>
            <span>{{ themeStore.lang === 'zh' ? '用时' : 'Time' }}</span>
            <strong>{{ Math.floor((attempt.time || 0) / 60) }}:{{ String((attempt.time || 0) % 60).padStart(2, '0') }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? '未作答' : 'Unanswered' }}</span>
            <strong>{{ report.unanswered ?? 0 }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? '错误' : 'Wrong' }}</span>
            <strong>{{ report.wrong ?? Math.max(0, (attempt.total || 0) - (attempt.correct || 0)) }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? 'Band 估计' : 'Band Estimate' }}</span>
            <strong>{{ report.band || '-' }}</strong>
          </div>
        </section>

        <section class="detail-card">
          <h2>{{ themeStore.lang === 'zh' ? '下一步建议' : 'Next Step' }}</h2>
          <p>{{ report.recommendation || (themeStore.lang === 'zh' ? '重做同类题型，并把错题加入复习。' : 'Redo the same question type and move mistakes into Review.') }}</p>
          <div class="detail-actions">
            <button @click="router.push('/review')">{{ themeStore.lang === 'zh' ? '打开复习中心' : 'Open Review' }}</button>
            <button class="secondary" @click="router.push('/reading')">{{ themeStore.lang === 'zh' ? '再练一篇' : 'Practice Again' }}</button>
          </div>
        </section>

        <section class="detail-card">
          <h2>{{ themeStore.lang === 'zh' ? '题型表现' : 'Question Types' }}</h2>
          <div v-if="Object.keys(report.byType || {}).length" class="type-list">
            <div v-for="(row, type) in report.byType" :key="type">
              <span>{{ type }}</span>
              <strong>{{ row.correct }}/{{ row.total }}</strong>
            </div>
          </div>
          <div v-else class="type-list">
            <div v-for="type in questionTypes" :key="type">
              <span>{{ type }}</span>
              <strong>-</strong>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.attempt-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.back-btn {
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.attempt-hero,
.empty-card,
.detail-card,
.metric-grid > div {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.attempt-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  padding: var(--space-2xl);
  margin-bottom: var(--space-lg);
}

.kicker {
  display: block;
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.attempt-hero h1 {
  font-size: var(--font-size-2xl);
  font-weight: 900;
  letter-spacing: 0;
}

.attempt-hero p,
.detail-card p {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--space-md);
}

.detail-actions button {
  padding: 9px 14px;
  border-radius: var(--radius-full);
  background: var(--black);
  color: var(--white);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.detail-actions button.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

[data-theme="dark"] .detail-actions button {
  background: var(--white);
  color: var(--black);
}

[data-theme="dark"] .detail-actions button.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.score-ring {
  width: 104px;
  height: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.score-ring.good { background: var(--green-soft); color: var(--green); }
.score-ring.ok { background: var(--yellow-soft); color: var(--amber); }
.score-ring.weak { background: var(--red-soft); color: var(--red); }
.score-ring strong { font-size: var(--font-size-xl); font-weight: 900; }
.score-ring span { font-size: var(--font-size-xs); font-weight: 800; }

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.metric-grid > div,
.detail-card,
.empty-card {
  padding: var(--space-lg);
}

.metric-grid span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.metric-grid strong {
  display: block;
  margin-top: 4px;
  font-size: var(--font-size-xl);
  font-weight: 900;
}

.detail-card {
  margin-bottom: var(--space-lg);
}

.detail-card h2 {
  margin-bottom: 8px;
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.type-list {
  display: grid;
  gap: 8px;
}

.type-list > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

@media (max-width: 640px) {
  .attempt-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--space-lg);
  }

  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
