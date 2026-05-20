<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { getListeningRecord } from '../services/progress'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const attempt = ref(null)
const loading = ref(true)

const report = computed(() => attempt.value?.details?.report || {})
const missedWords = computed(() => attempt.value?.missedWords || attempt.value?.details?.missedWords || report.value.missedWords || [])

function loadLocalAttempt(id) {
  try {
    return JSON.parse(localStorage.getItem('mamio-listening-history') || '[]').find(item => String(item.id) === String(id)) || null
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
    attempt.value = await getListeningRecord(id)
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
      <button class="back-btn" @click="router.push('/listening')">
        {{ themeStore.lang === 'zh' ? '返回听力' : 'Back to Listening' }}
      </button>

      <div v-if="loading" class="empty-card">{{ themeStore.lang === 'zh' ? '加载中...' : 'Loading...' }}</div>
      <div v-else-if="!attempt" class="empty-card">{{ themeStore.lang === 'zh' ? '找不到这次听力记录' : 'Listening attempt not found' }}</div>

      <template v-else>
        <section class="attempt-hero">
          <div>
            <span class="kicker">{{ themeStore.lang === 'zh' ? '听力复盘' : 'Listening Review' }}</span>
            <h1>{{ attempt.section }}</h1>
            <p>{{ new Date(attempt.date).toLocaleString() }} · {{ attempt.mode || 'completion' }}</p>
          </div>
          <div class="score-ring" :class="scoreTone(attempt.score || 0)">
            <strong>{{ typeof attempt.score === 'number' ? attempt.score + '%' : '听写' }}</strong>
            <span v-if="typeof attempt.correct === 'number'">{{ attempt.correct }}/{{ attempt.total }}</span>
          </div>
        </section>

        <section class="metric-grid">
          <div>
            <span>Section</span>
            <strong>{{ attempt.sectionNumber || report.section || '-' }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? '未作答' : 'Unanswered' }}</span>
            <strong>{{ report.unanswered ?? 0 }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? '错误' : 'Wrong' }}</span>
            <strong>{{ report.wrong ?? missedWords.length }}</strong>
          </div>
          <div>
            <span>{{ themeStore.lang === 'zh' ? 'Band 估计' : 'Band Estimate' }}</span>
            <strong>{{ report.band || '-' }}</strong>
          </div>
        </section>

        <section class="detail-card">
          <h2>{{ themeStore.lang === 'zh' ? '下一步建议' : 'Next Step' }}</h2>
          <p>{{ report.recommendation || (themeStore.lang === 'zh' ? '先复听错词，再做下一套。' : 'Replay missed words before moving to the next set.') }}</p>
          <div class="detail-actions">
            <button @click="router.push('/review')">{{ themeStore.lang === 'zh' ? '打开复习中心' : 'Open Review' }}</button>
            <button class="secondary" @click="router.push('/listening')">{{ themeStore.lang === 'zh' ? '再听一套' : 'Practice Again' }}</button>
          </div>
        </section>

        <section v-if="missedWords.length" class="detail-card">
          <h2>{{ themeStore.lang === 'zh' ? '漏听词' : 'Missed Words' }}</h2>
          <div class="word-list">
            <span v-for="word in missedWords" :key="word">{{ word }}</span>
          </div>
        </section>

        <section v-if="attempt.details?.sentence || attempt.details?.transcript" class="detail-card">
          <h2>{{ themeStore.lang === 'zh' ? '听写对照' : 'Dictation Compare' }}</h2>
          <div class="compare-box">
            <p><strong>Target</strong>{{ attempt.details?.sentence || '-' }}</p>
            <p><strong>You</strong>{{ attempt.details?.transcript || '-' }}</p>
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

.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-list span {
  padding: 6px 10px;
  border-radius: var(--radius-full);
  color: var(--blue);
  background: var(--blue-soft);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.compare-box {
  display: grid;
  gap: 10px;
}

.compare-box p {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.compare-box strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
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
