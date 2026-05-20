<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { listeningSections as staticListeningSections } from '../data/ielts/listening'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { getListeningBank } from '../services/content'
import { addListeningRecord, getListeningHistory, incrementDailyStats } from '../services/progress'
import { addReviewItemsFromFeedback } from '../services/reviewItems'
import { toLocalDateKey } from '../utils/date'

const themeStore = useThemeStore()
const { isListening, transcript, interimTranscript, isSupported, start, stop, reset } = useSpeechRecognition()

const listeningSections = ref(staticListeningSections)
const activeSection = ref(0)
const currentSentenceIndex = ref(0)
const isPlaying = ref(false)
const subtitleMode = ref('bilingual')
const showComparison = ref(false)
const autoPlay = ref(false)
const selectedSectionType = ref('all')
const questionAnswers = ref({})
const showQuestionResults = ref(false)
const listeningReport = ref(null)
const listeningHistory = ref(loadListeningHistory())

const section = computed(() => listeningSections.value[activeSection.value] || listeningSections.value[0])
const currentSentence = computed(() => section.value?.sentences[currentSentenceIndex.value])
const sectionTypeOptions = ['all', 1, 2, 3, 4]

const sectionCounts = computed(() => {
  return listeningSections.value.reduce((acc, item) => {
    acc[item.section] = (acc[item.section] || 0) + 1
    return acc
  }, { all: listeningSections.value.length })
})

const filteredListeningSections = computed(() => {
  if (selectedSectionType.value === 'all') return listeningSections.value
  return listeningSections.value.filter(item => item.section === selectedSectionType.value)
})

const currentWordIndex = ref(-1)
let currentUtterance = null
const commonListeningWords = new Set(['about', 'after', 'again', 'available', 'because', 'before', 'between', 'could', 'every', 'first', 'from', 'have', 'their', 'there', 'these', 'they', 'this', 'through', 'today', 'which', 'while', 'with', 'would', 'your'])

const listeningQuestions = computed(() => {
  return section.value.sentences
    .map((sentence, index) => {
      const answer = pickQuestionAnswer(sentence.en)
      if (!answer) return null
      return {
        id: `${section.value.id}-${index}`,
        sentenceIndex: index,
        prompt: sentence.en.replace(new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'i'), '_____'),
        answer
      }
    })
    .filter(Boolean)
    .slice(0, 6)
})

const questionScore = computed(() => {
  const total = listeningQuestions.value.length
  const correct = listeningQuestions.value.filter(q => normalizeAnswer(questionAnswers.value[q.id]) === normalizeAnswer(q.answer)).length
  return { correct, total, percentage: total ? Math.round((correct / total) * 100) : 0 }
})

// Check if TTS is available
const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function speakText(text) {
  if (!ttsSupported) return
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  utterance.pitch = 1

  // Try to find an English voice
  const voices = window.speechSynthesis.getVoices()
  const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
    || voices.find(v => v.lang.startsWith('en'))
  if (enVoice) utterance.voice = enVoice

  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      const textUpToChar = text.substring(0, event.charIndex)
      currentWordIndex.value = textUpToChar.split(/\s+/).length - 1
    }
  }

  utterance.onend = () => {
    currentWordIndex.value = -1
    if (autoPlay.value && currentSentenceIndex.value < section.value.sentences.length - 1) {
      setTimeout(() => {
        currentSentenceIndex.value++
        playCurrentSentence()
      }, 800)
    } else {
      isPlaying.value = false
    }
  }

  utterance.onerror = () => {
    isPlaying.value = false
    currentWordIndex.value = -1
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

function playCurrentSentence() {
  isPlaying.value = true
  currentWordIndex.value = -1
  speakText(currentSentence.value.en)
}

function stopPlayback() {
  isPlaying.value = false
  if (ttsSupported) window.speechSynthesis.cancel()
  currentWordIndex.value = -1
}

function togglePlay() {
  if (isPlaying.value) stopPlayback()
  else playCurrentSentence()
}

function goToSentence(i) {
  stopPlayback()
  currentSentenceIndex.value = i
  currentWordIndex.value = -1
}

function selectSection(index) {
  activeSection.value = index
  currentSentenceIndex.value = 0
  showComparison.value = false
  questionAnswers.value = {}
  showQuestionResults.value = false
  listeningReport.value = null
  reset()
  stopPlayback()
}

function pickRandomSection() {
  const pool = filteredListeningSections.value.length ? filteredListeningSections.value : listeningSections.value
  const picked = pool[Math.floor(Math.random() * pool.length)]
  selectSection(listeningSections.value.findIndex(item => item.id === picked.id))
}

function loadListeningHistory() {
  try {
    return JSON.parse(localStorage.getItem('mamio-listening-history') || '[]')
  } catch {
    return []
  }
}

function saveListeningHistoryLocal(record) {
  const history = JSON.parse(localStorage.getItem('mamio-listening-history') || '[]')
  history.unshift(record)
  if (history.length > 50) history.length = 50
  localStorage.setItem('mamio-listening-history', JSON.stringify(history))
  listeningHistory.value = history
}

function isSameListeningAttempt(a, b) {
  return a.section === b.section && a.mode === b.mode && a.score === b.score && a.correct === b.correct && a.total === b.total && a.date === b.date
}

async function migrateLocalListeningHistory(localHistory, serverHistory) {
  const unsynced = localHistory
    .filter(item => !item.synced && !serverHistory.some(serverItem => isSameListeningAttempt(item, serverItem)))
    .slice(0, 50)
  if (!unsynced.length) return serverHistory

  for (const item of unsynced) {
    await addListeningRecord({ ...item, createdAt: item.date })
  }
  return getListeningHistory()
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeAnswer(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/^(a|an|the)\s+/i, '')
}

function pickQuestionAnswer(text) {
  const words = text.match(/\b[A-Za-z][A-Za-z-]{4,}\b/g) || []
  const candidates = words.filter(word => !commonListeningWords.has(word.toLowerCase()))
  return candidates.sort((a, b) => b.length - a.length)[0] || words[0] || ''
}

async function submitListeningQuestions() {
  showQuestionResults.value = true
  listeningReport.value = buildListeningReport()
  const historyRecord = {
    id: Date.now(),
    date: new Date().toISOString(),
    section: section.value.title,
    sectionNumber: section.value.section,
    mode: 'completion',
    score: listeningReport.value.accuracy,
    correct: listeningReport.value.correct,
    total: listeningReport.value.total,
    missedWords: listeningReport.value.missedWords,
    details: {
      missedWords: listeningReport.value.missedWords,
      report: listeningReport.value
    }
  }
  try {
    const saved = await addListeningRecord(historyRecord)
    saveListeningHistoryLocal({ ...historyRecord, id: saved.id || historyRecord.id, synced: true })
  } catch {
    saveListeningHistoryLocal(historyRecord)
  }

  const wrongItems = listeningQuestions.value
    .filter(q => normalizeAnswer(questionAnswers.value[q.id]) !== normalizeAnswer(q.answer))
    .map(q => ({
      type: 'listening',
      text: q.answer,
      reason: `句子填空错误：${q.prompt}；你的答案：${questionAnswers.value[q.id] || '未作答'}`
    }))
  if (wrongItems.length) {
    addReviewItemsFromFeedback({ reviewItems: wrongItems }, { module: 'listening', source: 'listening-questions' })
  }
  incrementDailyStats(toLocalDateKey(), 'listening').catch(() => {})
}

function getListeningBandEstimate(percentage) {
  if (percentage >= 90) return '8.5-9.0'
  if (percentage >= 80) return '7.5-8.0'
  if (percentage >= 70) return '6.5-7.0'
  if (percentage >= 60) return '5.5-6.0'
  if (percentage >= 45) return '4.5-5.0'
  return '<4.5'
}

function makeListeningRecommendation(report) {
  if (report.unanswered > 0) {
    return themeStore.lang === 'zh'
      ? `这套有 ${report.unanswered} 个空没填，先练完整听完再作答，别被单句卡住。`
      : `${report.unanswered} blank(s) were unanswered. Practise completing the whole section before polishing accuracy.`
  }
  if (report.accuracy < 70) {
    return section.value.section >= 3
      ? (themeStore.lang === 'zh' ? 'Section 3/4 信息密度高，下一轮先做笔记关键词，再填答案。' : 'Sections 3/4 are dense. Next round, take keyword notes before filling answers.')
      : (themeStore.lang === 'zh' ? '基础场景词识别还不稳，下一轮先用双语字幕听两遍再隐藏字幕。' : 'Core scenario word recognition is shaky. Listen twice with subtitles, then hide them.')
  }
  if (report.accuracy < 85) {
    return themeStore.lang === 'zh'
      ? '正确率接近可用，下一轮重点检查单复数、拼写和连字符。'
      : 'Accuracy is close. Next focus on plurals, spelling, and hyphenated words.'
  }
  return themeStore.lang === 'zh'
    ? '这套完成不错，可以切到更高 Section 或开启隐藏字幕练。'
    : 'Strong attempt. Move to a harder section or practise with subtitles hidden.'
}

function buildListeningReport() {
  const total = listeningQuestions.value.length
  const correct = listeningQuestions.value.filter(q => normalizeAnswer(questionAnswers.value[q.id]) === normalizeAnswer(q.answer)).length
  const unanswered = listeningQuestions.value.filter(q => !normalizeAnswer(questionAnswers.value[q.id])).length
  const wrong = total - correct - unanswered
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  const missedWords = listeningQuestions.value
    .filter(q => normalizeAnswer(questionAnswers.value[q.id]) !== normalizeAnswer(q.answer))
    .map(q => q.answer)
  const report = {
    correct,
    total,
    unanswered,
    wrong,
    accuracy,
    band: getListeningBandEstimate(accuracy),
    missedWords,
    section: section.value.section
  }
  return { ...report, recommendation: makeListeningRecommendation(report) }
}

function startDictation() {
  reset()
  start()
}

async function stopDictation() {
  stop()
  showComparison.value = true

  // Save listening practice to history
  if (transcript.value.trim()) {
    const historyRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      section: section.value.title,
      sectionNumber: section.value.section,
      mode: 'dictation',
      sentence: currentSentence.value.en,
      transcript: transcript.value,
      details: {
        sentence: currentSentence.value.en,
        transcript: transcript.value
      }
    }
    try {
      const saved = await addListeningRecord(historyRecord)
      saveListeningHistoryLocal({ ...historyRecord, id: saved.id || historyRecord.id, synced: true })
    } catch {
      saveListeningHistoryLocal(historyRecord)
    }
  }

  incrementDailyStats(toLocalDateKey(), 'listening').catch(() => {})

  // Extract wrong words as review items
  if (transcript.value.trim()) {
    const diff = getWordDiff(currentSentence.value.en, transcript.value)
    const wrongWords = diff.filter(w => !w.match)
    if (wrongWords.length) {
      addReviewItemsFromFeedback({
        reviewItems: wrongWords.map(w => ({
          type: 'listening',
          text: w.word,
          reason: `听力跟读中未正确识别的词`
        }))
      }, { module: 'listening', source: 'listening-dictation' })
    }
  }
}

function getWordDiff(original, spoken) {
  const origWords = original.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  const spokenWords = spoken.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  return origWords.map((w, i) => ({
    word: w,
    match: spokenWords.includes(w)
  }))
}

const wordDiff = computed(() => {
  if (!transcript.value || !showComparison.value) return []
  return getWordDiff(currentSentence.value.en, transcript.value)
})

// Load TTS voices
onMounted(async () => {
  try {
    const bank = await getListeningBank()
    if (bank.length) {
      listeningSections.value = bank
      activeSection.value = 0
      currentSentenceIndex.value = 0
    }
  } catch {
    listeningSections.value = staticListeningSections
  }

  if (ttsSupported) {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
  }
  const localHistory = loadListeningHistory()
  try {
    const serverHistory = await getListeningHistory()
    const history = await migrateLocalListeningHistory(localHistory, serverHistory)
    if (history.length) {
      localStorage.setItem('mamio-listening-history', JSON.stringify(history))
      listeningHistory.value = history
    } else {
      listeningHistory.value = localHistory
    }
  } catch {
    listeningHistory.value = localHistory
  }
})

onUnmounted(() => stopPlayback())
</script>

<template>
  <div class="listening-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思听力练习' : 'IELTS Listening Practice' }}</h1>

      <!-- Section tabs -->
      <div class="listening-bank">
        <div>
          <h2>{{ themeStore.lang === 'zh' ? '听力题库' : 'Listening Bank' }}</h2>
          <p>{{ themeStore.lang === 'zh' ? `${listeningSections.length} 套 · ${listeningSections.reduce((sum, item) => sum + item.sentences.length, 0)} 句精听材料` : `${listeningSections.length} sets · ${listeningSections.reduce((sum, item) => sum + item.sentences.length, 0)} dictation sentences` }}</p>
        </div>
        <button class="random-btn" @click="pickRandomSection">
          {{ themeStore.lang === 'zh' ? '随机听一套' : 'Random Set' }}
        </button>
      </div>

      <div class="section-filters">
        <button v-for="opt in sectionTypeOptions" :key="opt" class="section-filter" :class="{ active: selectedSectionType === opt }" @click="selectedSectionType = opt">
          {{ opt === 'all' ? (themeStore.lang === 'zh' ? '全部' : 'All') : 'Section ' + opt }}
          <span>{{ sectionCounts[opt] || 0 }}</span>
        </button>
      </div>

      <div class="section-tabs">
        <button v-for="s in filteredListeningSections" :key="s.id" class="section-btn" :class="{ active: section.id === s.id }" @click="selectSection(listeningSections.findIndex(item => item.id === s.id))">
          <span class="section-kicker">Section {{ s.section }}</span>
          <strong>{{ s.title }}</strong>
          <small>{{ s.sentences.length }} {{ themeStore.lang === 'zh' ? '句' : 'sentences' }}</small>
        </button>
      </div>

      <div v-if="listeningHistory.length" class="history-strip">
        <div class="history-head">
          <h3>{{ themeStore.lang === 'zh' ? '最近听力记录' : 'Recent Listening' }}</h3>
          <span>{{ listeningHistory.slice(0, 5).length }} / {{ listeningHistory.length }}</span>
        </div>
        <div class="history-list">
          <router-link v-for="item in listeningHistory.slice(0, 5)" :key="item.id" class="history-item" :to="`/listening/history/${item.id}`">
            <strong>{{ item.section }}</strong>
            <span v-if="typeof item.score === 'number'">{{ item.score }}%</span>
            <small>{{ item.mode === 'completion' ? 'Completion' : 'Dictation' }}</small>
          </router-link>
        </div>
      </div>

      <div class="section-info">
        <h2>{{ section.title }}</h2>
        <p>{{ section.description }}</p>
      </div>

      <div class="listening-layout">
        <!-- Audio area -->
        <div class="audio-area">
          <div class="audio-player">
            <div class="audio-visual">
              <div v-for="i in 20" :key="i" class="audio-bar" :style="{ height: isPlaying ? (Math.random() * 60 + 20) + '%' : '20%', animationDelay: (i * 50) + 'ms' }"></div>
            </div>

            <div class="audio-controls">
              <button class="ctrl-btn" @click="currentSentenceIndex > 0 && goToSentence(currentSentenceIndex - 1)">⏮</button>
              <button class="ctrl-btn play-btn" @click="togglePlay">{{ isPlaying ? '⏸' : '▶' }}</button>
              <button class="ctrl-btn" @click="currentSentenceIndex < section.sentences.length - 1 && goToSentence(currentSentenceIndex + 1)">⏭</button>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: ((currentSentenceIndex + 1) / section.sentences.length * 100) + '%' }"></div>
              </div>
              <span class="time">{{ currentSentenceIndex + 1 }} / {{ section.sentences.length }}</span>
            </div>

            <div class="tts-controls">
              <label class="autoplay-toggle">
                <input type="checkbox" v-model="autoPlay" />
                <span>{{ themeStore.lang === 'zh' ? '自动播放下一句' : 'Auto-play next' }}</span>
              </label>
              <span v-if="!ttsSupported" class="tts-warning">
                {{ themeStore.lang === 'zh' ? '浏览器不支持语音合成' : 'TTS not supported' }}
              </span>
            </div>
          </div>

          <!-- Subtitle display -->
          <div v-if="subtitleMode !== 'hidden'" class="subtitle-display">
            <p v-if="subtitleMode !== 'cn'" class="subtitle-en">
              <span v-for="(word, i) in currentSentence.en.split(' ')" :key="i" class="word" :class="{ highlight: i === currentWordIndex }">{{ word }} </span>
            </p>
            <p v-if="subtitleMode !== 'en'" class="subtitle-cn">{{ currentSentence.cn }}</p>
          </div>

          <div class="subtitle-modes">
            <button v-for="mode in ['bilingual', 'en', 'cn', 'hidden']" :key="mode" class="mode-btn" :class="{ active: subtitleMode === mode }" @click="subtitleMode = mode">
              {{ { bilingual: themeStore.lang === 'zh' ? '双语' : 'Bi', en: 'EN', cn: 'CN', hidden: themeStore.lang === 'zh' ? '隐藏' : 'Hide' }[mode] }}
            </button>
          </div>

          <!-- IELTS-style questions -->
          <div class="question-area">
            <div class="question-head">
              <div>
                <h3>{{ themeStore.lang === 'zh' ? 'Section 填空题' : 'Section Completion' }}</h3>
                <p>{{ themeStore.lang === 'zh' ? '先听完整段，再补全关键词' : 'Listen to the section, then complete the key words' }}</p>
              </div>
              <button class="listen-all-btn" @click="autoPlay = true; currentSentenceIndex = 0; playCurrentSentence()">
                {{ themeStore.lang === 'zh' ? '播放整段' : 'Play Section' }}
              </button>
            </div>

            <div class="question-list">
              <div v-for="(q, i) in listeningQuestions" :key="q.id" class="question-item" :class="{ correct: showQuestionResults && normalizeAnswer(questionAnswers[q.id]) === normalizeAnswer(q.answer), wrong: showQuestionResults && normalizeAnswer(questionAnswers[q.id]) && normalizeAnswer(questionAnswers[q.id]) !== normalizeAnswer(q.answer) }">
                <label>{{ i + 1 }}. {{ q.prompt }}</label>
                <input v-model="questionAnswers[q.id]" :disabled="showQuestionResults" :placeholder="themeStore.lang === 'zh' ? '填写答案' : 'Answer'" />
                <span v-if="showQuestionResults" class="question-answer">
                  {{ themeStore.lang === 'zh' ? '答案' : 'Answer' }}: {{ q.answer }}
                </span>
              </div>
            </div>

            <div class="question-actions">
              <button class="submit-questions-btn" @click="submitListeningQuestions" :disabled="showQuestionResults">
                {{ themeStore.lang === 'zh' ? '提交填空题' : 'Submit Answers' }}
              </button>
              <button v-if="showQuestionResults" class="reset-questions-btn" @click="questionAnswers = {}; showQuestionResults = false; listeningReport = null">
                {{ themeStore.lang === 'zh' ? '重做' : 'Retry' }}
              </button>
              <span v-if="showQuestionResults" class="question-score">
                {{ questionScore.correct }}/{{ questionScore.total }} · {{ questionScore.percentage }}%
              </span>
            </div>

            <div v-if="listeningReport" class="listening-report">
              <div class="report-score">
                <strong>{{ listeningReport.accuracy }}%</strong>
                <span>Band {{ listeningReport.band }}</span>
              </div>
              <div class="report-body">
                <span>{{ themeStore.lang === 'zh' ? '下一步' : 'Next Step' }}</span>
                <p>{{ listeningReport.recommendation }}</p>
                <div class="report-metrics">
                  <div>
                    <span>{{ themeStore.lang === 'zh' ? '错题' : 'Wrong' }}</span>
                    <strong>{{ listeningReport.wrong }}</strong>
                  </div>
                  <div>
                    <span>{{ themeStore.lang === 'zh' ? '漏答' : 'Blank' }}</span>
                    <strong>{{ listeningReport.unanswered }}</strong>
                  </div>
                  <div>
                    <span>Section</span>
                    <strong>{{ listeningReport.section }}</strong>
                  </div>
                </div>
                <div v-if="listeningReport.missedWords.length" class="missed-words">
                  <span v-for="word in listeningReport.missedWords" :key="word">{{ word }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dictation practice -->
          <div class="dictation-area">
            <h3>{{ themeStore.lang === 'zh' ? '跟读练习' : 'Dictation Practice' }}</h3>
            <p class="dictation-hint">{{ themeStore.lang === 'zh' ? '听一句，然后点击录音跟读' : 'Listen, then click to record your dictation' }}</p>
            <button class="record-btn" :class="{ recording: isListening }" @click="isListening ? stopDictation() : startDictation()" :disabled="!isSupported">
              {{ isListening ? '⏹ ' + (themeStore.lang === 'zh' ? '停止' : 'Stop') : '🎤 ' + (themeStore.lang === 'zh' ? '开始跟读' : 'Start Dictation') }}
            </button>
            <div v-if="transcript" class="transcript-box">
              <p>{{ transcript }}<span class="interim">{{ interimTranscript }}</span></p>
            </div>

            <!-- Word comparison -->
            <div v-if="showComparison && wordDiff.length" class="comparison">
              <h4>{{ themeStore.lang === 'zh' ? '对比结果' : 'Comparison' }}</h4>
              <div class="diff-words">
                <span v-for="(w, i) in wordDiff" :key="i" class="diff-word" :class="{ correct: w.match, wrong: !w.match }">{{ w.word }}</span>
              </div>
              <p class="accuracy">{{ themeStore.lang === 'zh' ? '准确率' : 'Accuracy' }}: {{ Math.round(wordDiff.filter(w => w.match).length / wordDiff.length * 100) }}%</p>
            </div>
          </div>
        </div>

        <!-- Sentence list -->
        <div class="sentence-list">
          <div v-for="(s, i) in section.sentences" :key="i" class="sentence-item" :class="{ active: i === currentSentenceIndex }" @click="goToSentence(i)">
            <span class="sentence-num">{{ i + 1 }}</span>
            <div>
              <p class="sentence-en">{{ s.en }}</p>
              <p class="sentence-cn">{{ s.cn }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.listening-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.listening-page h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: var(--space-lg);
}

.listening-bank {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 18px 20px;
  margin-bottom: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.listening-bank h2 {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.listening-bank p {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
}

.random-btn {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: var(--radius-full);
  background: var(--black);
  color: var(--white);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

[data-theme="dark"] .random-btn {
  background: var(--white);
  color: var(--black);
}

.section-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-md);
}

.section-filter {
  padding: 8px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 700;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.section-filter span {
  margin-left: 4px;
  color: var(--text-tertiary);
}

.section-filter.active {
  background: var(--black);
  color: var(--white);
}

.section-filter.active span {
  color: inherit;
  opacity: 0.75;
}

[data-theme="dark"] .section-filter.active {
  background: var(--white);
  color: var(--black);
}

.section-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  margin-bottom: var(--space-md);
}

.section-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 86px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  text-align: left;
}

.section-btn strong {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  margin: 4px 0;
}

.section-btn small,
.section-kicker {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.section-btn.active {
  background: var(--black);
  color: var(--white);
}

.section-btn.active strong,
.section-btn.active small,
.section-btn.active .section-kicker {
  color: inherit;
  opacity: 0.85;
}

[data-theme="dark"] .section-btn.active {
  background: var(--white);
  color: var(--black);
}

.history-strip {
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: 10px;
}

.history-head h3 {
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.history-head span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.history-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  padding: 10px;
  text-align: left;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.history-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-xs);
}

.history-item span {
  color: var(--green);
  font-size: var(--font-size-xs);
  font-weight: 900;
}

.history-item small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.section-info {
  margin-bottom: var(--space-xl);
}

.section-info h2 { font-size: var(--font-size-lg); font-weight: 700; }
.section-info p { font-size: var(--font-size-sm); color: var(--text-tertiary); }

.listening-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
}

.audio-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.audio-player {
  background: #111;
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.audio-visual {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 80px;
  margin-bottom: var(--space-md);
}

.audio-bar {
  width: 6px;
  background: linear-gradient(to top, #60a5fa, #a78bfa);
  border-radius: 3px;
  transition: height 0.15s ease;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn { color: white; font-size: 1rem; padding: 6px 10px; border-radius: 6px; }
.ctrl-btn:hover { background: rgba(255,255,255,0.1); }

.play-btn {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #60a5fa, #a78bfa); border-radius: 2px; transition: width 0.3s; }
.time { font-size: var(--font-size-xs); color: rgba(255,255,255,0.6); }

.tts-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.autoplay-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
}

.autoplay-toggle input { accent-color: #60a5fa; }

.tts-warning {
  font-size: var(--font-size-xs);
  color: #f87171;
}

.subtitle-display {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: center;
}

.subtitle-en { font-size: var(--font-size-lg); font-weight: 600; line-height: 1.6; }
.word { padding: 2px 4px; border-radius: 4px; transition: all 0.2s; }
.word.highlight { background: rgba(74, 222, 128, 0.3); color: #4ade80; }
.subtitle-cn { font-size: var(--font-size-sm); color: var(--text-tertiary); margin-top: 6px; }

.subtitle-modes { display: flex; gap: 6px; }
.mode-btn {
  padding: 5px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.mode-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .mode-btn.active { background: var(--white); color: var(--black); }

.question-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.question-head h3 {
  font-weight: 800;
}

.question-head p {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  margin-top: 4px;
}

.listen-all-btn,
.submit-questions-btn,
.reset-questions-btn {
  padding: 9px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 700;
  white-space: nowrap;
}

.listen-all-btn {
  background: var(--blue-soft);
  color: var(--blue);
  border: 1px solid var(--blue);
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.question-item {
  display: grid;
  grid-template-columns: 1fr minmax(120px, 180px);
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.question-item.correct {
  background: var(--green-soft);
}

.question-item.wrong {
  background: var(--red-soft);
}

.question-item label {
  line-height: 1.5;
  font-size: var(--font-size-sm);
}

.question-item input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--card-bg);
  color: var(--text-primary);
  outline: none;
}

.question-item input:focus {
  border-color: var(--blue);
}

.question-answer {
  grid-column: 1 / -1;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.question-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--space-md);
  flex-wrap: wrap;
}

.submit-questions-btn {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .submit-questions-btn {
  background: var(--white);
  color: var(--black);
}

.submit-questions-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.reset-questions-btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.question-score {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.listening-report {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.report-score {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 110px;
  border-radius: var(--radius-sm);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.report-score strong {
  font-size: var(--font-size-2xl);
  font-weight: 900;
}

.report-score span,
.report-body > span,
.report-metrics span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.report-body p {
  margin: 4px 0 var(--space-md);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.report-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.report-metrics div {
  padding: 8px 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.report-metrics strong {
  display: block;
  margin-top: 2px;
  font-size: var(--font-size-lg);
  font-weight: 900;
}

.missed-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--space-md);
}

.missed-words span {
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--red-soft);
  color: var(--red);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.dictation-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-align: center;
}

.dictation-area h3 { font-weight: 700; margin-bottom: 4px; }
.dictation-hint { font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-md); }

.record-btn {
  padding: 12px 28px;
  border-radius: var(--radius-full);
  font-weight: 700;
  background: var(--blue);
  color: white;
}

.record-btn.recording { background: var(--red); }
.record-btn:disabled { opacity: 0.5; }

.transcript-box {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-top: var(--space-md);
  text-align: left;
  font-size: var(--font-size-sm);
  min-height: 40px;
}

.interim { color: var(--text-tertiary); }

.comparison {
  margin-top: var(--space-md);
  text-align: left;
}

.comparison h4 { font-size: var(--font-size-sm); font-weight: 700; margin-bottom: 8px; }

.diff-words { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.diff-word {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: var(--font-size-sm);
}

.diff-word.correct { background: var(--green-soft); color: var(--green); }
.diff-word.wrong { background: var(--red-soft); color: var(--red); text-decoration: line-through; }

.accuracy { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary); }

.sentence-list {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 600px;
}

.sentence-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.sentence-item:hover { background: var(--bg-tertiary); }
.sentence-item.active { border-left-color: var(--green); background: var(--green-soft); }

.sentence-num { font-size: var(--font-size-xs); color: var(--text-tertiary); font-weight: 600; min-width: 20px; }
.sentence-en { font-size: var(--font-size-sm); font-weight: 500; margin-bottom: 2px; }
.sentence-cn { font-size: var(--font-size-xs); color: var(--text-tertiary); }

@media (max-width: 768px) {
  .listening-bank {
    align-items: flex-start;
    flex-direction: column;
  }

  .random-btn {
    width: 100%;
  }

  .listening-layout { grid-template-columns: 1fr; }
  .question-head { align-items: flex-start; flex-direction: column; }
  .listen-all-btn { width: 100%; }
  .question-item { grid-template-columns: 1fr; }
  .listening-report,
  .report-metrics { grid-template-columns: 1fr; }
  .sentence-list { max-height: 240px; }
}
</style>
