<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { writingTasks } from '../data/ielts/writing'
import { batchWriting } from '../services/ai'
import { getWritingHistory, addWritingRecord } from '../services/progress'
import { addReviewItemsFromFeedback } from '../services/reviewItems'

const rewriteChecking = ref(false)
const rewriteCheckResult = ref(null)

const themeStore = useThemeStore()
const activeTask = ref(1)
const selectedPrompt = ref(null)
const essay = ref('')
const wordCount = computed(() => essay.value.trim().split(/\s+/).filter(w => w).length)
const aiResult = ref(null)
const loading = ref(false)
const showResult = ref(false)
const showModel = ref(false)
const showComparison = ref(false)
const rewriteDraft = ref('')
const rewriteSaved = ref(false)
const currentHistoryId = ref(null)

// Timer
const timerRunning = ref(false)
const timerSeconds = ref(0)
let timerInterval = null
const timerLimit = computed(() => activeTask.value === 1 ? 1200 : 2400) // 20min / 40min

// History
const history = ref([])
const showHistory = ref(false)

onMounted(async () => {
  try {
    const data = await getWritingHistory()
    history.value = data.map(normalizeHistoryEntry)
    localStorage.setItem('mamio-writing-history', JSON.stringify(history.value))
  } catch {
    history.value = JSON.parse(localStorage.getItem('mamio-writing-history') || '[]').map(normalizeHistoryEntry)
  }
})

// Draft auto-save
const draftKey = computed(() => `mamio-writing-draft-${selectedPrompt.value?.id || 'none'}`)

const tasks = computed(() => activeTask.value === 1 ? writingTasks.task1 : writingTasks.task2)

// Essay comparison
const userWords = computed(() => {
  const words = essay.value.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  return [...new Set(words)]
})

const modelWords = computed(() => {
  const text = selectedPrompt.value?.modelEssay || ''
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  return [...new Set(words)]
})

const uniqueUserWords = computed(() => {
  return userWords.value.filter(w => !modelWords.value.includes(w))
})

const uniqueModelWords = computed(() => {
  return modelWords.value.filter(w => !userWords.value.includes(w))
})

const sharedWords = computed(() => {
  return userWords.value.filter(w => modelWords.value.includes(w))
})

function highlightText(text, highlightWords, cssClass) {
  const safeText = escapeHtml(text)
  if (!highlightWords.length) return safeText
  const escapedWords = highlightWords.map(escapeRegExp)
  const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi')
  return safeText.replace(regex, `<span class="${cssClass}">$1</span>`)
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeHistoryEntry(entry) {
  const details = entry.details || {}
  const essayText = entry.essay || ''
  const taskText = entry.task || ''

  return {
    ...entry,
    taskType: entry.taskType ?? entry.task_type ?? activeTask.value,
    promptType: entry.promptType ?? details.promptType ?? `Task ${entry.task_type || activeTask.value}`,
    promptPreview: entry.promptPreview ?? taskText.substring(0, 80),
    wordCount: entry.wordCount ?? details.wordCount ?? essayText.trim().split(/\s+/).filter(Boolean).length,
    timeSpent: entry.timeSpent ?? details.timeSpent ?? 0
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function selectPrompt(prompt) {
  selectedPrompt.value = prompt
  showResult.value = false
  aiResult.value = null
  showModel.value = false
  rewriteDraft.value = ''
  rewriteSaved.value = false
  currentHistoryId.value = null
  stopTimer()
  // Load draft
  const savedDraft = localStorage.getItem(`mamio-writing-draft-${prompt.id}`)
  essay.value = savedDraft || ''
}

// Timer
function startTimer() {
  if (timerRunning.value) return
  timerRunning.value = true
  timerInterval = setInterval(() => {
    timerSeconds.value++
    if (timerSeconds.value >= timerLimit.value) {
      stopTimer()
    }
  }, 1000)
}

function stopTimer() {
  timerRunning.value = false
  clearInterval(timerInterval)
}

function resetTimer() {
  stopTimer()
  timerSeconds.value = 0
}

// Auto-save draft (debounced)
let draftTimer = null
watch(essay, (val) => {
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (selectedPrompt.value && val) {
      localStorage.setItem(draftKey.value, val)
    }
  }, 2000)
})

async function submitEssay() {
  if (!essay.value.trim()) return
  loading.value = true
  stopTimer()
  try {
    aiResult.value = await batchWriting(selectedPrompt.value.prompt, essay.value, activeTask.value, themeStore.lang)
    showResult.value = true
    rewriteDraft.value = ''
    rewriteSaved.value = false
    saveToHistory()
  } catch (e) {
    aiResult.value = { error: e.response?.data?.error || '批改失败，请稍后重试' }
    showResult.value = true
  } finally {
    loading.value = false
  }
}

async function saveToHistory() {
  const entry = {
    task_type: activeTask.value,
    task: selectedPrompt.value.prompt,
    essay: essay.value,
    score: aiResult.value?.overall || null,
    details: aiResult.value?.error ? null : {
      ...aiResult.value,
      promptType: selectedPrompt.value.type,
      wordCount: wordCount.value,
      timeSpent: timerSeconds.value
    }
  }
  try {
    const result = await addWritingRecord(entry)
    entry.id = result.id
    entry.date = new Date().toISOString()
  } catch {
    entry.id = Date.now()
    entry.date = new Date().toISOString()
  }
  currentHistoryId.value = entry.id
  entry.promptId = selectedPrompt.value.id
  entry.promptType = selectedPrompt.value.type
  entry.promptPreview = selectedPrompt.value.prompt.substring(0, 80)
  entry.wordCount = wordCount.value
  entry.timeSpent = timerSeconds.value
  history.value.unshift(normalizeHistoryEntry(entry))
  if (history.value.length > 30) history.value = history.value.slice(0, 30)
  localStorage.setItem('mamio-writing-history', JSON.stringify(history.value))
  addReviewItemsFromFeedback(aiResult.value, { module: 'writing', source: 'writing-feedback' })
  // Clear draft after successful submission
  if (selectedPrompt.value) {
    localStorage.removeItem(draftKey.value)
  }
}

function saveRewriteDraft() {
  if (!rewriteDraft.value.trim() || !aiResult.value?.rewriteMission) return
  const key = `mamio-writing-rewrite-${currentHistoryId.value || selectedPrompt.value?.id || Date.now()}`
  const payload = {
    id: Date.now(),
    promptId: selectedPrompt.value?.id,
    promptPreview: selectedPrompt.value?.prompt?.substring(0, 60),
    taskType: activeTask.value,
    originalEssay: essay.value,
    rewrite: rewriteDraft.value,
    mission: aiResult.value.rewriteMission,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem(key, JSON.stringify(payload))
  // Also append to rewrite history list
  const rewrites = JSON.parse(localStorage.getItem('mamio-writing-rewrites') || '[]')
  rewrites.unshift(payload)
  if (rewrites.length > 20) rewrites.length = 20
  localStorage.setItem('mamio-writing-rewrites', JSON.stringify(rewrites))
  rewriteSaved.value = true
}

const rewriteHistory = ref(JSON.parse(localStorage.getItem('mamio-writing-rewrites') || '[]'))

async function checkRewrite() {
  if (!rewriteDraft.value.trim() || !aiResult.value?.rewriteMission) return
  rewriteChecking.value = true
  rewriteCheckResult.value = null
  try {
    const prompt = selectedPrompt.value?.prompt || ''
    const mission = aiResult.value.rewriteMission
    const res = await batchWriting(
      `请对比考生的原文和重写段落，评估重写是否改善了原问题。\n\n原任务：${prompt}\n\n目标：${mission.target}\n要求：${mission.instruction}\n检查项：${(mission.checklist || []).join('、')}\n\n原文：\n${essay.value}\n\n重写：\n${rewriteDraft.value}`,
      activeTask.value,
      themeStore.lang
    )
    rewriteCheckResult.value = res
  } catch (err) {
    rewriteCheckResult.value = { error: err.message || '检查失败' }
  } finally {
    rewriteChecking.value = false
  }
}

function deleteHistory(id) {
  history.value = history.value.filter(h => h.id !== id)
  localStorage.setItem('mamio-writing-history', JSON.stringify(history.value))
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow)'
  return 'var(--red)'
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

watch(activeTask, () => {
  selectedPrompt.value = null
  resetTimer()
})

onUnmounted(() => {
  clearInterval(timerInterval)
  clearTimeout(draftTimer)
})
</script>

<template>
  <div class="writing-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ themeStore.lang === 'zh' ? '雅思写作练习' : 'IELTS Writing Practice' }}</h1>
        <button class="history-btn" @click="showHistory = !showHistory">
          {{ showHistory ? (themeStore.lang === 'zh' ? '返回练习' : 'Back to Practice') : (themeStore.lang === 'zh' ? '批改记录' : 'History') }}
          <span v-if="history.length" class="history-count">{{ history.length }}</span>
        </button>
      </div>

      <!-- History Panel -->
      <div v-if="showHistory" class="history-panel">
        <div v-if="history.length === 0 && rewriteHistory.length === 0" class="empty-history">
          <p>{{ themeStore.lang === 'zh' ? '还没有批改记录，开始写作吧！' : 'No grading history yet. Start writing!' }}</p>
        </div>

        <!-- Grading History -->
        <div v-if="history.length" class="history-section">
          <h3 class="history-section-title">{{ themeStore.lang === 'zh' ? '批改记录' : 'Grading History' }}</h3>
          <div class="history-list">
            <div v-for="h in history" :key="h.id" class="history-item">
              <div class="history-top">
                <span class="history-badge">Task {{ h.taskType }}</span>
                <span class="history-type">{{ h.promptType }}</span>
                <span class="history-words">{{ h.wordCount }} {{ themeStore.lang === 'zh' ? '词' : 'words' }}</span>
                <span v-if="h.timeSpent" class="history-time">{{ formatTime(h.timeSpent) }}</span>
                <span v-if="h.score" class="history-score" :style="{ color: getScoreColor(h.score) }">Band {{ h.score }}</span>
                <span class="history-date">{{ formatDate(h.date) }}</span>
                <button class="history-delete" @click="deleteHistory(h.id)">×</button>
              </div>
              <p class="history-preview">{{ h.essay.substring(0, 120) }}...</p>
            </div>
          </div>
        </div>

        <!-- Rewrite History -->
        <div v-if="rewriteHistory.length" class="history-section">
          <h3 class="history-section-title">{{ themeStore.lang === 'zh' ? '重写记录' : 'Rewrite History' }} ({{ rewriteHistory.length }})</h3>
          <div class="history-list">
            <div v-for="r in rewriteHistory" :key="r.id" class="history-item rewrite-item">
              <div class="history-top">
                <span class="history-badge rewrite-badge">{{ themeStore.lang === 'zh' ? '重写' : 'Rewrite' }}</span>
                <span class="history-type">{{ r.promptPreview || '' }}</span>
                <span class="history-date">{{ formatDate(r.savedAt) }}</span>
              </div>
              <p class="rewrite-preview">{{ r.rewrite.substring(0, 100) }}...</p>
              <p class="rewrite-target-label" v-if="r.mission?.target">
                {{ themeStore.lang === 'zh' ? '目标' : 'Target' }}: {{ r.mission.target }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Practice Area -->
      <template v-if="!showHistory">
        <div class="task-tabs">
          <button class="task-btn" :class="{ active: activeTask === 1 }" @click="activeTask = 1; selectedPrompt = null">Task 1</button>
          <button class="task-btn" :class="{ active: activeTask === 2 }" @click="activeTask = 2; selectedPrompt = null">Task 2</button>
        </div>

        <div class="writing-layout">
          <!-- Prompt list -->
          <div class="prompt-sidebar">
            <div v-for="p in tasks" :key="p.id" class="prompt-item" :class="{ active: selectedPrompt?.id === p.id }" @click="selectPrompt(p)">
              <span class="prompt-type">{{ p.type }}</span>
              <p class="prompt-preview">{{ p.prompt.substring(0, 60) }}...</p>
            </div>
          </div>

          <!-- Main area -->
          <div class="writing-main">
            <template v-if="selectedPrompt">
              <div class="prompt-card">
                <span class="prompt-badge">{{ activeTask === 1 ? 'Task 1' : 'Task 2' }} · {{ selectedPrompt.type }}</span>
                <p class="prompt-full">{{ selectedPrompt.prompt }}</p>
                <div class="key-points">
                  <h4>{{ themeStore.lang === 'zh' ? '要点提示' : 'Key Points' }}</h4>
                  <ul>
                    <li v-for="p in selectedPrompt.keyPoints" :key="p">{{ p }}</li>
                  </ul>
                </div>
                <div class="sample-outline" v-if="selectedPrompt.sampleOutline">
                  <h4>{{ themeStore.lang === 'zh' ? '结构参考' : 'Structure' }}</h4>
                  <p>{{ selectedPrompt.sampleOutline }}</p>
                </div>
              </div>

              <!-- Timer -->
              <div class="timer-bar">
                <div class="timer-display" :class="{ warning: timerSeconds >= timerLimit }">
                  <span class="timer-label">{{ themeStore.lang === 'zh' ? '用时' : 'Time' }}:</span>
                  <span class="timer-value">{{ formatTime(timerSeconds) }}</span>
                  <span class="timer-limit">/ {{ formatTime(timerLimit) }}</span>
                </div>
                <div class="timer-actions">
                  <button v-if="!timerRunning" class="timer-ctrl" @click="startTimer">
                    {{ timerSeconds > 0 ? (themeStore.lang === 'zh' ? '继续' : 'Resume') : (themeStore.lang === 'zh' ? '开始计时' : 'Start Timer') }}
                  </button>
                  <button v-else class="timer-ctrl active" @click="stopTimer">
                    {{ themeStore.lang === 'zh' ? '暂停' : 'Pause' }}
                  </button>
                  <button v-if="timerSeconds > 0" class="timer-ctrl" @click="resetTimer">
                    {{ themeStore.lang === 'zh' ? '重置' : 'Reset' }}
                  </button>
                </div>
              </div>

              <div class="editor-area">
                <textarea v-model="essay" :placeholder="themeStore.lang === 'zh' ? '在此输入你的作文...' : 'Write your essay here...'" rows="16"></textarea>
                <div class="editor-footer">
                  <span class="word-count" :class="{ enough: (activeTask === 1 && wordCount >= 150) || (activeTask === 2 && wordCount >= 250) }">
                    {{ wordCount }} {{ themeStore.lang === 'zh' ? '词' : 'words' }}
                    <span v-if="activeTask === 1 && wordCount < 150"> / 150 min</span>
                    <span v-if="activeTask === 2 && wordCount < 250"> / 250 min</span>
                  </span>
                  <button class="submit-btn" @click="submitEssay" :disabled="loading || wordCount < 20">
                    {{ loading ? (themeStore.lang === 'zh' ? 'AI 批改中...' : 'AI Grading...') : (themeStore.lang === 'zh' ? 'AI 批改' : 'Get AI Feedback') }}
                  </button>
                </div>
              </div>

              <!-- AI Result -->
              <div v-if="showResult && aiResult" class="ai-result">
                <div v-if="aiResult.error" class="result-error">{{ aiResult.error }}</div>
                <template v-else>
                  <div class="result-header">
                    <div class="overall-score" :style="{ borderColor: getScoreColor(aiResult.overall) }">
                      <span class="score-num">{{ aiResult.overall }}</span>
                      <span class="score-label">Band</span>
                    </div>
                  </div>

                  <div class="score-dimensions">
                    <div v-for="(dim, key) in { taskResponse: aiResult.taskResponse, coherence: aiResult.coherence, lexical: aiResult.lexical, grammar: aiResult.grammar }" :key="key" class="dim-item">
                      <div class="dim-header">
                        <span class="dim-name">{{ { taskResponse: themeStore.lang === 'zh' ? '任务回应' : 'Task Response', coherence: themeStore.lang === 'zh' ? '连贯性' : 'Coherence', lexical: themeStore.lang === 'zh' ? '词汇' : 'Lexical', grammar: themeStore.lang === 'zh' ? '语法' : 'Grammar' }[key] }}</span>
                        <span class="dim-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
                      </div>
                      <p class="dim-comment">{{ dim.comment }}</p>
                      <p class="dim-direction" v-if="dim.direction">💡 {{ dim.direction }}</p>
                    </div>
                  </div>

                  <div v-if="aiResult.strengths?.length" class="feedback-section">
                    <h4>{{ themeStore.lang === 'zh' ? '优点' : 'Strengths' }}</h4>
                    <ul><li v-for="s in aiResult.strengths" :key="s" class="strength-item">{{ s }}</li></ul>
                  </div>

                  <div v-if="aiResult.weaknesses?.length" class="feedback-section">
                    <h4>{{ themeStore.lang === 'zh' ? '问题' : 'Weaknesses' }}</h4>
                    <ul><li v-for="w in aiResult.weaknesses" :key="w" class="weakness-item">{{ w }}</li></ul>
                  </div>

                  <div v-if="aiResult.actionPlan?.length" class="feedback-section">
                    <h4>{{ themeStore.lang === 'zh' ? '行动计划' : 'Action Plan' }}</h4>
                    <ol><li v-for="a in aiResult.actionPlan" :key="a">{{ a }}</li></ol>
                  </div>

                  <div v-if="aiResult.rewriteMission" class="rewrite-mission">
                    <div class="rewrite-head">
                      <span class="rewrite-icon">↻</span>
                      <div>
                        <h4>{{ themeStore.lang === 'zh' ? '重写任务' : 'Rewrite Mission' }}</h4>
                        <p>{{ aiResult.rewriteMission.instruction }}</p>
                      </div>
                    </div>
                    <div class="rewrite-target">
                      {{ themeStore.lang === 'zh' ? '目标' : 'Target' }}: {{ aiResult.rewriteMission.target }}
                    </div>
                    <ul v-if="aiResult.rewriteMission.checklist?.length" class="rewrite-checklist">
                      <li v-for="item in aiResult.rewriteMission.checklist" :key="item">{{ item }}</li>
                    </ul>
                    <textarea v-model="rewriteDraft" class="rewrite-textarea" :placeholder="themeStore.lang === 'zh' ? '在这里只重写这一段，不用重写全文...' : 'Rewrite only this focused section here, not the full essay...'" rows="6"></textarea>
                    <div class="rewrite-actions">
                      <button class="rewrite-save" @click="saveRewriteDraft" :disabled="!rewriteDraft.trim()">
                        {{ themeStore.lang === 'zh' ? '保存重写稿' : 'Save Rewrite' }}
                      </button>
                      <button class="rewrite-check" @click="checkRewrite" :disabled="!rewriteDraft.trim() || rewriteChecking">
                        {{ rewriteChecking ? (themeStore.lang === 'zh' ? '检查中...' : 'Checking...') : (themeStore.lang === 'zh' ? 'AI 检查重写' : 'Check with AI') }}
                      </button>
                      <span v-if="rewriteSaved" class="rewrite-saved">{{ themeStore.lang === 'zh' ? '已保存' : 'Saved' }}</span>
                    </div>

                    <!-- Rewrite Check Result -->
                    <div v-if="rewriteCheckResult && !rewriteCheckResult.error" class="rewrite-check-result">
                      <h4>{{ themeStore.lang === 'zh' ? '重写评估' : 'Rewrite Assessment' }}</h4>
                      <div v-if="rewriteCheckResult.overall" class="rewrite-score">
                        {{ themeStore.lang === 'zh' ? '评分' : 'Score' }}: <strong :style="{ color: getScoreColor(rewriteCheckResult.overall) }">Band {{ rewriteCheckResult.overall }}</strong>
                      </div>
                      <div v-if="rewriteCheckResult.strengths?.length" class="rewrite-feedback">
                        <span class="rf-label">{{ themeStore.lang === 'zh' ? '改善点' : 'Improvements' }}:</span>
                        <ul><li v-for="s in rewriteCheckResult.strengths" :key="s">{{ s }}</li></ul>
                      </div>
                      <div v-if="rewriteCheckResult.weaknesses?.length" class="rewrite-feedback">
                        <span class="rf-label">{{ themeStore.lang === 'zh' ? '仍需改进' : 'Still needs work' }}:</span>
                        <ul><li v-for="w in rewriteCheckResult.weaknesses" :key="w">{{ w }}</li></ul>
                      </div>
                      <div v-if="rewriteCheckResult.actionPlan?.length" class="rewrite-feedback">
                        <span class="rf-label">{{ themeStore.lang === 'zh' ? '建议' : 'Suggestions' }}:</span>
                        <ol><li v-for="a in rewriteCheckResult.actionPlan" :key="a">{{ a }}</li></ol>
                      </div>
                    </div>
                    <div v-if="rewriteCheckResult?.error" class="rewrite-check-error">
                      {{ rewriteCheckResult.error }}
                    </div>
                  </div>
                </template>
              </div>

              <!-- Model Essay -->
              <div v-if="selectedPrompt.modelEssay" class="model-section">
                <div class="model-actions">
                  <button class="model-toggle" @click="showModel = !showModel">
                    {{ showModel ? (themeStore.lang === 'zh' ? '隐藏范文' : 'Hide Model Essay') : (themeStore.lang === 'zh' ? '查看高分范文' : 'Show Model Essay') }}
                  </button>
                  <button class="model-toggle compare-btn" @click="showComparison = !showComparison">
                    {{ showComparison ? (themeStore.lang === 'zh' ? '隐藏对比' : 'Hide Comparison') : (themeStore.lang === 'zh' ? '范文对比' : 'Compare Essays') }}
                  </button>
                </div>

                <div v-if="showModel" class="model-essay">
                  <p>{{ selectedPrompt.modelEssay }}</p>
                </div>

                <!-- Comparison view -->
                <div v-if="showComparison && essay.trim()" class="comparison-panel">
                  <div class="comparison-header">
                    <h4>{{ themeStore.lang === 'zh' ? '词汇对比分析' : 'Vocabulary Comparison' }}</h4>
                  </div>

                  <div class="comparison-stats">
                    <div class="comp-stat">
                      <span class="comp-num" style="color: var(--green)">{{ sharedWords.length }}</span>
                      <span class="comp-label">{{ themeStore.lang === 'zh' ? '共同词汇' : 'Shared' }}</span>
                    </div>
                    <div class="comp-stat">
                      <span class="comp-num" style="color: var(--blue)">{{ uniqueUserWords.length }}</span>
                      <span class="comp-label">{{ themeStore.lang === 'zh' ? '你的独有' : 'Yours only' }}</span>
                    </div>
                    <div class="comp-stat">
                      <span class="comp-num" style="color: var(--purple)">{{ uniqueModelWords.length }}</span>
                      <span class="comp-label">{{ themeStore.lang === 'zh' ? '范文独有' : 'Model only' }}</span>
                    </div>
                  </div>

                  <div class="comparison-cols">
                    <div class="comp-col">
                      <h5>{{ themeStore.lang === 'zh' ? '你的作文' : 'Your Essay' }}</h5>
                      <div class="comp-text" v-html="highlightText(essay, uniqueUserWords, 'word-user')"></div>
                    </div>
                    <div class="comp-col">
                      <h5>{{ themeStore.lang === 'zh' ? '高分范文' : 'Model Essay' }}</h5>
                      <div class="comp-text" v-html="highlightText(selectedPrompt.modelEssay, uniqueModelWords, 'word-model')"></div>
                    </div>
                  </div>

                  <div class="vocab-diff">
                    <div class="diff-section" v-if="uniqueModelWords.length">
                      <h5>{{ themeStore.lang === 'zh' ? '范文用了但你没用的词' : 'Words in model but not in yours' }}</h5>
                      <div class="diff-tags">
                        <span v-for="w in uniqueModelWords.slice(0, 20)" :key="w" class="diff-tag model">{{ w }}</span>
                      </div>
                    </div>
                    <div class="diff-section" v-if="uniqueUserWords.length">
                      <h5>{{ themeStore.lang === 'zh' ? '你用了但范文没用的词' : 'Words in yours but not in model' }}</h5>
                      <div class="diff-tags">
                        <span v-for="w in uniqueUserWords.slice(0, 20)" :key="w" class="diff-tag user">{{ w }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <p>{{ themeStore.lang === 'zh' ? '← 选择一个题目开始写作' : '← Select a prompt to start writing' }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.writing-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.history-btn {
  position: relative;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.history-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--blue);
  color: white;
  font-size: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* History */
.history-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.empty-history {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-tertiary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.history-item {
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.history-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.history-badge {
  background: var(--black);
  color: var(--white);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

[data-theme="dark"] .history-badge {
  background: var(--white);
  color: var(--black);
}

.history-type {
  font-size: var(--font-size-xs);
  color: var(--blue);
  font-weight: 600;
  text-transform: uppercase;
}

.history-words, .history-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.history-score {
  font-weight: 800;
  font-size: var(--font-size-base);
}

.history-date {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-left: auto;
}

.history-delete {
  background: none;
  color: var(--text-tertiary);
  font-size: 18px;
  padding: 0 4px;
}

.history-preview {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  line-height: 1.5;
}

.task-tabs { display: flex; gap: 8px; margin-bottom: var(--space-xl); }

.task-btn {
  padding: 8px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.task-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .task-btn.active { background: var(--white); color: var(--black); }

.writing-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.prompt-sidebar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 600px;
}

.prompt-item {
  padding: 14px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.prompt-item:hover { background: var(--bg-tertiary); }
.prompt-item.active { border-left-color: var(--green); background: var(--green-soft); }

.prompt-type {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--blue);
  text-transform: uppercase;
}

.prompt-preview {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
  line-height: 1.4;
}

.writing-main { display: flex; flex-direction: column; gap: var(--space-lg); }

.prompt-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.prompt-badge {
  display: inline-block;
  padding: 3px 12px;
  background: var(--blue-soft);
  color: var(--blue);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  margin-bottom: var(--space-md);
  text-transform: uppercase;
}

.prompt-full { font-size: var(--font-size-base); line-height: 1.7; margin-bottom: var(--space-lg); }

.key-points, .sample-outline {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.key-points h4, .sample-outline h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: 6px;
}

.key-points ul { list-style: disc; padding-left: 20px; }
.key-points li, .sample-outline p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; }

/* Timer */
.timer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.timer-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.timer-display.warning .timer-value {
  color: var(--red);
  font-weight: 700;
}

.timer-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.timer-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.timer-limit {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.timer-actions {
  display: flex;
  gap: 8px;
}

.timer-ctrl {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.timer-ctrl.active {
  background: var(--blue);
  color: white;
}

.editor-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.editor-area textarea {
  width: 100%;
  padding: var(--space-xl);
  border: none;
  outline: none;
  resize: vertical;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.7;
  background: transparent;
  color: var(--text-primary);
  min-height: 300px;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.word-count { font-size: var(--font-size-sm); color: var(--text-tertiary); }
.word-count.enough { color: var(--green); font-weight: 600; }

.submit-btn {
  padding: 10px 24px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
}

[data-theme="dark"] .submit-btn { background: var(--white); color: var(--black); }
.submit-btn:disabled { opacity: 0.5; }

.ai-result {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.result-header { text-align: center; margin-bottom: var(--space-xl); }

.overall-score {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid;
  justify-content: center;
}

.score-num { font-size: var(--font-size-2xl); font-weight: 800; }
.score-label { font-size: var(--font-size-xs); color: var(--text-tertiary); }

.score-dimensions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: var(--space-lg);
}

.dim-item { background: var(--bg-tertiary); border-radius: var(--radius-sm); padding: 14px; }
.dim-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.dim-name { font-weight: 600; font-size: var(--font-size-sm); }
.dim-score { font-size: var(--font-size-lg); font-weight: 800; }
.dim-comment { font-size: var(--font-size-xs); color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px; }
.dim-direction { font-size: var(--font-size-xs); color: var(--blue); font-style: italic; }

.feedback-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.feedback-section h4 { font-size: var(--font-size-sm); font-weight: 700; margin-bottom: 6px; }
.feedback-section ul, .feedback-section ol { padding-left: 20px; }
.feedback-section li { font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 4px; }
.strength-item { color: var(--green); }
.weakness-item { color: var(--red); }

.result-error { color: var(--red); text-align: center; }

.rewrite-mission {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--blue-soft);
  text-align: left;
}

.rewrite-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: var(--space-sm);
}

.rewrite-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--blue);
  flex-shrink: 0;
}

.rewrite-head h4 {
  font-size: var(--font-size-base);
  font-weight: 800;
  margin-bottom: 4px;
}

.rewrite-head p,
.rewrite-target,
.rewrite-checklist li {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.rewrite-target {
  font-weight: 700;
  margin-bottom: 8px;
}

.rewrite-checklist {
  padding-left: 20px;
  margin-bottom: var(--space-md);
}

.rewrite-textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  resize: vertical;
}

.rewrite-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: var(--space-sm);
}

.rewrite-save {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: var(--blue);
  color: white;
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.rewrite-save:disabled {
  opacity: 0.5;
  cursor: default;
}

.rewrite-saved {
  font-size: var(--font-size-xs);
  color: var(--green);
  font-weight: 700;
}

.rewrite-check {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--blue);
  color: white;
}
.rewrite-check:disabled { opacity: 0.5; }

.rewrite-check-result {
  margin-top: var(--space-md);
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  text-align: left;
}

.rewrite-check-result h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: 8px;
}

.rewrite-score {
  font-size: var(--font-size-sm);
  margin-bottom: 8px;
}

.rewrite-feedback {
  margin-bottom: 8px;
}

.rf-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.rewrite-feedback ul,
.rewrite-feedback ol {
  margin: 4px 0 0 16px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.rewrite-check-error {
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--red);
}

.history-section {
  margin-bottom: var(--space-xl);
}

.history-section-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.rewrite-badge {
  background: var(--blue-soft) !important;
  color: var(--blue) !important;
}

.rewrite-preview {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.5;
}

.rewrite-target-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Model Essay */
.model-section { text-align: center; }

.model-toggle {
  padding: 10px 24px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.model-essay {
  margin-top: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: left;
}

.model-essay p {
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.model-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.compare-btn {
  background: var(--blue-soft);
  color: var(--blue);
}

/* Comparison panel */
.comparison-panel {
  margin-top: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.comparison-header h4 {
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.comparison-stats {
  display: flex;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.comp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.comp-num {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.comp-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.comparison-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.comp-col h5 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
}

.comp-text {
  font-size: var(--font-size-xs);
  line-height: 1.8;
  color: var(--text-secondary);
  max-height: 300px;
  overflow-y: auto;
}

.comp-text :deep(.word-user) {
  background: var(--blue-soft);
  color: var(--blue);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.comp-text :deep(.word-model) {
  background: var(--purple-soft);
  color: var(--purple);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.vocab-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.diff-section h5 {
  font-size: var(--font-size-xs);
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--text-secondary);
}

.diff-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diff-tag {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.diff-tag.model {
  background: var(--purple-soft);
  color: var(--purple);
}

.diff-tag.user {
  background: var(--blue-soft);
  color: var(--blue);
}

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-lg);
}

@media (max-width: 768px) {
  .writing-layout { grid-template-columns: 1fr; }
  .prompt-sidebar { max-height: 200px; }
  .score-dimensions { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .timer-bar { flex-direction: column; gap: 12px; }
}
</style>
