<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { speakingTopics } from '../data/ielts/speaking'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { scoreSpeaking, speakingConversation } from '../services/ai'
import { getSpeakingHistory, addSpeakingRecord } from '../services/progress'
import { addReviewItemsFromFeedback } from '../services/reviewItems'

const themeStore = useThemeStore()
const router = useRouter()
const {
  isListening, transcript, interimTranscript, error: speechError, isSupported,
  isRecording, audioUrl, recordingDuration,
  wordConfidences, overallConfidence,
  start, stop, reset, startRecording, stopRecording, clearRecording
} = useSpeechRecognition()

const activePart = ref(1)
const selectedTopic = ref(null)
const selectedQuestion = ref('')
const showResult = ref(false)
const aiResult = ref(null)
const loading = ref(false)
const showSample = ref(false)

// Mode: 'practice' or 'conversation'
const mode = ref('practice')
const topicFilter = ref('all')

// Conversation state
const convMessages = ref([])
const convLoading = ref(false)
const convEnded = ref(false)
const convScrollRef = ref(null)

// Timer state
const timerPhase = ref(null)
const timerSeconds = ref(0)
let timerInterval = null

// History
const history = ref([])
const showHistory = ref(false)

onMounted(async () => {
  try {
    const data = await getSpeakingHistory()
    history.value = data
    localStorage.setItem('mamio-speaking-history', JSON.stringify(data))
  } catch {
    history.value = JSON.parse(localStorage.getItem('mamio-speaking-history') || '[]')
  }
})

const topics = computed(() => {
  if (activePart.value === 1) return speakingTopics.part1
  if (activePart.value === 2) return speakingTopics.part2
  return speakingTopics.part3
})

const highFrequencyTopics = {
  1: new Set(['Work / Study', 'Hometown', 'Daily Routine', 'Travel', 'Social Media', 'Friends']),
  2: new Set([
    'Describe a person who has influenced you',
    'Describe a place you would like to visit',
    'Describe a skill you would like to learn',
    'Describe something you bought that you were unhappy with'
  ]),
  3: new Set(['Education', 'Technology', 'Environment', 'Work & Career', 'Health & Lifestyle'])
}

const practisedTopicKeys = computed(() => new Set(
  history.value
    .filter(item => Number(item.part) === activePart.value && item.topic)
    .map(item => item.topic)
))

const topicStats = computed(() => {
  const total = topics.value.length
  const done = topics.value.filter(topic => practisedTopicKeys.value.has(topic.topic)).length
  const highFrequency = topics.value.filter(topic => highFrequencyTopics[activePart.value]?.has(topic.topic)).length
  const highFrequencyDone = topics.value.filter(topic => (
    highFrequencyTopics[activePart.value]?.has(topic.topic) && practisedTopicKeys.value.has(topic.topic)
  )).length
  return { total, done, highFrequency, highFrequencyDone }
})

const visibleTopics = computed(() => {
  if (topicFilter.value === 'done') {
    return topics.value.filter(topic => practisedTopicKeys.value.has(topic.topic))
  }
  if (topicFilter.value === 'new') {
    return topics.value.filter(topic => !practisedTopicKeys.value.has(topic.topic))
  }
  if (topicFilter.value === 'high') {
    return topics.value.filter(topic => highFrequencyTopics[activePart.value]?.has(topic.topic))
  }
  return topics.value
})

const recommendedTopic = computed(() => {
  const highNew = topics.value.find(topic => (
    highFrequencyTopics[activePart.value]?.has(topic.topic) && !practisedTopicKeys.value.has(topic.topic)
  ))
  if (highNew) return highNew
  return topics.value.find(topic => !practisedTopicKeys.value.has(topic.topic)) || topics.value[0] || null
})

const recommendationText = computed(() => {
  if (!recommendedTopic.value) return ''
  if (themeStore.lang === 'zh') {
    return `本 Part 已练 ${topicStats.value.done}/${topicStats.value.total} 个话题，高频话题 ${topicStats.value.highFrequencyDone}/${topicStats.value.highFrequency}。建议下一题：${recommendedTopic.value.topic}。`
  }
  return `Part coverage ${topicStats.value.done}/${topicStats.value.total}; high-frequency coverage ${topicStats.value.highFrequencyDone}/${topicStats.value.highFrequency}. Next: ${recommendedTopic.value.topic}.`
})

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function selectTopic(topic) {
  selectedTopic.value = topic
  selectedQuestion.value = activePart.value === 2 ? topic.cueCard : topic.questions[0]
  showResult.value = false
  aiResult.value = null
  showSample.value = false
  convMessages.value = []
  convEnded.value = false
  reset()
  clearTimer()
}

function selectRecommendedTopic() {
  if (!recommendedTopic.value) return
  topicFilter.value = 'all'
  selectTopic(recommendedTopic.value)
}

function selectQuestion(q) {
  selectedQuestion.value = q
  showResult.value = false
  aiResult.value = null
  convMessages.value = []
  convEnded.value = false
  reset()
  clearTimer()
}

// Part 2 Timer
function startPrepTimer() {
  clearTimer()
  timerPhase.value = 'prep'
  timerSeconds.value = 60
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval)
      startSpeakingTimer()
    }
  }, 1000)
}

function startSpeakingTimer() {
  timerPhase.value = 'speaking'
  timerSeconds.value = 120
  if (!isListening.value && !isRecording.value) {
    toggleRecording()
  }
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval)
      timerPhase.value = null
      if (isListening.value) toggleRecording()
      if (isRecording.value) stopRecording()
    }
  }, 1000)
}

function clearTimer() {
  clearInterval(timerInterval)
  timerPhase.value = null
  timerSeconds.value = 0
}

function toggleRecording() {
  if (isListening.value) {
    stop()
    stopRecording()
  } else {
    reset()
    start()
    startRecording()
  }
}

// Practice mode: submit for scoring
async function submitForScoring(fullAnswer) {
  const answerText = fullAnswer || transcript.value
  if (!answerText.trim()) return
  loading.value = true
  try {
    aiResult.value = await scoreSpeaking(selectedQuestion.value, answerText, activePart.value, wordConfidences.value, themeStore.lang)
    showResult.value = true
    if (fullAnswer) {
      // Conversation mode ended — save with conversation history
      saveConvToHistory(aiResult.value)
    } else {
      saveToHistory()
    }
  } catch (e) {
    aiResult.value = { error: e.response?.data?.error || '评分失败，请稍后重试' }
    showResult.value = true
  } finally {
    loading.value = false
  }
}

// Conversation mode: start conversation
function startConversation() {
  convMessages.value = []
  convEnded.value = false
  // AI's first message is the question itself
  convMessages.value.push({
    role: 'examiner',
    content: selectedQuestion.value
  })
  scrollConv()
}

// Conversation mode: submit answer
async function submitConvAnswer() {
  if (!transcript.value.trim()) return

  const userText = transcript.value
  convMessages.value.push({ role: 'user', content: userText })
  reset()
  clearRecording()
  convLoading.value = true
  scrollConv()

  try {
    const result = await speakingConversation(
      selectedQuestion.value,
      convMessages.value.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      userText,
      activePart.value,
      themeStore.lang
    )

    if (result.type === 'followup') {
      convMessages.value.push({ role: 'examiner', content: result.question })
    } else if (result.type === 'score') {
      convMessages.value.push({ role: 'examiner', content: '__SCORE__', scoreData: result })
      convEnded.value = true
      // Save to history
      saveConvToHistory(result)
    }
  } catch (e) {
    convMessages.value.push({
      role: 'examiner',
      content: themeStore.lang === 'zh' ? 'AI 对话失败，请重试' : 'AI conversation failed, please retry'
    })
  } finally {
    convLoading.value = false
    scrollConv()
  }
}

function scrollConv() {
  nextTick(() => {
    if (convScrollRef.value) {
      convScrollRef.value.scrollTop = convScrollRef.value.scrollHeight
    }
  })
}

function endConversation() {
  // Concatenate all user messages for full context scoring
  const fullAnswer = convMessages.value
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n')
  convEnded.value = true
  submitForScoring(fullAnswer)
}

async function saveToHistory() {
  const entry = {
    mode: 'practice',
    part: activePart.value,
    topic: selectedTopic.value.topic,
    question: selectedQuestion.value,
    answer: transcript.value,
    score: aiResult.value?.overall || null,
    details: aiResult.value?.error ? null : aiResult.value
  }
  try {
    const result = await addSpeakingRecord(entry)
    entry.id = result.id
    entry.date = new Date().toISOString()
  } catch {
    entry.id = Date.now()
    entry.date = new Date().toISOString()
  }
  history.value.unshift(entry)
  if (history.value.length > 50) history.value = history.value.slice(0, 50)
  localStorage.setItem('mamio-speaking-history', JSON.stringify(history.value))
  addReviewItemsFromFeedback(aiResult.value, { module: 'speaking', source: 'speaking-practice' })
  // Also save pronunciation words as review items
  if (aiResult.value?.pronunciationWords?.length) {
    addReviewItemsFromFeedback({
      reviewItems: aiResult.value.pronunciationWords.map(pw => ({
        type: 'pronunciation',
        text: pw.word,
        reason: pw.issue || pw.tip || ''
      }))
    }, { module: 'speaking', source: 'pronunciation' })
  }
}

async function saveConvToHistory(scoreData) {
  const allAnswers = convMessages.value
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' | ')
  const entry = {
    mode: 'conversation',
    part: activePart.value,
    topic: selectedTopic.value.topic,
    question: selectedQuestion.value,
    answer: allAnswers,
    score: scoreData?.overall || null,
    details: scoreData,
    exchanges: convMessages.value.filter(m => m.role === 'user').length
  }
  try {
    const result = await addSpeakingRecord(entry)
    entry.id = result.id
    entry.date = new Date().toISOString()
  } catch {
    entry.id = Date.now()
    entry.date = new Date().toISOString()
  }
  history.value.unshift(entry)
  if (history.value.length > 50) history.value = history.value.slice(0, 50)
  localStorage.setItem('mamio-speaking-history', JSON.stringify(history.value))
  addReviewItemsFromFeedback(scoreData, { module: 'speaking', source: 'speaking-conversation' })
  if (scoreData?.pronunciationWords?.length) {
    addReviewItemsFromFeedback({
      reviewItems: scoreData.pronunciationWords.map(pw => ({
        type: 'pronunciation',
        text: pw.word,
        reason: pw.issue || pw.tip || ''
      }))
    }, { module: 'speaking', source: 'pronunciation' })
  }
}

function deleteHistory(id) {
  history.value = history.value.filter(h => h.id !== id)
  localStorage.setItem('mamio-speaking-history', JSON.stringify(history.value))
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

watch(activePart, () => {
  selectedTopic.value = null
  topicFilter.value = 'all'
  clearTimer()
  convMessages.value = []
  convEnded.value = false
})

watch(mode, () => {
  convMessages.value = []
  convEnded.value = false
  showResult.value = false
  aiResult.value = null
  reset()
})
</script>

<template>
  <div class="speaking-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ themeStore.lang === 'zh' ? '雅思口语练习' : 'IELTS Speaking Practice' }}</h1>
        <button class="history-btn" @click="showHistory = !showHistory">
          {{ showHistory ? (themeStore.lang === 'zh' ? '返回练习' : 'Back to Practice') : (themeStore.lang === 'zh' ? '练习记录' : 'History') }}
          <span v-if="history.length" class="history-count">{{ history.length }}</span>
        </button>
      </div>

      <!-- History Panel -->
      <div v-if="showHistory" class="history-panel">
        <div v-if="history.length === 0" class="empty-history">
          <p>{{ themeStore.lang === 'zh' ? '还没有练习记录，开始练习吧！' : 'No practice history yet. Start practicing!' }}</p>
        </div>
        <div v-else class="history-list">
          <div v-for="h in history" :key="h.id" class="history-item">
            <div class="history-top">
              <span class="history-part">Part {{ h.part }}</span>
              <span v-if="h.mode === 'conversation'" class="history-mode-tag">{{ themeStore.lang === 'zh' ? '对话' : 'Conv' }}</span>
              <span class="history-topic">{{ h.topic }}</span>
              <span v-if="h.score" class="history-score" :style="{ color: getScoreColor(h.score) }">Band {{ h.score }}</span>
              <span class="history-date">{{ formatDate(h.date) }}</span>
              <button class="history-delete" @click="deleteHistory(h.id)">×</button>
            </div>
            <p class="history-question">{{ h.question }}</p>
            <p class="history-answer">{{ h.answer }}</p>
          </div>
        </div>
      </div>

      <!-- Practice Area -->
      <template v-if="!showHistory">
        <!-- Part selector + Mode toggle -->
        <div class="controls-row">
          <div class="part-tabs">
            <button v-for="p in [1,2,3]" :key="p" class="part-btn" :class="{ active: activePart === p }" @click="activePart = p; selectedTopic = null">
              Part {{ p }}
            </button>
          </div>
          <div class="mode-toggle">
            <button class="mode-btn" :class="{ active: mode === 'practice' }" @click="mode = 'practice'">
              {{ themeStore.lang === 'zh' ? '练习模式' : 'Practice' }}
            </button>
            <button class="mode-btn" :class="{ active: mode === 'conversation' }" @click="mode = 'conversation'">
              {{ themeStore.lang === 'zh' ? 'AI 对话' : 'AI Chat' }}
            </button>
          </div>
        </div>

        <div class="speaking-cockpit">
          <div class="topic-map-card">
            <div class="topic-map-head">
              <div>
                <span class="topic-map-kicker">{{ themeStore.lang === 'zh' ? '口语题库' : 'Speaking bank' }}</span>
                <h2>{{ themeStore.lang === 'zh' ? `Part ${activePart} 练习地图` : `Part ${activePart} practice map` }}</h2>
              </div>
              <button class="topic-recommend-btn" @click="selectRecommendedTopic" :disabled="!recommendedTopic">
                {{ themeStore.lang === 'zh' ? '练推荐话题' : 'Practise pick' }}
              </button>
            </div>
            <p v-if="recommendedTopic" class="topic-map-copy">{{ recommendationText }}</p>
            <div class="topic-filter-row">
              <button class="topic-filter" :class="{ active: topicFilter === 'all' }" @click="topicFilter = 'all'">
                <span>{{ themeStore.lang === 'zh' ? '全部' : 'All' }}</span>
                <strong>{{ topicStats.done }}/{{ topicStats.total }}</strong>
              </button>
              <button class="topic-filter" :class="{ active: topicFilter === 'high' }" @click="topicFilter = 'high'">
                <span>{{ themeStore.lang === 'zh' ? '高频' : 'High freq' }}</span>
                <strong>{{ topicStats.highFrequencyDone }}/{{ topicStats.highFrequency }}</strong>
              </button>
              <button class="topic-filter" :class="{ active: topicFilter === 'new' }" @click="topicFilter = 'new'">
                <span>{{ themeStore.lang === 'zh' ? '未练' : 'New' }}</span>
                <strong>{{ topicStats.total - topicStats.done }}</strong>
              </button>
              <button class="topic-filter" :class="{ active: topicFilter === 'done' }" @click="topicFilter = 'done'">
                <span>{{ themeStore.lang === 'zh' ? '已练' : 'Done' }}</span>
                <strong>{{ topicStats.done }}</strong>
              </button>
            </div>
          </div>
        </div>

        <div class="speaking-layout">
          <!-- Topic list -->
          <div class="topic-sidebar">
            <div
              v-for="(topic, i) in visibleTopics"
              :key="`${activePart}-${topic.topic}-${i}`"
              class="topic-item"
              :class="{ active: selectedTopic === topic, completed: practisedTopicKeys.has(topic.topic) }"
              @click="selectTopic(topic)"
            >
              <span class="topic-label">{{ activePart === 2 ? topic.topic : (topic.topic || (themeStore.lang === 'zh' ? '话题' : 'Topic')) }}</span>
              <div class="topic-badges">
                <span v-if="highFrequencyTopics[activePart]?.has(topic.topic)" class="topic-badge high">{{ themeStore.lang === 'zh' ? '高频' : 'High' }}</span>
                <span v-if="practisedTopicKeys.has(topic.topic)" class="topic-badge done">{{ themeStore.lang === 'zh' ? '已练' : 'Done' }}</span>
              </div>
            </div>
            <div v-if="!visibleTopics.length" class="topic-empty">
              {{ themeStore.lang === 'zh' ? '这个筛选下暂无话题' : 'No topics in this filter' }}
            </div>
          </div>

          <!-- Main area -->
          <div class="speaking-main">
            <template v-if="selectedTopic">
              <!-- Question display -->
              <div class="question-card">
                <h3 v-if="activePart === 2">{{ selectedTopic.topic }}</h3>
                <div v-if="activePart === 2" class="cue-card">
                  <pre>{{ selectedTopic.cueCard }}</pre>
                </div>
                <div v-else class="question-list">
                  <button v-for="(q, i) in selectedTopic.questions" :key="i" class="q-btn" :class="{ active: selectedQuestion === q }" @click="selectQuestion(q)">
                    {{ q }}
                  </button>
                </div>
              </div>

              <!-- ===== PRACTICE MODE ===== -->
              <template v-if="mode === 'practice'">
                <!-- Part 2 Timer -->
                <div v-if="activePart === 2" class="timer-section">
                  <div v-if="!timerPhase" class="timer-actions">
                    <button class="timer-btn" @click="startPrepTimer">
                      {{ themeStore.lang === 'zh' ? '开始计时 (1分钟准备 + 2分钟作答)' : 'Start Timer (1min prep + 2min speaking)' }}
                    </button>
                  </div>
                  <div v-else class="timer-display" :class="{ warning: timerSeconds <= 10 }">
                    <div class="timer-phase">
                      {{ timerPhase === 'prep' ? (themeStore.lang === 'zh' ? '准备时间' : 'Preparation Time') : (themeStore.lang === 'zh' ? '作答时间' : 'Speaking Time') }}
                    </div>
                    <div class="timer-countdown">{{ formatTime(timerSeconds) }}</div>
                    <button class="timer-stop" @click="clearTimer">{{ themeStore.lang === 'zh' ? '停止计时' : 'Stop Timer' }}</button>
                  </div>
                </div>

                <!-- Recording area -->
                <div class="record-area">
                  <p class="current-question" v-if="activePart !== 2">{{ selectedQuestion }}</p>

                  <div class="record-controls">
                    <button class="record-btn" :class="{ recording: isListening }" @click="toggleRecording" :disabled="!isSupported">
                      {{ isListening ? '⏹ ' + (themeStore.lang === 'zh' ? '停止录音' : 'Stop') : '🎤 ' + (themeStore.lang === 'zh' ? '开始录音' : 'Start Recording') }}
                    </button>
                    <p v-if="!isSupported" class="speech-error">{{ themeStore.lang === 'zh' ? '浏览器不支持语音识别，请使用 Chrome' : 'Speech recognition not supported, use Chrome' }}</p>
                    <p v-if="speechError" class="speech-error">{{ speechError }}</p>
                  </div>

                  <div v-if="isRecording" class="recording-indicator">
                    <span class="rec-dot"></span>
                    <span>{{ formatDuration(recordingDuration) }}</span>
                  </div>

                  <div v-if="audioUrl && !isListening" class="audio-playback">
                    <audio :src="audioUrl" controls class="audio-player"></audio>
                  </div>

                  <div v-if="transcript || interimTranscript" class="transcript-box">
                    <p class="transcript-text">{{ transcript }}<span class="interim">{{ interimTranscript }}</span></p>
                  </div>

                  <button v-if="transcript && !isListening" class="submit-btn" @click="submitForScoring" :disabled="loading">
                    {{ loading ? (themeStore.lang === 'zh' ? 'AI 评分中...' : 'AI Scoring...') : (themeStore.lang === 'zh' ? 'AI 评分' : 'Get AI Score') }}
                  </button>
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
                      <div v-for="(dim, key) in { fluency: aiResult.fluency, lexical: aiResult.lexical, grammar: aiResult.grammar, pronunciation: aiResult.pronunciation }" :key="key" class="dim-item">
                        <div class="dim-header">
                          <span class="dim-name">{{ { fluency: themeStore.lang === 'zh' ? '流利度' : 'Fluency', lexical: themeStore.lang === 'zh' ? '词汇' : 'Lexical', grammar: themeStore.lang === 'zh' ? '语法' : 'Grammar', pronunciation: themeStore.lang === 'zh' ? '发音' : 'Pronunciation' }[key] }}</span>
                          <span class="dim-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
                        </div>
                        <p class="dim-comment">{{ dim.comment }}</p>
                      </div>
                    </div>
                    <div v-if="aiResult.suggestions?.length" class="suggestions">
                      <h4>{{ themeStore.lang === 'zh' ? '改进建议' : 'Suggestions' }}</h4>
                      <ul><li v-for="s in aiResult.suggestions" :key="s">{{ s }}</li></ul>
                    </div>
                    <div v-if="aiResult.improvedAnswer" class="improved-answer">
                      <h4>{{ themeStore.lang === 'zh' ? '示范回答' : 'Improved Answer' }}</h4>
                      <p>{{ aiResult.improvedAnswer }}</p>
                    </div>

                    <div v-if="aiResult.pronunciationWords?.length" class="pronunciation-section">
                      <h4>{{ themeStore.lang === 'zh' ? '发音提示' : 'Pronunciation Tips' }}</h4>
                      <div class="pronunciation-words">
                        <div v-for="pw in aiResult.pronunciationWords" :key="pw.word" class="pronunciation-word">
                          <span class="pw-word">{{ pw.word }}</span>
                          <span class="pw-issue">{{ pw.issue }}</span>
                          <span class="pw-tip">{{ pw.tip }}</span>
                        </div>
                      </div>
                    </div>

                    <div v-if="overallConfidence > 0" class="confidence-bar">
                      <span class="confidence-label">{{ themeStore.lang === 'zh' ? '识别清晰度' : 'Recognition Clarity' }}</span>
                      <div class="confidence-track">
                        <div class="confidence-fill" :style="{ width: Math.round(overallConfidence * 100) + '%', background: overallConfidence > 0.8 ? 'var(--green)' : overallConfidence > 0.5 ? 'var(--yellow)' : 'var(--red)' }"></div>
                      </div>
                      <span class="confidence-value">{{ Math.round(overallConfidence * 100) }}%</span>
                    </div>

                    <div class="next-actions">
                      <button class="next-primary" @click="router.push('/review')">
                        {{ themeStore.lang === 'zh' ? '复习本次弱点' : 'Review Weak Spots' }}
                      </button>
                      <button class="next-secondary" @click="router.push('/dashboard')">
                        {{ themeStore.lang === 'zh' ? '回到今日计划' : 'Back to Today’s Plan' }}
                      </button>
                    </div>
                  </template>
                </div>
              </template>

              <!-- ===== CONVERSATION MODE ===== -->
              <template v-if="mode === 'conversation'">
                <!-- Start conversation button -->
                <div v-if="convMessages.length === 0" class="conv-start">
                  <p class="conv-desc">
                    {{ themeStore.lang === 'zh'
                      ? '模拟真实口语考试：考官提问 → 你回答 → 考官追问 → 最后评分'
                      : 'Simulate a real speaking test: examiner asks → you answer → examiner follows up → final scoring'
                    }}
                  </p>
                  <button class="submit-btn" @click="startConversation">
                    {{ themeStore.lang === 'zh' ? '开始对话' : 'Start Conversation' }}
                  </button>
                </div>

                <!-- Conversation chat -->
                <div v-else class="conv-chat-area">
                  <div class="conv-messages" ref="convScrollRef">
                    <div v-for="(msg, i) in convMessages" :key="i" class="conv-msg" :class="msg.role">
                      <div class="conv-avatar">
                        {{ msg.role === 'examiner' ? 'E' : 'Y' }}
                      </div>
                      <div class="conv-bubble">
                        <!-- Score card inside message -->
                        <template v-if="msg.content === '__SCORE__'">
                          <div class="conv-score-card">
                            <div class="conv-score-header">
                              <div class="conv-overall" :style="{ borderColor: getScoreColor(msg.scoreData.overall) }">
                                <span class="score-num">{{ msg.scoreData.overall }}</span>
                                <span class="score-label">Band</span>
                              </div>
                            </div>
                            <div class="conv-dims">
                              <div v-for="(dim, key) in { fluency: msg.scoreData.fluency, lexical: msg.scoreData.lexical, grammar: msg.scoreData.grammar, pronunciation: msg.scoreData.pronunciation }" :key="key" class="conv-dim">
                                <span class="conv-dim-name">{{ { fluency: 'Fluency', lexical: 'Lexical', grammar: 'Grammar', pronunciation: 'Pronunciation' }[key] }}</span>
                                <span class="conv-dim-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
                              </div>
                            </div>
                            <div v-if="msg.scoreData.suggestions?.length" class="conv-suggestions">
                              <p v-for="s in msg.scoreData.suggestions" :key="s">{{ s }}</p>
                            </div>
                            <div v-if="msg.scoreData.improvedAnswer" class="conv-improved">
                              <strong>{{ themeStore.lang === 'zh' ? '示范：' : 'Model: ' }}</strong>{{ msg.scoreData.improvedAnswer }}
                            </div>
                            <div class="next-actions compact">
                              <button class="next-primary" @click="router.push('/review')">
                                {{ themeStore.lang === 'zh' ? '复习弱点' : 'Review' }}
                              </button>
                              <button class="next-secondary" @click="router.push('/dashboard')">
                                {{ themeStore.lang === 'zh' ? '今日计划' : 'Plan' }}
                              </button>
                            </div>
                          </div>
                        </template>
                        <template v-else>
                          {{ msg.content }}
                        </template>
                      </div>
                    </div>

                    <!-- Loading indicator -->
                    <div v-if="convLoading" class="conv-msg examiner">
                      <div class="conv-avatar">E</div>
                      <div class="conv-bubble conv-typing">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                      </div>
                    </div>
                  </div>

                  <!-- AI Result for manually ended conversation -->
                  <div v-if="showResult && aiResult && !convMessages.some(m => m.content === '__SCORE__')" class="ai-result">
                    <div v-if="aiResult.error" class="result-error">{{ aiResult.error }}</div>
                    <template v-else>
                      <div class="result-header">
                        <div class="overall-score" :style="{ borderColor: getScoreColor(aiResult.overall) }">
                          <span class="score-num">{{ aiResult.overall }}</span>
                          <span class="score-label">Band</span>
                        </div>
                      </div>
                      <div class="score-dimensions">
                        <div v-for="(dim, key) in { fluency: aiResult.fluency, lexical: aiResult.lexical, grammar: aiResult.grammar, pronunciation: aiResult.pronunciation }" :key="key" class="dim-item">
                          <div class="dim-header">
                            <span class="dim-name">{{ { fluency: themeStore.lang === 'zh' ? '流利度' : 'Fluency', lexical: themeStore.lang === 'zh' ? '词汇' : 'Lexical', grammar: themeStore.lang === 'zh' ? '语法' : 'Grammar', pronunciation: themeStore.lang === 'zh' ? '发音' : 'Pronunciation' }[key] }}</span>
                            <span class="dim-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
                          </div>
                          <p class="dim-comment">{{ dim.comment }}</p>
                        </div>
                      </div>
                      <div v-if="aiResult.suggestions?.length" class="suggestions">
                        <h4>{{ themeStore.lang === 'zh' ? '改进建议' : 'Suggestions' }}</h4>
                        <ul><li v-for="s in aiResult.suggestions" :key="s">{{ s }}</li></ul>
                      </div>
                      <div v-if="aiResult.improvedAnswer" class="improved-answer">
                        <h4>{{ themeStore.lang === 'zh' ? '示范回答' : 'Improved Answer' }}</h4>
                        <p>{{ aiResult.improvedAnswer }}</p>
                      </div>
                      <div class="next-actions">
                        <button class="next-primary" @click="router.push('/review')">
                          {{ themeStore.lang === 'zh' ? '复习本次弱点' : 'Review Weak Spots' }}
                        </button>
                        <button class="next-secondary" @click="router.push('/dashboard')">
                          {{ themeStore.lang === 'zh' ? '回到今日计划' : 'Back to Today’s Plan' }}
                        </button>
                      </div>
                    </template>
                  </div>

                  <!-- Recording input for conversation -->
                  <div v-if="!convEnded" class="conv-input">
                    <div class="conv-record-row">
                      <button class="record-btn small" :class="{ recording: isListening }" @click="toggleRecording" :disabled="!isSupported || convLoading">
                        {{ isListening ? '⏹' : '🎤' }}
                      </button>
                      <div class="conv-transcript" v-if="transcript || interimTranscript">
                        {{ transcript }}<span class="interim">{{ interimTranscript }}</span>
                      </div>
                      <div class="conv-hint" v-else>
                        {{ themeStore.lang === 'zh' ? '点击麦克风开始回答' : 'Tap mic to start answering' }}
                      </div>
                    </div>
                    <div v-if="isRecording" class="recording-indicator">
                      <span class="rec-dot"></span>
                      <span>{{ formatDuration(recordingDuration) }}</span>
                    </div>
                    <div v-if="transcript && !isListening" class="conv-actions">
                      <button class="submit-btn" @click="submitConvAnswer" :disabled="convLoading">
                        {{ themeStore.lang === 'zh' ? '发送回答' : 'Send Answer' }}
                      </button>
                      <button class="end-btn" @click="endConversation" :disabled="convLoading">
                        {{ themeStore.lang === 'zh' ? '结束并评分' : 'End & Score' }}
                      </button>
                    </div>
                    <div v-else-if="!isListening && convMessages.filter(m => m.role === 'user').length > 0" class="conv-actions">
                      <button class="end-btn" @click="endConversation" :disabled="convLoading">
                        {{ themeStore.lang === 'zh' ? '结束并评分' : 'End & Score' }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Sample answer for Part 2 -->
              <div v-if="activePart === 2 && selectedTopic.sampleAnswer && mode === 'practice'" class="sample-section">
                <button class="sample-toggle" @click="showSample = !showSample">
                  {{ showSample ? (themeStore.lang === 'zh' ? '隐藏示范' : 'Hide Sample') : (themeStore.lang === 'zh' ? '查看示范回答' : 'Show Sample Answer') }}
                </button>
                <div v-if="showSample" class="sample-answer">
                  <p>{{ selectedTopic.sampleAnswer }}</p>
                  <div class="key-vocab" v-if="selectedTopic.keyVocab">
                    <h4>{{ themeStore.lang === 'zh' ? '关键词汇' : 'Key Vocabulary' }}</h4>
                    <div class="vocab-tags">
                      <span v-for="v in selectedTopic.keyVocab" :key="v" class="vocab-tag">{{ v }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <p>{{ themeStore.lang === 'zh' ? '← 选择一个话题开始练习' : '← Select a topic to start practicing' }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.speaking-page {
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
  letter-spacing: 0;
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

.history-part {
  background: var(--black);
  color: var(--white);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

[data-theme="dark"] .history-part {
  background: var(--white);
  color: var(--black);
}

.history-mode-tag {
  background: var(--purple-soft);
  color: var(--purple);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.history-topic {
  font-weight: 600;
  font-size: var(--font-size-sm);
  flex: 1;
}

.history-score {
  font-weight: 800;
  font-size: var(--font-size-base);
}

.history-date {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.history-delete {
  background: none;
  color: var(--text-tertiary);
  font-size: 18px;
  padding: 0 4px;
}

.history-question {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.history-answer {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Controls row */
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.part-tabs {
  display: flex;
  gap: 8px;
}

.part-btn {
  padding: 8px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.part-btn.active {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .part-btn.active {
  background: var(--white);
  color: var(--black);
}

.mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  padding: 3px;
}

.mode-btn {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.mode-btn.active {
  background: var(--card-bg);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.speaking-cockpit {
  margin-bottom: var(--space-xl);
}

.topic-map-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.topic-map-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.topic-map-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--green);
  font-size: var(--font-size-xs);
  font-weight: 800;
  text-transform: uppercase;
}

.topic-map-head h2 {
  font-size: var(--font-size-lg);
  font-weight: 800;
  letter-spacing: 0;
}

.topic-recommend-btn {
  padding: 9px 16px;
  border-radius: var(--radius-full);
  background: var(--black);
  color: var(--white);
  font-size: var(--font-size-sm);
  font-weight: 800;
  white-space: nowrap;
}

[data-theme="dark"] .topic-recommend-btn {
  background: var(--white);
  color: var(--black);
}

.topic-recommend-btn:disabled {
  opacity: 0.45;
}

.topic-map-copy {
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.topic-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-filter {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.topic-filter strong {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.topic-filter.active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--text-primary);
}

.speaking-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
}

.topic-sidebar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 600px;
}

.topic-item {
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

.topic-item:hover { background: var(--bg-tertiary); }
.topic-item.active { border-left-color: var(--green); background: var(--green-soft); }
.topic-item.completed:not(.active) { border-left-color: var(--blue); }

.topic-label {
  display: block;
  line-height: 1.35;
}

.topic-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.topic-badge {
  padding: 2px 7px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 800;
}

.topic-badge.high {
  background: var(--yellow-soft);
  color: var(--yellow);
}

.topic-badge.done {
  background: var(--blue-soft);
  color: var(--blue);
}

.topic-empty {
  padding: var(--space-lg);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.speaking-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.question-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.question-card h3 { font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-md); }

.cue-card pre {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.q-btn {
  text-align: left;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.q-btn:hover { background: var(--border-color); }
.q-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .q-btn.active { background: var(--white); color: var(--black); }

/* Timer */
.timer-section { text-align: center; }

.timer-btn {
  padding: 12px 28px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
  background: var(--blue);
  color: white;
}

.timer-display {
  padding: var(--space-xl);
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.timer-display.warning {
  border-color: var(--red);
  animation: pulse-border 1s infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--red); }
  50% { border-color: transparent; }
}

.timer-phase {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.timer-countdown {
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.timer-display.warning .timer-countdown { color: var(--red); }

.timer-stop {
  margin-top: 12px;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Recording */
.record-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: center;
}

.current-question {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-lg);
}

.record-controls { margin-bottom: var(--space-md); }

.record-btn {
  padding: 14px 32px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
  background: var(--blue);
  color: white;
  transition: all var(--transition-fast);
}

.record-btn.small {
  padding: 10px 16px;
  font-size: var(--font-size-lg);
  min-width: 48px;
}

.record-btn.recording {
  background: var(--red);
  animation: pulse-red 1.5s infinite;
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(248, 113, 113, 0); }
}

.record-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.speech-error { color: var(--red); font-size: var(--font-size-xs); margin-top: 8px; }

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

.audio-playback { margin: var(--space-md) 0; }
.audio-player { width: 100%; max-width: 400px; height: 40px; }

.transcript-box {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin: var(--space-md) 0;
  text-align: left;
  min-height: 60px;
}

.transcript-text { font-size: var(--font-size-sm); line-height: 1.6; }
.interim { color: var(--text-tertiary); }

.submit-btn {
  padding: 12px 28px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  transition: opacity var(--transition-fast);
}

[data-theme="dark"] .submit-btn { background: var(--white); color: var(--black); }
.submit-btn:hover { opacity: 0.85; }
.submit-btn:disabled { opacity: 0.5; }

.end-btn {
  padding: 12px 28px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.end-btn:hover { background: var(--border-color); color: var(--text-primary); }

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

.dim-item {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 14px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dim-name { font-weight: 600; font-size: var(--font-size-sm); }
.dim-score { font-size: var(--font-size-lg); font-weight: 800; }
.dim-comment { font-size: var(--font-size-xs); color: var(--text-secondary); line-height: 1.5; }

.suggestions, .improved-answer {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.suggestions h4, .improved-answer h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.suggestions ul {
  list-style: disc;
  padding-left: 20px;
}

.suggestions li {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.improved-answer p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.7;
  font-style: italic;
}

.result-error { color: var(--red); text-align: center; }

.next-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: var(--space-lg);
}

.next-actions.compact {
  margin-top: var(--space-sm);
}

.next-primary,
.next-secondary {
  padding: 10px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.next-actions.compact .next-primary,
.next-actions.compact .next-secondary {
  padding: 7px 12px;
  font-size: var(--font-size-xs);
}

.next-primary {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .next-primary {
  background: var(--white);
  color: var(--black);
}

.next-secondary {
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.next-secondary:hover {
  background: var(--bg-tertiary);
}

.pronunciation-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.pronunciation-section h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.pronunciation-words {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pronunciation-word {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--red-soft);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.pw-word {
  font-weight: 700;
  font-family: monospace;
  color: var(--red);
  font-size: var(--font-size-base);
}

.pw-issue {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.pw-tip {
  font-size: var(--font-size-xs);
  color: var(--green);
  margin-left: auto;
}

.confidence-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.confidence-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
}

.confidence-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--transition-base);
}

.confidence-value {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

/* Conversation mode */
.conv-start {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-2xl);
  text-align: center;
}

.conv-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
  line-height: 1.6;
}

.conv-chat-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.conv-messages {
  padding: var(--space-xl);
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conv-msg {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.conv-msg.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.conv-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.conv-msg.examiner .conv-avatar {
  background: var(--blue);
  color: white;
}

.conv-msg.user .conv-avatar {
  background: var(--green);
  color: white;
}

.conv-bubble {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.conv-msg.examiner .conv-bubble {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.conv-msg.user .conv-bubble {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .conv-msg.user .conv-bubble {
  background: var(--white);
  color: var(--black);
}

.conv-typing {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 16px 20px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.16s; }
.typing-dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Score card in conversation */
.conv-score-card {
  min-width: 240px;
}

.conv-score-header {
  text-align: center;
  margin-bottom: var(--space-md);
}

.conv-overall {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid;
  justify-content: center;
}

.conv-dims {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: var(--space-md);
}

.conv-dim {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.conv-dim-name { font-size: var(--font-size-xs); color: var(--text-secondary); }
.conv-dim-score { font-size: var(--font-size-sm); font-weight: 700; }

.conv-suggestions p {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.conv-suggestions p::before {
  content: '• ';
  color: var(--text-tertiary);
}

.conv-improved {
  margin-top: var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
}

/* Conversation input */
.conv-input {
  border-top: 1px solid var(--border-color);
  padding: var(--space-md) var(--space-xl);
}

.conv-record-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conv-transcript {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.5;
}

.conv-hint {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.conv-actions {
  display: flex;
  gap: 10px;
  margin-top: var(--space-md);
}

.sample-section { text-align: center; }

.sample-toggle {
  padding: 10px 24px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.sample-answer {
  margin-top: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: left;
}

.sample-answer p {
  font-size: var(--font-size-sm);
  line-height: 1.8;
  color: var(--text-secondary);
}

.key-vocab { margin-top: var(--space-md); }
.key-vocab h4 { font-size: var(--font-size-sm); margin-bottom: 8px; }

.vocab-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.vocab-tag {
  padding: 4px 12px;
  background: var(--blue-soft);
  color: var(--blue);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-lg);
}

@media (max-width: 768px) {
  .speaking-layout { grid-template-columns: 1fr; }
  .topic-sidebar { max-height: 200px; }
  .score-dimensions { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .timer-countdown { font-size: 36px; }
  .conv-msg { max-width: 95%; }
  .conv-dims { grid-template-columns: 1fr; }
  .controls-row { flex-direction: column; align-items: flex-start; }
  .topic-map-head { flex-direction: column; }
  .topic-recommend-btn { width: 100%; }
  .topic-filter {
    flex: 1 1 calc(50% - 8px);
    justify-content: space-between;
  }
}
</style>
