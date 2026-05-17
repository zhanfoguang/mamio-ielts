<script setup>
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useRouter } from 'vue-router'
import { getReviewItems, markReviewItemReviewed, deleteReviewItem } from '../services/reviewItems'

const themeStore = useThemeStore()
const router = useRouter()

const filter = ref('due') // 'due' | 'all' | 'reviewed'
const allItems = ref([])

onMounted(async () => {
  allItems.value = await getReviewItems()
})

const stats = computed(() => {
  const now = Date.now()
  const due = allItems.value.filter(i => !i.reviewedAt && Number(i.due || 0) <= now)
  return { total: allItems.value.length, due: due.length, items: allItems.value, dueItems: due }
})

const filteredItems = computed(() => {
  const now = Date.now()
  const items = stats.value.items
  if (filter.value === 'due') return items.filter(i => !i.reviewedAt && Number(i.due || 0) <= now)
  if (filter.value === 'reviewed') return items.filter(i => i.reviewedAt)
  return items
})

const groupedItems = computed(() => {
  const groups = {}
  for (const item of filteredItems.value) {
    const mod = item.module || 'general'
    if (!groups[mod]) groups[mod] = []
    groups[mod].push(item)
  }
  return groups
})

const moduleLabels = {
  speaking: { zh: '口语', en: 'Speaking', icon: '🎤' },
  writing: { zh: '写作', en: 'Writing', icon: '✏️' },
  listening: { zh: '听力', en: 'Listening', icon: '🎧' },
  reading: { zh: '阅读', en: 'Reading', icon: '📖' },
  vocabulary: { zh: '词汇', en: 'Vocabulary', icon: '📝' },
  general: { zh: '综合', en: 'General', icon: '📌' }
}

function getModuleLabel(mod) {
  return moduleLabels[mod] || moduleLabels.general
}

async function markReviewed(item) {
  await markReviewItemReviewed(item.id)
  item.reviewedAt = new Date().toISOString()
}

async function deleteItem(item) {
  await deleteReviewItem(item.id)
  allItems.value = allItems.value.filter(i => i.id !== item.id)
}

function goToModule(mod) {
  const paths = { speaking: '/speaking', writing: '/writing', listening: '/listening', reading: '/reading', vocabulary: '/vocabulary' }
  router.push(paths[mod] || '/dashboard')
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="review-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ themeStore.lang === 'zh' ? '复习清单' : 'Review Items' }}</h1>
        <p class="subtitle">{{ themeStore.lang === 'zh' ? 'AI 评分发现的薄弱点，集中复习' : 'Weak points from AI feedback — review them here' }}</p>
      </div>

      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat" :class="{ active: filter === 'due' }" @click="filter = 'due'">
          <span class="stat-num">{{ stats.due }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '待复习' : 'Due' }}</span>
        </div>
        <div class="stat" :class="{ active: filter === 'all' }" @click="filter = 'all'">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '全部' : 'All' }}</span>
        </div>
        <div class="stat" :class="{ active: filter === 'reviewed' }" @click="filter = 'reviewed'">
          <span class="stat-num">{{ stats.items.filter(i => i.reviewedAt).length }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '已复习' : 'Reviewed' }}</span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredItems.length === 0" class="empty">
        <p class="empty-icon">{{ stats.total === 0 ? '🎯' : '✅' }}</p>
        <p class="empty-text">
          {{ stats.total === 0
            ? (themeStore.lang === 'zh' ? '这里会自动收集 AI 批改发现的薄弱点。先完成一次口语或写作，系统会把值得复练的表达放进来。' : 'AI feedback will collect weak spots here. Complete one speaking or writing session and Mamio will turn useful feedback into review items.')
            : filter === 'due'
              ? (themeStore.lang === 'zh' ? '当前没有到期复习项，可以继续做新练习。' : 'No due items right now. Continue with fresh practice.')
              : (themeStore.lang === 'zh' ? '这个筛选下暂无记录' : 'No items under this filter')
          }}
        </p>
        <div class="empty-actions">
          <button class="primary-btn" @click="router.push('/speaking')">
            {{ themeStore.lang === 'zh' ? '做一次口语' : 'Do Speaking' }}
          </button>
          <button class="secondary-btn" @click="router.push('/writing')">
            {{ themeStore.lang === 'zh' ? '写一篇作文' : 'Write an Essay' }}
          </button>
        </div>
      </div>

      <!-- Grouped items -->
      <div v-for="(items, mod) in groupedItems" :key="mod" class="module-group">
        <div class="group-header" @click="goToModule(mod)">
          <span class="group-icon">{{ getModuleLabel(mod).icon }}</span>
          <span class="group-title">{{ themeStore.lang === 'zh' ? getModuleLabel(mod).zh : getModuleLabel(mod).en }}</span>
          <span class="group-count">{{ items.length }}</span>
          <span class="group-arrow">→</span>
        </div>

        <div class="item-list">
          <div v-for="item in items" :key="item.id" class="review-item" :class="{ reviewed: item.reviewedAt }">
            <div class="item-content">
              <span class="item-type" v-if="item.type">{{ item.type }}</span>
              <p class="item-text">{{ item.text }}</p>
              <p class="item-reason" v-if="item.reason">{{ item.reason }}</p>
              <span class="item-date">{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="item-actions">
              <button v-if="!item.reviewedAt" class="action-btn check" @click="markReviewed(item)" title="标记已复习">
                ✓
              </button>
              <button class="action-btn delete" @click="deleteItem(item)" title="删除">
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
}

.stats-bar {
  display: flex;
  gap: 12px;
  margin: var(--space-xl) 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 80px;
}

.stat:hover { border-color: var(--text-tertiary); }
.stat.active { border-color: var(--black); background: var(--black); color: var(--white); }
[data-theme="dark"] .stat.active { border-color: var(--white); background: var(--white); color: var(--black); }

.stat-num { font-size: var(--font-size-xl); font-weight: 800; }
.stat-label { font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 2px; }
.stat.active .stat-label { color: inherit; opacity: 0.7; }

.empty {
  text-align: center;
  padding: var(--space-3xl) 0;
}

.empty-icon { font-size: 3rem; margin-bottom: var(--space-md); }
.empty-text {
  color: var(--text-tertiary);
  margin: 0 auto var(--space-lg);
  max-width: 560px;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.primary-btn {
  padding: 10px 24px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
}
[data-theme="dark"] .primary-btn { background: var(--white); color: var(--black); }

.secondary-btn {
  padding: 10px 24px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.secondary-btn:hover {
  background: var(--bg-tertiary);
}

.module-group {
  margin-bottom: var(--space-xl);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}

.group-header:hover .group-arrow { transform: translateX(3px); }

.group-icon { font-size: 1.1rem; }
.group-title { font-weight: 700; font-size: var(--font-size-sm); flex: 1; }
.group-count {
  font-size: var(--font-size-xs);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
  color: var(--text-secondary);
}
.group-arrow { color: var(--text-tertiary); transition: transform 0.2s; }

.item-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.review-item:hover { border-color: var(--text-tertiary); }
.review-item.reviewed { opacity: 0.5; }

.item-content { flex: 1; min-width: 0; }

.item-type {
  display: inline-block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--blue);
  background: var(--blue-soft);
  padding: 1px 6px;
  border-radius: 3px;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.item-text {
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 4px;
}

.item-reason {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  line-height: 1.4;
}

.item-date {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  transition: all var(--transition-fast);
}

.action-btn.check {
  background: var(--green-soft);
  color: var(--green);
}
.action-btn.check:hover { background: var(--green); color: white; }

.action-btn.delete {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.action-btn.delete:hover { background: var(--red-soft); color: var(--red); }

@media (max-width: 768px) {
  .stats-bar { gap: 8px; }
  .stat { padding: 10px 16px; min-width: 60px; }
}
</style>
