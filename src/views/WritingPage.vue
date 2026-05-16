<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { writingTasks } from '../data/ielts/writing'
import { batchWriting } from '../services/ai'

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

// Timer
const timerRunning = ref(false)
const timerSeconds = ref(0)
let timerInterval = null
const timerLimit = computed(() => activeTask.value === 1 ? 1200 : 2400) // 20min / 40min

// History
const history = ref(JSON.parse(localStorage.getItem('mamio-writing-history') || '[]'))
const showHistory = ref(false)

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
  if (!highlightWords.length) return text
  const regex = new RegExp(`\\b(${highlightWords.join('|')})\\b`, 'gi')
  return text.replace(regex, `<span class="${cssClass}">$1</span>`)
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
    aiResult.value = await batchWriting(selectedPrompt.value.prompt, essay.value, activeTask.value)
    showResult.value = true
    saveToHistory()
  } catch (e) {
    aiResult.value = { error: e.response?.data?.error || '批改失败，请稍后重试' }
    showResult.value = true
  } finally {
    loading.value = false
  }
}

function saveToHistory() {
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    taskType: activeTask.value,
    promptId: selectedPrompt.value.id,
    promptType: selectedPrompt.value.type,
    promptPreview: selectedPrompt.value.prompt.substring(0, 80),
    essay: essay.value,
    wordCount: wordCount.value,
    timeSpent: timerSeconds.value,
    score: aiResult.value?.overall || null,
    details: aiResult.value?.error ? null : aiResult.value
  }
  history.value.unshift(entry)
  if (history.value.length > 30) history.value = history.value.slice(0, 30)
  localStorage.setItem('mamio-writing-history', JSON.stringify(history.value))
  // Clear draft after successful submission
  if (selectedPrompt.value) {
    localStorage.removeItem(draftKey.value)
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
        <div v-if="history.length === 0" class="empty-history">
          <p>{{ themeStore.lang === 'zh' ? '还没有批改记录，开始写作吧！' : 'No grading history yet. Start writing!' }}</p>
        </div>
        <div v-else class="history-list">
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
                    <p class="gemini-hint">{{ themeStore.lang === 'zh' ? '提示：可以把以上问题复制到 Gemini 进行深入学习和讨论' : 'Tip: Copy these issues to Gemini for deeper learning and discussion' }}</p>
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

.gemini-hint {
  margin-top: var(--space-md);
  padding: 10px 14px;
  background: var(--blue-soft);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--blue);
}

.result-error { color: var(--red); text-align: center; }

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
