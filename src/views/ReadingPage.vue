<script setup>
import { ref, computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { readingPassages } from '../data/ielts/reading'
import { incrementDailyStats } from '../services/progress'

const themeStore = useThemeStore()

const selectedPassage = ref(null)
const currentQuestionIndex = ref(0)
const userAnswers = ref({})
const showResults = ref(false)
const score = ref(null)

// Timer
const timerRunning = ref(false)
const timerSeconds = ref(0)
let timerInterval = null

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function startTimer() {
  timerRunning.value = true
  timerSeconds.value = 0
  timerInterval = setInterval(() => {
    timerSeconds.value++
  }, 1000)
}

function stopTimer() {
  timerRunning.value = false
  clearInterval(timerInterval)
}

function selectPassage(passage) {
  selectedPassage.value = passage
  currentQuestionIndex.value = 0
  userAnswers.value = {}
  showResults.value = false
  score.value = null
  stopTimer()
  startTimer()
}

const currentQuestion = computed(() => {
  if (!selectedPassage.value) return null
  return selectedPassage.value.questions[currentQuestionIndex.value]
})

const totalQuestions = computed(() => {
  if (!selectedPassage.value) return 0
  return selectedPassage.value.questions.reduce((sum, q) => {
    if (q.type === 'true-false-ng') return sum + q.statements.length
    if (q.type === 'matching' || q.type === 'short-answer') return sum + (q.items?.length || 0)
    if (q.type === 'multiple-choice') return sum + (q.items?.length || 0)
    return sum + 1
  }, 0)
})

function setAnswer(questionId, index, value) {
  if (!userAnswers.value[questionId]) userAnswers.value[questionId] = {}
  userAnswers.value[questionId][index] = value
}

function getAnswer(questionId, index) {
  return userAnswers.value[questionId]?.[index] || ''
}

function nextQuestion() {
  if (currentQuestionIndex.value < selectedPassage.value.questions.length - 1) {
    currentQuestionIndex.value++
  }
}

function prevQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

function submitAnswers() {
  stopTimer()
  let correct = 0
  let total = 0

  for (const q of selectedPassage.value.questions) {
    const answers = userAnswers.value[q.id] || {}

    if (q.type === 'true-false-ng') {
      q.statements.forEach((s, i) => {
        total++
        if (answers[i] === s.answer) correct++
      })
    } else if (q.type === 'matching') {
      q.answers.forEach((a, i) => {
        total++
        if ((answers[i] || '').toUpperCase() === a.toUpperCase()) correct++
      })
    } else if (q.type === 'short-answer') {
      q.items.forEach((item, i) => {
        total++
        const userAns = (answers[i] || '').toLowerCase().trim().replace(/^(a|an|the)\s+/i, '')
        const correctAns = item.answer.toLowerCase().trim().replace(/^(a|an|the)\s+/i, '')
        if (userAns === correctAns) correct++
      })
    } else if (q.type === 'multiple-choice') {
      q.items.forEach((item, i) => {
        total++
        if ((answers[i] || '').toUpperCase() === item.answer.toUpperCase()) correct++
      })
    }
  }

  score.value = { correct, total, percentage: Math.round((correct / total) * 100) }
  showResults.value = true

  // Save to reading history
  const history = JSON.parse(localStorage.getItem('mamio-reading-history') || '[]')
  history.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    passage: selectedPassage.value.title,
    score: score.value.percentage,
    correct,
    total,
    time: timerSeconds.value
  })
  if (history.length > 50) history.length = 50
  localStorage.setItem('mamio-reading-history', JSON.stringify(history))

  incrementDailyStats(new Date().toISOString().split('T')[0], 'reading')
}

function getScoreColor(pct) {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 60) return 'var(--yellow, var(--amber))'
  return 'var(--red)'
}

function resetPractice() {
  selectedPassage.value = null
  showResults.value = false
  score.value = null
  stopTimer()
}

function getLevelLabel(level) {
  const labels = { easy: themeStore.lang === 'zh' ? '简单' : 'Easy', medium: themeStore.lang === 'zh' ? '中等' : 'Medium', hard: themeStore.lang === 'zh' ? '困难' : 'Hard' }
  return labels[level] || level
}

function getLevelColor(level) {
  const colors = { easy: 'var(--green)', medium: 'var(--yellow, var(--amber))', hard: 'var(--red)' }
  return colors[level] || 'var(--text-secondary)'
}
</script>

<template>
  <div class="reading-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ themeStore.lang === 'zh' ? '雅思阅读练习' : 'IELTS Reading Practice' }}</h1>
        <button v-if="selectedPassage" class="back-btn" @click="resetPractice">
          {{ themeStore.lang === 'zh' ? '← 返回选择' : '← Back' }}
        </button>
      </div>

      <!-- Passage selection -->
      <div v-if="!selectedPassage" class="passage-list">
        <div v-for="p in readingPassages" :key="p.id" class="passage-card" @click="selectPassage(p)">
          <div class="passage-info">
            <h3>{{ p.title }}</h3>
            <div class="passage-meta">
              <span class="level-tag" :style="{ color: getLevelColor(p.level), background: getLevelColor(p.level) + '18' }">
                {{ getLevelLabel(p.level) }}
              </span>
              <span class="question-count">{{ p.questions.length }} {{ themeStore.lang === 'zh' ? '组题' : 'question groups' }}</span>
            </div>
          </div>
          <span class="passage-arrow">→</span>
        </div>
      </div>

      <!-- Reading area -->
      <template v-if="selectedPassage && !showResults">
        <div class="reading-layout">
          <!-- Passage text -->
          <div class="passage-panel">
            <div class="passage-header">
              <h2>{{ selectedPassage.title }}</h2>
              <div class="timer" :class="{ active: timerRunning }">
                <span class="timer-icon">⏱</span>
                <span class="timer-value">{{ formatTime(timerSeconds) }}</span>
              </div>
            </div>
            <div class="passage-text">
              <p v-for="(para, i) in selectedPassage.passage.split('\n\n')" :key="i" class="paragraph">
                <span class="para-label">{{ String.fromCharCode(65 + i) }}.</span>
                {{ para.trim() }}
              </p>
            </div>
          </div>

          <!-- Questions panel -->
          <div class="questions-panel">
            <div class="q-progress">
              {{ themeStore.lang === 'zh' ? '题目' : 'Question' }} {{ currentQuestionIndex + 1 }} / {{ selectedPassage.questions.length }}
            </div>

            <div v-if="currentQuestion" class="question-block">
              <h4 class="q-title">{{ currentQuestion.question }}</h4>

              <!-- True/False/NG -->
              <div v-if="currentQuestion.type === 'true-false-ng'" class="q-tfng">
                <div v-for="(stmt, i) in currentQuestion.statements" :key="i" class="tfng-item">
                  <p class="tfng-text">{{ i + 1 }}. {{ stmt.text }}</p>
                  <div class="tfng-options">
                    <button v-for="opt in ['TRUE', 'FALSE', 'NOT GIVEN']" :key="opt"
                      class="tfng-btn" :class="{ active: getAnswer(currentQuestion.id, i) === opt }"
                      @click="setAnswer(currentQuestion.id, i, opt)">
                      {{ opt }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Matching -->
              <div v-if="currentQuestion.type === 'matching'" class="q-matching">
                <div v-for="(item, i) in currentQuestion.items" :key="i" class="matching-item">
                  <p class="matching-text">{{ i + 1 }}. {{ item }}</p>
                  <select :value="getAnswer(currentQuestion.id, i)" @change="setAnswer(currentQuestion.id, i, $event.target.value)" class="matching-select">
                    <option value="">{{ themeStore.lang === 'zh' ? '选择段落' : 'Select paragraph' }}</option>
                    <option v-for="l in ['A','B','C','D','E','F']" :key="l" :value="l">{{ l }}</option>
                  </select>
                </div>
              </div>

              <!-- Short answer -->
              <div v-if="currentQuestion.type === 'short-answer'" class="q-short">
                <div v-for="(item, i) in currentQuestion.items" :key="i" class="short-item">
                  <p class="short-text">{{ i + 1 }}. {{ item.question }}</p>
                  <input :value="getAnswer(currentQuestion.id, i)" @input="setAnswer(currentQuestion.id, i, $event.target.value)" class="short-input" :placeholder="themeStore.lang === 'zh' ? '你的答案' : 'Your answer'" />
                </div>
              </div>

              <!-- Multiple choice -->
              <div v-if="currentQuestion.type === 'multiple-choice'" class="q-mc">
                <div v-for="(item, i) in currentQuestion.items" :key="i" class="mc-item">
                  <p class="mc-text">{{ i + 1 }}. {{ item.question }}</p>
                  <div class="mc-options">
                    <button v-for="opt in item.options" :key="opt"
                      class="mc-btn" :class="{ active: getAnswer(currentQuestion.id, i) === opt[0] }"
                      @click="setAnswer(currentQuestion.id, i, opt[0])">
                      {{ opt }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation -->
            <div class="q-nav">
              <button class="nav-btn" @click="prevQuestion" :disabled="currentQuestionIndex === 0">
                {{ themeStore.lang === 'zh' ? '上一题' : '← Previous' }}
              </button>
              <button v-if="currentQuestionIndex < selectedPassage.questions.length - 1" class="nav-btn primary" @click="nextQuestion">
                {{ themeStore.lang === 'zh' ? '下一题' : 'Next →' }}
              </button>
              <button v-else class="nav-btn primary" @click="submitAnswers">
                {{ themeStore.lang === 'zh' ? '提交答案' : 'Submit' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Results -->
      <template v-if="showResults && score">
        <div class="results-card">
          <div class="result-header">
            <div class="result-score" :style="{ borderColor: getScoreColor(score.percentage) }">
              <span class="score-pct">{{ score.percentage }}%</span>
              <span class="score-detail">{{ score.correct }}/{{ score.total }}</span>
            </div>
            <div class="result-time">
              <span class="time-label">{{ themeStore.lang === 'zh' ? '用时' : 'Time' }}</span>
              <span class="time-value">{{ formatTime(timerSeconds) }}</span>
            </div>
          </div>

          <!-- Detailed answers -->
          <div class="result-details">
            <h3>{{ themeStore.lang === 'zh' ? '答案解析' : 'Answer Analysis' }}</h3>
            <div v-for="(q, qi) in selectedPassage.questions" :key="qi" class="result-group">
              <h4>{{ q.question }}</h4>

              <div v-if="q.type === 'true-false-ng'" class="result-items">
                <div v-for="(stmt, i) in q.statements" :key="i" class="result-item" :class="{ correct: getAnswer(q.id, i) === stmt.answer, wrong: getAnswer(q.id, i) && getAnswer(q.id, i) !== stmt.answer }">
                  <span class="ri-num">{{ i + 1 }}.</span>
                  <span class="ri-text">{{ stmt.text }}</span>
                  <span class="ri-answer">{{ themeStore.lang === 'zh' ? '正确答案' : 'Answer' }}: <strong>{{ stmt.answer }}</strong></span>
                  <span v-if="getAnswer(q.id, i)" class="ri-yours">
                    {{ themeStore.lang === 'zh' ? '你的' : 'Yours' }}: <strong>{{ getAnswer(q.id, i) }}</strong>
                    <span v-if="getAnswer(q.id, i) === stmt.answer" class="ri-check">✓</span>
                    <span v-else class="ri-cross">✗</span>
                  </span>
                  <p class="ri-explain">{{ stmt.explanation }}</p>
                </div>
              </div>

              <div v-if="q.type === 'matching'" class="result-items">
                <div v-for="(item, i) in q.items" :key="i" class="result-item" :class="{ correct: (getAnswer(q.id, i) || '').toUpperCase() === q.answers[i].toUpperCase(), wrong: getAnswer(q.id, i) && (getAnswer(q.id, i) || '').toUpperCase() !== q.answers[i].toUpperCase() }">
                  <span class="ri-num">{{ i + 1 }}.</span>
                  <span class="ri-text">{{ item }}</span>
                  <span class="ri-answer">{{ themeStore.lang === 'zh' ? '正确答案' : 'Answer' }}: <strong>{{ q.answers[i] }}</strong></span>
                  <span v-if="getAnswer(q.id, i)" class="ri-yours">
                    {{ themeStore.lang === 'zh' ? '你的' : 'Yours' }}: <strong>{{ getAnswer(q.id, i) }}</strong>
                    <span v-if="(getAnswer(q.id, i) || '').toUpperCase() === q.answers[i].toUpperCase()" class="ri-check">✓</span>
                    <span v-else class="ri-cross">✗</span>
                  </span>
                </div>
              </div>

              <div v-if="q.type === 'short-answer'" class="result-items">
                <div v-for="(item, i) in q.items" :key="i" class="result-item" :class="{ correct: (getAnswer(q.id, i) || '').toLowerCase().trim().replace(/^(a|an|the)\s+/i, '') === item.answer.toLowerCase().trim().replace(/^(a|an|the)\s+/i, '') }">
                  <span class="ri-num">{{ i + 1 }}.</span>
                  <span class="ri-text">{{ item.question }}</span>
                  <span class="ri-answer">{{ themeStore.lang === 'zh' ? '正确答案' : 'Answer' }}: <strong>{{ item.answer }}</strong></span>
                  <span v-if="getAnswer(q.id, i)" class="ri-yours">
                    {{ themeStore.lang === 'zh' ? '你的' : 'Yours' }}: <strong>{{ getAnswer(q.id, i) }}</strong>
                  </span>
                </div>
              </div>

              <div v-if="q.type === 'multiple-choice'" class="result-items">
                <div v-for="(item, i) in q.items" :key="i" class="result-item" :class="{ correct: (getAnswer(q.id, i) || '').toUpperCase() === item.answer.toUpperCase() }">
                  <span class="ri-num">{{ i + 1 }}.</span>
                  <span class="ri-text">{{ item.question }}</span>
                  <span class="ri-answer">{{ themeStore.lang === 'zh' ? '正确答案' : 'Answer' }}: <strong>{{ item.answer }}</strong></span>
                  <span v-if="getAnswer(q.id, i)" class="ri-yours">
                    {{ themeStore.lang === 'zh' ? '你的' : 'Yours' }}: <strong>{{ getAnswer(q.id, i) }}</strong>
                  </span>
                  <p class="ri-explain">{{ item.explanation }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <button class="submit-btn" @click="selectPassage(selectedPassage)">
              {{ themeStore.lang === 'zh' ? '重新做' : 'Retry' }}
            </button>
            <button class="back-btn-main" @click="resetPractice">
              {{ themeStore.lang === 'zh' ? '选择其他' : 'Choose Another' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.reading-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.back-btn {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Passage list */
.passage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.passage-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 20px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.passage-card:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.passage-info { flex: 1; }
.passage-info h3 { font-weight: 700; margin-bottom: 6px; }

.passage-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.level-tag {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

.question-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.passage-arrow { color: var(--text-tertiary); font-size: 1.2rem; }

/* Reading layout */
.reading-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-lg);
  align-items: start;
}

.passage-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  position: sticky;
  top: calc(var(--header-height) + var(--space-xl));
}

.passage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.passage-header h2 { font-size: var(--font-size-lg); font-weight: 700; }

.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.timer.active { background: var(--blue-soft); color: var(--blue); }

.passage-text {
  line-height: 1.9;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.paragraph {
  margin-bottom: var(--space-lg);
  text-indent: 2em;
}

.para-label {
  font-weight: 700;
  color: var(--text-primary);
  margin-right: 4px;
}

/* Questions panel */
.questions-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.q-progress {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-md);
  font-weight: 600;
}

.q-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-md);
  line-height: 1.6;
}

/* TFNG */
.tfng-item {
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.tfng-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

.tfng-text {
  font-size: var(--font-size-sm);
  margin-bottom: 8px;
  line-height: 1.5;
}

.tfng-options {
  display: flex;
  gap: 6px;
}

.tfng-btn {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tfng-btn.active {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .tfng-btn.active {
  background: var(--white);
  color: var(--black);
}

/* Matching */
.matching-item {
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: 12px;
}

.matching-text {
  font-size: var(--font-size-sm);
  flex: 1;
  line-height: 1.5;
}

.matching-select {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: transparent;
  color: var(--text-primary);
  min-width: 80px;
}

/* Short answer */
.short-item {
  margin-bottom: var(--space-md);
}

.short-text {
  font-size: var(--font-size-sm);
  margin-bottom: 6px;
  line-height: 1.5;
}

.short-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: transparent;
  color: var(--text-primary);
  outline: none;
}

.short-input:focus { border-color: var(--blue); }

/* Multiple choice */
.mc-item {
  margin-bottom: var(--space-md);
}

.mc-text {
  font-size: var(--font-size-sm);
  margin-bottom: 8px;
  line-height: 1.5;
}

.mc-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mc-btn {
  text-align: left;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.mc-btn:hover { background: var(--border-color); }
.mc-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .mc-btn.active { background: var(--white); color: var(--black); }

/* Navigation */
.q-nav {
  display: flex;
  gap: 10px;
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.nav-btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.nav-btn:hover { background: var(--border-color); }
.nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.nav-btn.primary {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .nav-btn.primary {
  background: var(--white);
  color: var(--black);
}

/* Results */
.results-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xl);
  margin-bottom: var(--space-2xl);
}

.result-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid;
  justify-content: center;
}

.score-pct {
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

.score-detail {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.result-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.time-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.time-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.result-details h3 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-lg);
}

.result-group {
  margin-bottom: var(--space-xl);
}

.result-group h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
}

.result-item {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  background: var(--bg-tertiary);
}

.result-item.correct { background: var(--green-soft); }
.result-item.wrong { background: var(--red-soft); }

.ri-num { font-weight: 700; margin-right: 8px; font-size: var(--font-size-sm); }
.ri-text { font-size: var(--font-size-sm); display: block; margin-bottom: 6px; line-height: 1.5; }

.ri-answer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}

.ri-yours {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  display: block;
}

.ri-check { color: var(--green); font-weight: 700; }
.ri-cross { color: var(--red); font-weight: 700; }

.ri-explain {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 6px;
  font-style: italic;
  line-height: 1.5;
}

.result-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-2xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.submit-btn {
  flex: 1;
  padding: 12px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
}

[data-theme="dark"] .submit-btn { background: var(--white); color: var(--black); }

.back-btn-main {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  font-weight: 600;
}

@media (max-width: 768px) {
  .reading-layout {
    grid-template-columns: 1fr;
  }

  .passage-panel {
    position: static;
  }
}
</style>
