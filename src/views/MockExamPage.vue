<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const speakingAudioUrls = ref({})
const speakingResults = ref(null)
const speakingLoading = ref(false)

// Part 2 timer phases
const part2Phase = ref(null) // 'prep' | 'speaking' | null

// Writing mock state
const writingTasksList = ref([])
const writingEssays = ref({})
const writingResults = ref(null)
const writingLoading = ref(false)

// Overall
const mockStartTime = ref(null)
const mockEndTime = ref(null)

// Score trend
const mockScoreHistory = ref([])

onMounted(() => {
  mockScoreHistory.value = JSON.parse(localStorage.getItem('mamio-mock-scores') || '[]')
})

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
  part2Phase.value = null
  // Save current answer + audio
  speakingAnswers.value[currentPart.value] = transcript.value
  if (audioUrl.value) speakingAudioUrls.value[currentPart.value] = audioUrl.value
  if (isListening.value) stop()
  if (isRecording.value) stopRecording()
  reset()

  if (currentPart.value < 2) {
    currentPart.value++
    if (currentPart.value === 1) {
      // Part 2: 1 min prep then 2 min speaking
      startPart2Prep()
    } else {
      // Part 3: 4-5 min
      startTimer(300)
    }
  } else {
    submitSpeakingMock()
  }
}

function startPart2Prep() {
  part2Phase.value = 'prep'
  timerSeconds.value = 60
  timerRunning.value = true
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval)
      startPart2Speaking()
    }
  }, 1000)
}

function startPart2Speaking() {
  part2Phase.value = 'speaking'
  timerSeconds.value = 120
  // Auto-start recording
  reset()
  start()
  startRecording()
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval)
      timerRunning.value = false
      part2Phase.value = null
      if (isListening.value) stop()
      if (isRecording.value) stopRecording()
    }
  }, 1000)
}

async function submitSpeakingMock() {
  stopTimer()
  part2Phase.value = null
  speakingAnswers.value[currentPart.value] = transcript.value
  if (audioUrl.value) speakingAudioUrls.value[currentPart.value] = audioUrl.value
  if (isListening.value) stop()
  if (isRecording.value) stopRecording()
  mockEndTime.value = Date.now()
  speakingLoading.value = true

  try {
    const results = []
    for (let i = 0; i < speakingQuestions.value.length; i++) {
      const q = speakingQuestions.value[i]
      const answer = speakingAnswers.value[i] || ''
      if (answer.trim()) {
        const result = await scoreSpeaking(q.question, answer, q.part)
        results.push({ part: q.part, question: q.question, answer, audioUrl: speakingAudioUrls.value[i] || null, ...result })
      } else {
        results.push({ part: q.part, question: q.question, answer, audioUrl: null, overall: 0, fluency: { score: 0, comment: 'No answer' }, lexical: { score: 0, comment: '' }, grammar: { score: 0, comment: '' }, pronunciation: { score: 0, comment: '' } })
      }
    }
    speakingResults.value = results
    examPhase.value = 'result'

    // Save to history
    const validResults = results.filter(r => r.overall > 0)
    const avgScore = validResults.length > 0 ? validResults.reduce((s, r) => s + r.overall, 0) / validResults.length : 0
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

    // Save score trend
    const scoreEntry = {
      date: new Date().toISOString(),
      type: 'speaking',
      overall: Math.round(avgScore * 10) / 10,
      fluency: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.fluency?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      lexical: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.lexical?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      grammar: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.grammar?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      pronunciation: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.pronunciation?.score || 0), 0) / validResults.length * 10) / 10 : 0
    }
    mockScoreHistory.value.unshift(scoreEntry)
    if (mockScoreHistory.value.length > 20) mockScoreHistory.value.length = 20
    localStorage.setItem('mamio-mock-scores', JSON.stringify(mockScoreHistory.value))
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

    const validResults = results.filter(r => r.overall > 0)
    const avgScore = validResults.length > 0 ? validResults.reduce((s, r) => s + r.overall, 0) / validResults.length : 0
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

    // Save score trend
    const scoreEntry = {
      date: new Date().toISOString(),
      type: 'writing',
      overall: Math.round(avgScore * 10) / 10,
      taskResponse: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.taskResponse?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      coherence: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.coherence?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      lexical: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.lexical?.score || 0), 0) / validResults.length * 10) / 10 : 0,
      grammar: validResults.length ? Math.round(validResults.reduce((s, r) => s + (r.grammar?.score || 0), 0) / validResults.length * 10) / 10 : 0
    }
    mockScoreHistory.value.unshift(scoreEntry)
    if (mockScoreHistory.value.length > 20) mockScoreHistory.value.length = 20
    localStorage.setItem('mamio-mock-scores', JSON.stringify(mockScoreHistory.value))
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

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

// Score trend chart data (last 10 attempts)
const trendData = computed(() => {
  const relevant = mockScoreHistory.value
    .filter(e => e.type === examType.value)
    .slice(0, 10)
    .reverse()
  if (relevant.length < 2) return null
  return relevant
})

function trendBarHeight(score) {
  return Math.max(4, (score / 9) * 100)
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

          <!-- Part 2 prep phase indicator -->
          <div v-if="currentPart === 1 && part2Phase === 'prep'" class="prep-notice">
            <div class="prep-icon">📝</div>
            <p class="prep-text">{{ themeStore.lang === 'zh' ? '准备时间 — 可以做笔记，不要说话' : 'Preparation time — make notes, do not speak' }}</p>
            <p class="prep-hint">{{ themeStore.lang === 'zh' ? '录音将在准备时间结束后自动开始' : 'Recording will start automatically when prep time ends' }}</p>
          </div>

          <div class="exam-record">
            <!-- Part 2: auto-record during speaking phase, manual for other parts -->
            <template v-if="currentPart === 1">
              <div v-if="part2Phase === 'speaking'" class="recording-indicator active-recording">
                <span class="rec-dot"></span>
                <span>{{ themeStore.lang === 'zh' ? '正在录音...' : 'Recording...' }}</span>
                <span v-if="isRecording">{{ formatDuration(recordingDuration) }}</span>
              </div>
              <div v-if="transcript" class="exam-transcript">
                {{ transcript }}<span class="interim">{{ interimTranscript }}</span>
              </div>
            </template>
            <template v-else>
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
            </template>
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

          <!-- Score trend chart -->
          <div v-if="trendData" class="trend-section">
            <h3>{{ themeStore.lang === 'zh' ? '分数趋势' : 'Score Trend' }}</h3>
            <div class="trend-chart">
              <div v-for="(entry, i) in trendData" :key="i" class="trend-bar-group">
                <div class="trend-bar" :style="{ height: trendBarHeight(entry.overall) + '%', background: getScoreColor(entry.overall) }">
                  <span class="trend-value">{{ entry.overall }}</span>
                </div>
                <span class="trend-date">{{ formatDate(entry.date).split(' ')[0] }}</span>
              </div>
            </div>
          </div>

          <div v-for="(result, i) in speakingResults" :key="i" class="report-part">
            <h3>Part {{ result.part }} — {{ result.question }}</h3>
            <!-- Transcript replay -->
            <div class="replay-section">
              <p class="report-answer">{{ result.answer || (themeStore.lang === 'zh' ? '未作答' : 'No answer') }}</p>
              <div v-if="result.audioUrl" class="replay-audio">
                <audio :src="result.audioUrl" controls class="audio-player-mini"></audio>
              </div>
            </div>
            <div v-if="result.overall > 0" class="report-dims">
              <span class="report-dim">Fluency: {{ result.fluency?.score }}</span>
              <span class="report-dim">Lexical: {{ result.lexical?.score }}</span>
              <span class="report-dim">Grammar: {{ result.grammar?.score }}</span>
              <span class="report-dim">Pronunciation: {{ result.pronunciation?.score }}</span>
            </div>
            <p v-if="result.suggestions?.length" class="report-suggestions">{{ result.suggestions.join(' | ') }}</p>
            <p v-if="result.improvedAnswer" class="report-improved"><strong>{{ themeStore.lang === 'zh' ? '示范：' : 'Model: ' }}</strong>{{ result.improvedAnswer }}</p>
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

          <!-- Score trend chart -->
          <div v-if="trendData" class="trend-section">
            <h3>{{ themeStore.lang === 'zh' ? '分数趋势' : 'Score Trend' }}</h3>
            <div class="trend-chart">
              <div v-for="(entry, i) in trendData" :key="i" class="trend-bar-group">
                <div class="trend-bar" :style="{ height: trendBarHeight(entry.overall) + '%', background: getScoreColor(entry.overall) }">
                  <span class="trend-value">{{ entry.overall }}</span>
                </div>
                <span class="trend-date">{{ formatDate(entry.date).split(' ')[0] }}</span>
              </div>
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

.report-improved {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
  margin-top: 8px;
}

/* Part 2 prep notice */
.prep-notice {
  background: var(--blue-soft);
  border: 1px solid var(--blue);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: center;
  margin-bottom: var(--space-lg);
}

.prep-icon { font-size: 2rem; margin-bottom: 8px; }
.prep-text { font-weight: 600; margin-bottom: 4px; }
.prep-hint { font-size: var(--font-size-xs); color: var(--text-tertiary); }

.active-recording {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: var(--space-md);
  background: var(--red-soft);
  border-radius: var(--radius-sm);
}

/* Replay section */
.replay-section {
  margin-bottom: var(--space-md);
}

.replay-audio {
  margin-top: 8px;
}

.audio-player-mini {
  width: 100%;
  max-width: 400px;
  height: 36px;
}

/* Score trend */
.trend-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.trend-section h3 {
  font-weight: 700;
  font-size: var(--font-size-base);
  margin-bottom: var(--space-lg);
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 140px;
  padding-bottom: 28px;
  position: relative;
}

.trend-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.trend-bar {
  width: 100%;
  max-width: 40px;
  min-height: 4px;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: height 0.3s;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.trend-value {
  font-size: 11px;
  font-weight: 700;
  color: white;
  padding-top: 4px;
}

.trend-date {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 6px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .exam-select { grid-template-columns: 1fr; }
  .trend-chart { gap: 6px; }
  .trend-value { font-size: 9px; }
  .trend-date { font-size: 9px; }
}
</style>
