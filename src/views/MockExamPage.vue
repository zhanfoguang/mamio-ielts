<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { speakingTopics } from '../data/ielts/speaking'
import { writingTasks } from '../data/ielts/writing'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { scoreSpeaking, batchWriting } from '../services/ai'

const themeStore = useThemeStore()
const {
  isListening, transcript, interimTranscript, isSupported,
  isRecording, audioUrl, recordingDuration,
  start, stop, reset, startRecording, stopRecording, clearRecording
} = useSpeechRecognition()

const examType = ref(null) // 'speaking' or 'writing'
const examPhase = ref('select') // select, intro, active, result
const currentPart = ref(0)
const timerSeconds = ref(0)
const timerRunning = ref(false)
let timerInterval = null

// Speaking mock state
const speakingQuestions = ref([])
const speakingAnswers = ref({})
const speakingResults = ref(null)
const speakingLoading = ref(false)

// Writing mock state
const writingTasksList = ref([])
const writingEssays = ref({})
const writingResults = ref(null)
const writingLoading = ref(false)

// Overall
const mockStartTime = ref(null)
const mockEndTime = ref(null)

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function startTimer(duration) {
  timerSeconds.value = duration
  timerRunning.value = true
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval)
      timerRunning.value = false
      autoAdvance()
    }
  }, 1000)
}

function stopTimer() {
  clearInterval(timerInterval)
  timerRunning.value = false
}

function autoAdvance() {
  if (examType.value === 'speaking') {
    if (currentPart.value < 2) {
      nextSpeakingPart()
    } else {
      submitSpeakingMock()
    }
  } else {
    if (currentPart.value < 1) {
      nextWritingPart()
    } else {
      submitWritingMock()
    }
  }
}

// Speaking mock
function initSpeakingMock() {
  examType.value = 'speaking'
  examPhase.value = 'intro'
  currentPart.value = 0
  speakingResults.value = null
  writingResults.value = null

  // Pick random topics
  const part1 = speakingTopics.part1[Math.floor(Math.random() * speakingTopics.part1.length)]
  const part2 = speakingTopics.part2[Math.floor(Math.random() * speakingTopics.part2.length)]
  const part3 = speakingTopics.part3[Math.floor(Math.random() * speakingTopics.part3.length)]

  speakingQuestions.value = [
    { part: 1, topic: part1, question: part1.questions[0] },
    { part: 2, topic: part2, question: part2.cueCard },
    { part: 3, topic: part3, question: part3.questions[0] }
  ]
  speakingAnswers.value = {}
}

function startSpeakingMock() {
  examPhase.value = 'active'
  currentPart.value = 0
  mockStartTime.value = Date.now()
  // Part 1: 4-5 min
  startTimer(300)
}

function nextSpeakingPart() {
  stopTimer()
  // Save current answer
  speakingAnswers.value[currentPart.value] = transcript.value
  reset()

  if (currentPart.value < 2) {
    currentPart.value++
    if (currentPart.value === 1) {
      // Part 2: 3-4 min (1 prep + 2 speak)
      startTimer(210)
    } else {
      // Part 3: 4-5 min
      startTimer(300)
    }
  } else {
    submitSpeakingMock()
  }
}

async function submitSpeakingMock() {
  stopTimer()
  speakingAnswers.value[currentPart.value] = transcript.value
  mockEndTime.value = Date.now()
  speakingLoading.value = true

  try {
    const results = []
    for (let i = 0; i < speakingQuestions.value.length; i++) {
      const q = speakingQuestions.value[i]
      const answer = speakingAnswers.value[i] || ''
      if (answer.trim()) {
        const result = await scoreSpeaking(q.question, answer, q.part)
        results.push({ part: q.part, question: q.question, answer, ...result })
      } else {
        results.push({ part: q.part, question: q.question, answer, overall: 0, fluency: { score: 0, comment: 'No answer' }, lexical: { score: 0, comment: '' }, grammar: { score: 0, comment: '' }, pronunciation: { score: 0, comment: '' } })
      }
    }
    speakingResults.value = results
    examPhase.value = 'result'

    // Save to history
    const avgScore = results.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / results.filter(r => r.overall > 0).length
    const history = JSON.parse(localStorage.getItem('mamio-speaking-history') || '[]')
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      mode: 'mock',
      part: 'Mock',
      topic: 'Full Mock Exam',
      question: 'Part 1-3 Mock',
      answer: Object.values(speakingAnswers).join(' | '),
      score: Math.round(avgScore * 10) / 10,
      duration: Math.round((mockEndTime.value - mockStartTime.value) / 1000)
    })
    if (history.length > 50) history.length = 50
    localStorage.setItem('mamio-speaking-history', JSON.stringify(history))
  } catch (e) {
    console.error('Mock scoring error:', e)
  } finally {
    speakingLoading.value = false
  }
}

// Writing mock
function initWritingMock() {
  examType.value = 'writing'
  examPhase.value = 'intro'
  currentPart.value = 0
  speakingResults.value = null
  writingResults.value = null

  const task1 = writingTasks.task1[Math.floor(Math.random() * writingTasks.task1.length)]
  const task2 = writingTasks.task2[Math.floor(Math.random() * writingTasks.task2.length)]

  writingTasksList.value = [
    { type: 1, task: task1 },
    { type: 2, task: task2 }
  ]
  writingEssays.value = {}
}

function startWritingMock() {
  examPhase.value = 'active'
  currentPart.value = 0
  mockStartTime.value = Date.now()
  // Task 1: 20 min
  startTimer(1200)
}

function nextWritingPart() {
  stopTimer()
  if (currentPart.value < 1) {
    currentPart.value++
    // Task 2: 40 min
    startTimer(2400)
  } else {
    submitWritingMock()
  }
}

async function submitWritingMock() {
  stopTimer()
  mockEndTime.value = Date.now()
  writingLoading.value = true

  try {
    const results = []
    for (let i = 0; i < writingTasksList.value.length; i++) {
      const t = writingTasksList.value[i]
      const essay = writingEssays.value[i] || ''
      if (essay.trim().length > 50) {
        const taskText = typeof t.task === 'string' ? t.task : (t.task.task || t.task.question || JSON.stringify(t.task))
        const result = await batchWriting(taskText, essay, t.type, themeStore.lang)
        results.push({ type: t.type, task: taskText, essay, ...result })
      } else {
        results.push({ type: t.type, overall: 0, taskResponse: { score: 0 }, coherence: { score: 0 }, lexical: { score: 0 }, grammar: { score: 0 } })
      }
    }
    writingResults.value = results
    examPhase.value = 'result'

    const avgScore = results.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / results.filter(r => r.overall > 0).length
    const history = JSON.parse(localStorage.getItem('mamio-writing-history') || '[]')
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      mode: 'mock',
      taskType: 'Mock',
      task: 'Task 1 + Task 2 Mock',
      essay: Object.values(writingEssays).join('\n---\n'),
      score: Math.round(avgScore * 10) / 10,
      duration: Math.round((mockEndTime.value - mockStartTime.value) / 1000)
    })
    if (history.length > 50) history.length = 50
    localStorage.setItem('mamio-writing-history', JSON.stringify(history))
  } catch (e) {
    console.error('Mock scoring error:', e)
  } finally {
    writingLoading.value = false
  }
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow, var(--amber))'
  return 'var(--red)'
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function resetExam() {
  stopTimer()
  examType.value = null
  examPhase.value = 'select'
  currentPart.value = 0
  speakingResults.value = null
  writingResults.value = null
  reset()
}

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="mock-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '模拟考试' : 'Mock Exam' }}</h1>
      <p class="page-desc">{{ themeStore.lang === 'zh' ? '模拟真实雅思考试流程' : 'Simulate real IELTS exam conditions' }}</p>

      <!-- Select exam type -->
      <div v-if="examPhase === 'select'" class="exam-select">
        <div class="exam-option" @click="initSpeakingMock">
          <span class="exam-icon">🎤</span>
          <h3>{{ themeStore.lang === 'zh' ? '口语模考' : 'Speaking Mock' }}</h3>
          <p>{{ themeStore.lang === 'zh' ? 'Part 1 → 2 → 3 连续流程，约 11-14 分钟' : 'Part 1 → 2 → 3 continuous flow, ~11-14 min' }}</p>
        </div>
        <div class="exam-option" @click="initWritingMock">
          <span class="exam-icon">✍️</span>
          <h3>{{ themeStore.lang === 'zh' ? '写作模考' : 'Writing Mock' }}</h3>
          <p>{{ themeStore.lang === 'zh' ? 'Task 1 (20分钟) + Task 2 (40分钟) 连续' : 'Task 1 (20min) + Task 2 (40min) continuous' }}</p>
        </div>
      </div>

      <!-- Intro -->
      <div v-if="examPhase === 'intro'" class="exam-intro">
        <div class="intro-card">
          <h2 v-if="examType === 'speaking'">{{ themeStore.lang === 'zh' ? '口语模拟考试' : 'Speaking Mock Exam' }}</h2>
          <h2 v-else>{{ themeStore.lang === 'zh' ? '写作模拟考试' : 'Writing Mock Exam' }}</h2>

          <div class="intro-info">
            <div v-if="examType === 'speaking'" class="intro-flow">
              <div class="flow-step"><span class="flow-num">1</span> Part 1 — {{ themeStore.lang === 'zh' ? '日常话题 (5分钟)' : 'Daily topics (5min)' }}</div>
              <div class="flow-step"><span class="flow-num">2</span> Part 2 — {{ themeStore.lang === 'zh' ? '长回答 (3-4分钟)' : 'Long turn (3-4min)' }}</div>
              <div class="flow-step"><span class="flow-num">3</span> Part 3 — {{ themeStore.lang === 'zh' ? '深入讨论 (5分钟)' : 'Discussion (5min)' }}</div>
            </div>
            <div v-else class="intro-flow">
              <div class="flow-step"><span class="flow-num">1</span> Task 1 — {{ themeStore.lang === 'zh' ? '图表描述 (20分钟)' : 'Chart description (20min)' }}</div>
              <div class="flow-step"><span class="flow-num">2</span> Task 2 — {{ themeStore.lang === 'zh' ? '议论文 (40分钟)' : 'Essay (40min)' }}</div>
            </div>
          </div>

          <p class="intro-note">{{ themeStore.lang === 'zh' ? '考试开始后计时器自动运行，时间到自动进入下一部分' : 'Timer runs automatically. Advances to next part when time is up.' }}</p>

          <button class="start-btn" @click="examType === 'speaking' ? startSpeakingMock() : startWritingMock()">
            {{ themeStore.lang === 'zh' ? '开始考试' : 'Start Exam' }}
          </button>
          <button class="cancel-btn" @click="resetExam">
            {{ themeStore.lang === 'zh' ? '取消' : 'Cancel' }}
          </button>
        </div>
      </div>

      <!-- Active exam -->
      <div v-if="examPhase === 'active'" class="exam-active">
        <!-- Speaking mock -->
        <template v-if="examType === 'speaking'">
          <div class="exam-header">
            <span class="exam-part">Part {{ currentPart + 1 }} / 3</span>
            <div class="exam-timer" :class="{ warning: timerSeconds <= 30 }">
              {{ formatTime(timerSeconds) }}
            </div>
          </div>

          <div class="exam-question">
            <h3>{{ speakingQuestions[currentPart].topic.topic }}</h3>
            <p v-if="currentPart === 0" class="exam-q-text">{{ speakingQuestions[currentPart].question }}</p>
            <pre v-if="currentPart === 1" class="exam-cue">{{ speakingQuestions[currentPart].question }}</pre>
            <p v-if="currentPart === 2" class="exam-q-text">{{ speakingQuestions[currentPart].question }}</p>
          </div>

          <div class="exam-record">
            <button class="record-btn" :class="{ recording: isListening }" @click="isListening ? (stop(), stopRecording()) : (reset(), start(), startRecording())" :disabled="!isSupported">
              {{ isListening ? '⏹ ' + (themeStore.lang === 'zh' ? '停止录音' : 'Stop') : '🎤 ' + (themeStore.lang === 'zh' ? '开始录音' : 'Record') }}
            </button>
            <div v-if="isRecording" class="recording-indicator">
              <span class="rec-dot"></span>
              <span>{{ formatDuration(recordingDuration) }}</span>
            </div>
            <div v-if="transcript" class="exam-transcript">
              {{ transcript }}<span class="interim">{{ interimTranscript }}</span>
            </div>
          </div>

          <button class="next-btn" @click="nextSpeakingPart">
            {{ currentPart < 2 ? (themeStore.lang === 'zh' ? '下一部分' : 'Next Part') : (themeStore.lang === 'zh' ? '提交考试' : 'Submit Exam') }}
          </button>
        </template>

        <!-- Writing mock -->
        <template v-if="examType === 'writing'">
          <div class="exam-header">
            <span class="exam-part">Task {{ currentPart + 1 }} / 2</span>
            <div class="exam-timer" :class="{ warning: timerSeconds <= 60 }">
              {{ formatTime(timerSeconds) }}
            </div>
          </div>

          <div class="exam-question">
            <h3>Task {{ writingTasksList[currentPart].type }}</h3>
            <p class="exam-q-text">{{ typeof writingTasksList[currentPart].task === 'string' ? writingTasksList[currentPart].task : (writingTasksList[currentPart].task.task || writingTasksList[currentPart].task.question || '') }}</p>
          </div>

          <textarea
            v-model="writingEssays[currentPart]"
            class="exam-textarea"
            :placeholder="themeStore.lang === 'zh' ? '在此输入你的作文...' : 'Write your essay here...'"
            rows="16"
          ></textarea>

          <div class="exam-word-count">
            {{ (writingEssays[currentPart] || '').split(/\s+/).filter(w => w).length }} {{ themeStore.lang === 'zh' ? '词' : 'words' }}
          </div>

          <button class="next-btn" @click="nextWritingPart">
            {{ currentPart < 1 ? (themeStore.lang === 'zh' ? '下一部分' : 'Next Task') : (themeStore.lang === 'zh' ? '提交考试' : 'Submit Exam') }}
          </button>
        </template>
      </div>

      <!-- Loading -->
      <div v-if="speakingLoading || writingLoading" class="exam-loading">
        <div class="loading-spinner"></div>
        <p>{{ themeStore.lang === 'zh' ? 'AI 评分中，请稍候...' : 'AI is scoring, please wait...' }}</p>
      </div>

      <!-- Results -->
      <div v-if="examPhase === 'result'" class="exam-results">
        <h2>{{ themeStore.lang === 'zh' ? '模考报告' : 'Mock Exam Report' }}</h2>

        <!-- Speaking results -->
        <template v-if="examType === 'speaking' && speakingResults">
          <div class="report-overview">
            <div class="report-score">
              <span class="report-score-num" :style="{ color: getScoreColor(speakingResults.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / speakingResults.filter(r => r.overall > 0).length) }">
                {{ (speakingResults.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / speakingResults.filter(r => r.overall > 0).length).toFixed(1) }}
              </span>
              <span class="report-score-label">{{ themeStore.lang === 'zh' ? '总分' : 'Overall' }}</span>
            </div>
          </div>

          <div v-for="(result, i) in speakingResults" :key="i" class="report-part">
            <h3>Part {{ result.part }} — {{ result.question }}</h3>
            <p class="report-answer">{{ result.answer || (themeStore.lang === 'zh' ? '未作答' : 'No answer') }}</p>
            <div v-if="result.overall > 0" class="report-dims">
              <span class="report-dim">Fluency: {{ result.fluency?.score }}</span>
              <span class="report-dim">Lexical: {{ result.lexical?.score }}</span>
              <span class="report-dim">Grammar: {{ result.grammar?.score }}</span>
              <span class="report-dim">Pronunciation: {{ result.pronunciation?.score }}</span>
            </div>
            <p v-if="result.suggestions?.length" class="report-suggestions">{{ result.suggestions.join(' | ') }}</p>
          </div>
        </template>

        <!-- Writing results -->
        <template v-if="examType === 'writing' && writingResults">
          <div class="report-overview">
            <div class="report-score">
              <span class="report-score-num" :style="{ color: getScoreColor(writingResults.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / writingResults.filter(r => r.overall > 0).length) }">
                {{ (writingResults.filter(r => r.overall > 0).reduce((s, r) => s + r.overall, 0) / writingResults.filter(r => r.overall > 0).length).toFixed(1) }}
              </span>
              <span class="report-score-label">{{ themeStore.lang === 'zh' ? '总分' : 'Overall' }}</span>
            </div>
          </div>

          <div v-for="(result, i) in writingResults" :key="i" class="report-part">
            <h3>Task {{ result.type }}</h3>
            <p class="report-answer">{{ (result.essay || '').substring(0, 200) }}...</p>
            <div v-if="result.overall > 0" class="report-dims">
              <span class="report-dim">Task Response: {{ result.taskResponse?.score }}</span>
              <span class="report-dim">Coherence: {{ result.coherence?.score }}</span>
              <span class="report-dim">Lexical: {{ result.lexical?.score }}</span>
              <span class="report-dim">Grammar: {{ result.grammar?.score }}</span>
            </div>
            <div v-if="result.strengths?.length" class="report-strengths">
              <strong>{{ themeStore.lang === 'zh' ? '优点' : 'Strengths' }}:</strong> {{ result.strengths.join(', ') }}
            </div>
            <div v-if="result.weaknesses?.length" class="report-weaknesses">
              <strong>{{ themeStore.lang === 'zh' ? '问题' : 'Weaknesses' }}:</strong> {{ result.weaknesses.join(', ') }}
            </div>
            <div v-if="result.actionPlan?.length" class="report-actions">
              <strong>{{ themeStore.lang === 'zh' ? '行动计划' : 'Action Plan' }}:</strong> {{ result.actionPlan.join(' | ') }}
            </div>
          </div>
        </template>

        <button class="start-btn" @click="resetExam">
          {{ themeStore.lang === 'zh' ? '再来一次' : 'Try Again' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.mock-page h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
  margin-bottom: var(--space-xl);
}

/* Select */
.exam-select {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  max-width: 600px;
}

.exam-option {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  cursor: pointer;
  text-align: center;
  transition: all var(--transition-fast);
}

.exam-option:hover {
  border-color: var(--blue);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.exam-icon { font-size: 2.5rem; display: block; margin-bottom: var(--space-md); }
.exam-option h3 { font-weight: 700; margin-bottom: 8px; }
.exam-option p { font-size: var(--font-size-xs); color: var(--text-secondary); line-height: 1.5; }

/* Intro */
.exam-intro {
  max-width: 500px;
}

.intro-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.intro-card h2 { font-weight: 700; margin-bottom: var(--space-lg); }

.intro-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: var(--space-lg);
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.flow-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--black);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

[data-theme="dark"] .flow-num { background: var(--white); color: var(--black); }

.intro-note {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xl);
  line-height: 1.5;
}

.start-btn {
  width: 100%;
  padding: 14px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
}

[data-theme="dark"] .start-btn { background: var(--white); color: var(--black); }

.cancel-btn {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background: none;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* Active exam */
.exam-active {
  max-width: 700px;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.exam-part {
  font-weight: 700;
  font-size: var(--font-size-lg);
}

.exam-timer {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  padding: 8px 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.exam-timer.warning {
  background: var(--red-soft);
  color: var(--red);
  animation: pulse-border 1s infinite;
}

@keyframes pulse-border {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.exam-question {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.exam-question h3 { font-weight: 700; margin-bottom: var(--space-md); }
.exam-q-text { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; }

.exam-cue {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.exam-record {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.record-btn {
  padding: 14px 32px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
  background: var(--blue);
  color: white;
  transition: all var(--transition-fast);
}

.record-btn.recording {
  background: var(--red);
  animation: pulse-red 1.5s infinite;
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(248, 113, 113, 0); }
}

.record-btn:disabled { opacity: 0.5; }

.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: var(--space-md) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--red);
}

.rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--red);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.exam-transcript {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: left;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  min-height: 60px;
  margin-top: var(--space-md);
}

.interim { color: var(--text-tertiary); }

.exam-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  background: transparent;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  font-family: var(--font-family);
}

.exam-textarea:focus { border-color: var(--blue); }

.exam-word-count {
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 8px;
  margin-bottom: var(--space-lg);
}

.next-btn {
  width: 100%;
  padding: 14px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
}

[data-theme="dark"] .next-btn { background: var(--white); color: var(--black); }

/* Loading */
.exam-loading {
  text-align: center;
  padding: var(--space-3xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin { to { transform: rotate(360deg); } }

.exam-loading p { color: var(--text-secondary); }

/* Results */
.exam-results {
  max-width: 700px;
}

.exam-results h2 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}

.report-overview {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.report-score-num {
  font-size: 48px;
  font-weight: 800;
  display: block;
}

.report-score-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.report-part {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-md);
}

.report-part h3 { font-weight: 700; margin-bottom: var(--space-md); font-size: var(--font-size-base); }

.report-answer {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  line-height: 1.6;
}

.report-dims {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: var(--space-md);
}

.report-dim {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.report-suggestions, .report-strengths, .report-weaknesses, .report-actions {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.report-actions {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .exam-select { grid-template-columns: 1fr; }
}
</style>
