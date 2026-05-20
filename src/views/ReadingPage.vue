<script setup>
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { readingPassages as staticReadingPassages } from '../data/ielts/reading'
import { getReadingBank } from '../services/content'
import { addReadingRecord, getReadingHistory, incrementDailyStats } from '../services/progress'
import { addReviewItemsFromFeedback } from '../services/reviewItems'
import { toLocalDateKey } from '../utils/date'

const themeStore = useThemeStore()

const readingPassages = ref(staticReadingPassages)
const selectedPassage = ref(null)
const currentQuestionIndex = ref(0)
const userAnswers = ref({})
const showResults = ref(false)
const score = ref(null)
const selectedLevel = ref('all')
const selectedQuestionType = ref('all')
const practiceReport = ref(null)
const readingHistory = ref(loadReadingHistory())

const questionTypeLabels = {
  'true-false-ng': { zh: '判断题', en: 'TFNG' },
  matching: { zh: '匹配题', en: 'Matching' },
  'matching-headings': { zh: '标题匹配', en: 'Headings' },
  'short-answer': { zh: '简答题', en: 'Short Answer' },
  'multiple-choice': { zh: '选择题', en: 'Multiple Choice' }
}

const levelOptions = ['all', 'easy', 'medium', 'hard']
const questionTypeOptions = ['all', ...Object.keys(questionTypeLabels)]

const levelCounts = computed(() => {
  return readingPassages.value.reduce((acc, passage) => {
    acc[passage.level] = (acc[passage.level] || 0) + 1
    return acc
  }, { all: readingPassages.value.length })
})

const completedPassageTitles = computed(() => new Set(readingHistory.value.map(item => item.passage).filter(Boolean)))

const levelCoverage = computed(() => {
  return levelOptions.filter(level => level !== 'all').map(level => {
    const passages = readingPassages.value.filter(passage => passage.level === level)
    const done = passages.filter(passage => completedPassageTitles.value.has(passage.title)).length
    return { level, total: passages.length, done }
  })
})

const questionTypeCoverage = computed(() => {
  return Object.keys(questionTypeLabels).map(type => {
    const passages = readingPassages.value.filter(passage => passage.questions.some(q => q.type === type))
    const done = passages.filter(passage => completedPassageTitles.value.has(passage.title)).length
    return { type, total: passages.length, done }
  })
})

const recommendedPassage = computed(() => {
  const unfinished = readingPassages.value.filter(passage => !completedPassageTitles.value.has(passage.title))
  const pool = unfinished.length ? unfinished : readingPassages.value
  const weakestLevel = levelCoverage.value
    .filter(item => item.total > 0)
    .slice()
    .sort((a, b) => (a.done / a.total) - (b.done / b.total) || b.total - a.total)[0]
  return pool.find(passage => passage.level === weakestLevel?.level) || pool[0] || null
})

const recommendationCopy = computed(() => {
  if (!recommendedPassage.value) return ''
  const level = levelCoverage.value.find(item => item.level === recommendedPassage.value.level)
  const levelText = getLevelLabel(recommendedPassage.value.level)
  if (themeStore.lang === 'zh') {
    return `${levelText} 难度完成 ${level?.done || 0}/${level?.total || 0}，建议下一篇：${recommendedPassage.value.title}。`
  }
  return `${levelText} coverage is ${level?.done || 0}/${level?.total || 0}. Next: ${recommendedPassage.value.title}.`
})

const filteredPassages = computed(() => {
  return readingPassages.value.filter(passage => {
    const levelOk = selectedLevel.value === 'all' || passage.level === selectedLevel.value
    const typeOk = selectedQuestionType.value === 'all' || passage.questions.some(q => q.type === selectedQuestionType.value)
    return levelOk && typeOk
  })
})

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
  practiceReport.value = null
  stopTimer()
  startTimer()
}

function selectRecommendedPassage() {
  if (!recommendedPassage.value) return
  selectedLevel.value = 'all'
  selectedQuestionType.value = 'all'
  selectPassage(recommendedPassage.value)
}

const currentQuestion = computed(() => {
  if (!selectedPassage.value) return null
  return selectedPassage.value.questions[currentQuestionIndex.value]
})

const totalQuestions = computed(() => {
  if (!selectedPassage.value) return 0
  return countPassageQuestions(selectedPassage.value)
})

function countPassageQuestions(passage) {
  return passage.questions.reduce((sum, q) => {
    if (q.type === 'true-false-ng') return sum + q.statements.length
    if (q.type === 'matching' || q.type === 'matching-headings' || q.type === 'short-answer') return sum + (q.items?.length || q.answers?.length || 0)
    if (q.type === 'multiple-choice') return sum + (q.items?.length || 0)
    return sum + 1
  }, 0)
}

function getPassageQuestionTypes(passage) {
  return [...new Set(passage.questions.map(q => q.type))]
}

function loadReadingHistory() {
  try {
    return JSON.parse(localStorage.getItem('mamio-reading-history') || '[]')
  } catch {
    return []
  }
}

function saveReadingHistoryLocal(record) {
  const history = JSON.parse(localStorage.getItem('mamio-reading-history') || '[]')
  history.unshift(record)
  if (history.length > 50) history.length = 50
  localStorage.setItem('mamio-reading-history', JSON.stringify(history))
  readingHistory.value = history
}

function isSameReadingAttempt(a, b) {
  return a.passage === b.passage && a.score === b.score && a.correct === b.correct && a.total === b.total && a.date === b.date
}

async function migrateLocalReadingHistory(localHistory, serverHistory) {
  const unsynced = localHistory
    .filter(item => !item.synced && !serverHistory.some(serverItem => isSameReadingAttempt(item, serverItem)))
    .slice(0, 50)
  if (!unsynced.length) return serverHistory

  for (const item of unsynced) {
    await addReadingRecord({ ...item, createdAt: item.date })
  }
  return getReadingHistory()
}

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

async function submitAnswers() {
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
    } else if (q.type === 'matching-headings') {
      q.answers.forEach((a, i) => {
        total++
        if ((answers[i] || '').toLowerCase() === a.toLowerCase()) correct++
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
  practiceReport.value = buildPracticeReport()
  showResults.value = true

  const historyRecord = {
    id: Date.now(),
    date: new Date().toISOString(),
    passage: selectedPassage.value.title,
    score: score.value.percentage,
    correct,
    total,
    time: timerSeconds.value,
    details: {
      level: selectedPassage.value.level,
      questionTypes: getPassageQuestionTypes(selectedPassage.value),
      report: practiceReport.value
    }
  }

  try {
    const saved = await addReadingRecord(historyRecord)
    saveReadingHistoryLocal({ ...historyRecord, id: saved.id || historyRecord.id, synced: true })
  } catch {
    saveReadingHistoryLocal(historyRecord)
  }

  incrementDailyStats(toLocalDateKey(), 'reading').catch(() => {})

  // Extract wrong answers as review items
  const wrongItems = []
  for (const q of selectedPassage.value.questions) {
    const answers = userAnswers.value[q.id] || {}
    if (q.type === 'true-false-ng') {
      q.statements.forEach((s, i) => {
        if (!answers[i] || answers[i] !== s.answer) {
          wrongItems.push({ type: 'reading', text: s.text, reason: `正确答案: ${s.answer}，你的答案: ${answers[i] || '未作答'}` })
        }
      })
    } else if (q.type === 'matching') {
      q.answers.forEach((a, i) => {
        const userAns = (answers[i] || '').toUpperCase()
        if (!userAns || userAns !== a.toUpperCase()) {
          wrongItems.push({ type: 'reading', text: q.items[i], reason: `匹配题错误。正确答案: ${a}，你的答案: ${answers[i] || '未作答'}` })
        }
      })
    } else if (q.type === 'short-answer') {
      q.items.forEach((item, i) => {
        const userAns = normalizeShortAnswer(answers[i])
        const correctAns = normalizeShortAnswer(item.answer)
        if (!userAns || userAns !== correctAns) {
          wrongItems.push({ type: 'reading', text: item.question, reason: `正确答案: ${item.answer}，你的答案: ${answers[i] || '未作答'}` })
        }
      })
    } else if (q.type === 'matching-headings') {
      q.answers.forEach((a, i) => {
        const userAns = (answers[i] || '').toLowerCase()
        if (!userAns || userAns !== a.toLowerCase()) {
          wrongItems.push({ type: 'reading', text: `Paragraph ${String.fromCharCode(65 + i)}`, reason: `正确答案: ${a}，你的答案: ${answers[i] || '未作答'}` })
        }
      })
    } else if (q.type === 'multiple-choice') {
      q.items.forEach((item, i) => {
        const userAns = (answers[i] || '').toUpperCase()
        if (!userAns || userAns !== item.answer.toUpperCase()) {
          wrongItems.push({ type: 'reading', text: item.question, reason: `选择题错误。正确答案: ${item.answer}，你的答案: ${answers[i] || '未作答'}` })
        }
      })
    }
  }
  if (wrongItems.length) {
    addReviewItemsFromFeedback({ reviewItems: wrongItems }, { module: 'reading', source: 'reading-mistake' })
  }
}

onMounted(async () => {
  try {
    const bank = await getReadingBank()
    if (bank.length) {
      readingPassages.value = bank
    }
  } catch {
    readingPassages.value = staticReadingPassages
  }

  const localHistory = loadReadingHistory()
  try {
    const serverHistory = await getReadingHistory()
    const history = await migrateLocalReadingHistory(localHistory, serverHistory)
    if (history.length) {
      localStorage.setItem('mamio-reading-history', JSON.stringify(history))
      readingHistory.value = history
    } else {
      readingHistory.value = localHistory
    }
  } catch {
    readingHistory.value = localHistory
  }
})

function normalizeShortAnswer(value) {
  return String(value || '').toLowerCase().trim().replace(/^(a|an|the)\s+/i, '')
}

function isAnswerCorrect(q, index) {
  const answer = getAnswer(q.id, index)
  if (q.type === 'true-false-ng') return answer === q.statements[index].answer
  if (q.type === 'matching') return String(answer || '').toUpperCase() === q.answers[index].toUpperCase()
  if (q.type === 'matching-headings') return String(answer || '').toLowerCase() === q.answers[index].toLowerCase()
  if (q.type === 'short-answer') return normalizeShortAnswer(answer) === normalizeShortAnswer(q.items[index].answer)
  if (q.type === 'multiple-choice') return String(answer || '').toUpperCase() === q.items[index].answer.toUpperCase()
  return false
}

function getQuestionItemCount(q) {
  if (q.type === 'true-false-ng') return q.statements.length
  if (q.type === 'matching' || q.type === 'matching-headings') return q.answers.length
  if (q.type === 'short-answer' || q.type === 'multiple-choice') return q.items.length
  return 0
}

function getBandEstimate(percentage) {
  if (percentage >= 90) return '8.5-9.0'
  if (percentage >= 80) return '7.5-8.0'
  if (percentage >= 70) return '6.5-7.0'
  if (percentage >= 60) return '5.5-6.0'
  if (percentage >= 45) return '4.5-5.0'
  return '<4.5'
}

function buildPracticeReport() {
  const byType = {}
  let unanswered = 0
  let wrong = 0

  for (const q of selectedPassage.value.questions) {
    if (!byType[q.type]) byType[q.type] = { correct: 0, total: 0, unanswered: 0 }
    const count = getQuestionItemCount(q)
    for (let i = 0; i < count; i++) {
      const answer = getAnswer(q.id, i)
      byType[q.type].total++
      if (!answer) {
        unanswered++
        byType[q.type].unanswered++
      } else if (isAnswerCorrect(q, i)) {
        byType[q.type].correct++
      } else {
        wrong++
      }
    }
  }

  const weakTypes = Object.entries(byType)
    .map(([type, data]) => ({ type, ...data, percentage: data.total ? Math.round((data.correct / data.total) * 100) : 0 }))
    .sort((a, b) => a.percentage - b.percentage)

  const targetSeconds = selectedPassage.value.level === 'hard' ? 1200 : selectedPassage.value.level === 'medium' ? 1050 : 900
  const timePressure = timerSeconds.value > targetSeconds
  const recommendation = makeRecommendation(weakTypes, unanswered, timePressure)
  return {
    byType: weakTypes,
    unanswered,
    wrong,
    band: getBandEstimate(score.value.percentage),
    targetTime: targetSeconds,
    timePressure,
    recommendation
  }
}

function makeRecommendation(weakTypes, unanswered, timePressure) {
  const weakest = weakTypes.find(item => item.total > 0 && item.percentage < 80)
  if (unanswered > 0) {
    return themeStore.lang === 'zh'
      ? `先练限时答题：这次有 ${unanswered} 道未完成，下一篇先保证全题作答。`
      : `Prioritise timed completion: ${unanswered} unanswered item(s). Finish every item before optimising accuracy.`
  }
  if (weakest) {
    return themeStore.lang === 'zh'
      ? `下一步重点练 ${getQuestionTypeLabel(weakest.type)}，这类题正确率只有 ${weakest.percentage}%。`
      : `Next focus: ${getQuestionTypeLabel(weakest.type)}. Accuracy for this type was ${weakest.percentage}%.`
  }
  if (timePressure) {
    return themeStore.lang === 'zh'
      ? '正确率不错，但耗时偏长；下一篇练定位速度和略读。'
      : 'Accuracy is solid, but time was high. Practise skimming and locating evidence faster next.'
  }
  return themeStore.lang === 'zh'
    ? '这篇完成质量不错，下一篇可以提高难度或切换到弱题型专项。'
    : 'Good attempt. Move up a level or switch to a weaker question-type drill.'
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
  practiceReport.value = null
  stopTimer()
}

function getLevelLabel(level) {
  const labels = { all: themeStore.lang === 'zh' ? '全部' : 'All', easy: themeStore.lang === 'zh' ? '简单' : 'Easy', medium: themeStore.lang === 'zh' ? '中等' : 'Medium', hard: themeStore.lang === 'zh' ? '困难' : 'Hard' }
  return labels[level] || level
}

function getLevelColor(level) {
  const colors = { easy: 'var(--green)', medium: 'var(--yellow, var(--amber))', hard: 'var(--red)' }
  return colors[level] || 'var(--text-secondary)'
}

function headingValue(heading) {
  return String(heading).split('.')[0].trim()
}

function getQuestionTypeLabel(type) {
  if (type === 'all') return themeStore.lang === 'zh' ? '全部题型' : 'All Types'
  const label = questionTypeLabels[type]
  return themeStore.lang === 'zh' ? label?.zh : label?.en
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
        <div class="bank-toolbar">
          <div>
            <h2>{{ themeStore.lang === 'zh' ? '阅读题库' : 'Reading Bank' }}</h2>
            <p>{{ themeStore.lang === 'zh' ? `${readingPassages.length} 篇 · ${readingPassages.reduce((sum, p) => sum + countPassageQuestions(p), 0)} 道题` : `${readingPassages.length} passages · ${readingPassages.reduce((sum, p) => sum + countPassageQuestions(p), 0)} questions` }}</p>
          </div>
          <div class="bank-actions">
            <button class="random-btn secondary" @click="selectPassage(filteredPassages[Math.floor(Math.random() * filteredPassages.length)] || readingPassages[0])">
              {{ themeStore.lang === 'zh' ? '随机练一篇' : 'Random Practice' }}
            </button>
            <button class="random-btn" @click="selectRecommendedPassage" :disabled="!recommendedPassage">
              {{ themeStore.lang === 'zh' ? '练推荐篇' : 'Practise pick' }}
            </button>
          </div>
        </div>

        <div class="reading-map-card">
          <div class="reading-map-head">
            <div>
              <span class="map-kicker">{{ themeStore.lang === 'zh' ? '训练覆盖' : 'Practice coverage' }}</span>
              <h2>{{ themeStore.lang === 'zh' ? '先补最薄弱难度' : 'Cover the thinnest level first' }}</h2>
            </div>
          </div>
          <p v-if="recommendedPassage" class="map-copy">{{ recommendationCopy }}</p>
          <div class="map-grid">
            <button
              v-for="item in levelCoverage"
              :key="item.level"
              class="map-chip"
              :class="{ active: selectedLevel === item.level }"
              @click="selectedLevel = item.level"
            >
              <span>{{ getLevelLabel(item.level) }}</span>
              <strong>{{ item.done }}/{{ item.total }}</strong>
            </button>
            <button
              v-for="item in questionTypeCoverage"
              :key="item.type"
              class="map-chip type"
              :class="{ active: selectedQuestionType === item.type }"
              @click="selectedQuestionType = item.type"
            >
              <span>{{ getQuestionTypeLabel(item.type) }}</span>
              <strong>{{ item.done }}/{{ item.total }}</strong>
            </button>
          </div>
        </div>

        <div class="filter-row">
          <button v-for="level in levelOptions" :key="level" class="filter-chip" :class="{ active: selectedLevel === level }" @click="selectedLevel = level">
            {{ getLevelLabel(level) }} <span>{{ levelCounts[level] || 0 }}</span>
          </button>
        </div>

        <div class="filter-row">
          <button v-for="type in questionTypeOptions" :key="type" class="filter-chip compact" :class="{ active: selectedQuestionType === type }" @click="selectedQuestionType = type">
            {{ getQuestionTypeLabel(type) }}
          </button>
        </div>

        <div v-if="filteredPassages.length === 0" class="empty-filter">
          {{ themeStore.lang === 'zh' ? '当前筛选下没有文章' : 'No passages match these filters' }}
        </div>

        <div v-if="readingHistory.length" class="history-strip">
          <div class="history-head">
            <h3>{{ themeStore.lang === 'zh' ? '最近阅读记录' : 'Recent Reading' }}</h3>
            <span>{{ readingHistory.slice(0, 5).length }} / {{ readingHistory.length }}</span>
          </div>
          <div class="history-list">
            <router-link v-for="item in readingHistory.slice(0, 5)" :key="item.id" class="history-item" :to="`/reading/history/${item.id}`">
              <strong>{{ item.passage }}</strong>
              <span :style="{ color: getScoreColor(item.score) }">{{ item.score }}%</span>
              <small>{{ formatTime(item.time || 0) }}</small>
            </router-link>
          </div>
        </div>

        <div v-for="p in filteredPassages" :key="p.id" class="passage-card" :class="{ completed: completedPassageTitles.has(p.title) }" @click="selectPassage(p)">
          <div class="passage-info">
            <h3>{{ p.title }}</h3>
            <div class="passage-meta">
              <span class="level-tag" :style="{ color: getLevelColor(p.level), background: getLevelColor(p.level) + '18' }">
                {{ getLevelLabel(p.level) }}
              </span>
              <span v-if="completedPassageTitles.has(p.title)" class="done-tag">{{ themeStore.lang === 'zh' ? '已练' : 'Done' }}</span>
              <span class="question-count">{{ countPassageQuestions(p) }} {{ themeStore.lang === 'zh' ? '题' : 'questions' }}</span>
              <span v-for="type in getPassageQuestionTypes(p)" :key="type" class="type-tag">{{ getQuestionTypeLabel(type) }}</span>
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

              <!-- Matching headings -->
              <div v-if="currentQuestion.type === 'matching-headings'" class="q-matching">
                <div class="heading-bank">
                  <p v-for="heading in currentQuestion.headings" :key="heading">{{ heading }}</p>
                </div>
                <div v-for="(_, i) in currentQuestion.answers" :key="i" class="matching-item">
                  <p class="matching-text">Paragraph {{ String.fromCharCode(65 + i) }}</p>
                  <select :value="getAnswer(currentQuestion.id, i)" @change="setAnswer(currentQuestion.id, i, $event.target.value)" class="matching-select">
                    <option value="">{{ themeStore.lang === 'zh' ? '选择标题' : 'Select heading' }}</option>
                    <option v-for="heading in currentQuestion.headings" :key="heading" :value="headingValue(heading)">{{ heading }}</option>
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
              <span class="time-label">{{ themeStore.lang === 'zh' ? '预估 Band' : 'Band Estimate' }}</span>
              <span class="time-value">{{ practiceReport?.band }}</span>
            </div>
            <div class="result-time">
              <span class="time-label">{{ themeStore.lang === 'zh' ? '用时' : 'Time' }}</span>
              <span class="time-value">{{ formatTime(timerSeconds) }}</span>
            </div>
          </div>

          <div v-if="practiceReport" class="practice-insight">
            <div class="insight-main">
              <span>{{ themeStore.lang === 'zh' ? '下一步' : 'Next Step' }}</span>
              <strong>{{ practiceReport.recommendation }}</strong>
            </div>
            <div class="insight-metrics">
              <div>
                <span>{{ themeStore.lang === 'zh' ? '未完成' : 'Unanswered' }}</span>
                <strong>{{ practiceReport.unanswered }}</strong>
              </div>
              <div>
                <span>{{ themeStore.lang === 'zh' ? '错题' : 'Wrong' }}</span>
                <strong>{{ practiceReport.wrong }}</strong>
              </div>
              <div>
                <span>{{ themeStore.lang === 'zh' ? '目标用时' : 'Target Time' }}</span>
                <strong>{{ formatTime(practiceReport.targetTime) }}</strong>
              </div>
            </div>
          </div>

          <div v-if="practiceReport" class="type-breakdown">
            <div v-for="item in practiceReport.byType" :key="item.type" class="type-row">
              <div>
                <strong>{{ getQuestionTypeLabel(item.type) }}</strong>
                <span>{{ item.correct }}/{{ item.total }} · {{ item.percentage }}%</span>
              </div>
              <div class="type-bar">
                <span :style="{ width: item.percentage + '%', background: getScoreColor(item.percentage) }"></span>
              </div>
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

              <div v-if="q.type === 'matching-headings'" class="result-items">
                <div v-for="(_, i) in q.answers" :key="i" class="result-item" :class="{ correct: (getAnswer(q.id, i) || '').toLowerCase() === q.answers[i].toLowerCase(), wrong: getAnswer(q.id, i) && (getAnswer(q.id, i) || '').toLowerCase() !== q.answers[i].toLowerCase() }">
                  <span class="ri-num">{{ i + 1 }}.</span>
                  <span class="ri-text">Paragraph {{ String.fromCharCode(65 + i) }}</span>
                  <span class="ri-answer">{{ themeStore.lang === 'zh' ? '正确答案' : 'Answer' }}: <strong>{{ q.answers[i] }}</strong></span>
                  <span v-if="getAnswer(q.id, i)" class="ri-yours">
                    {{ themeStore.lang === 'zh' ? '你的' : 'Yours' }}: <strong>{{ getAnswer(q.id, i) }}</strong>
                    <span v-if="(getAnswer(q.id, i) || '').toLowerCase() === q.answers[i].toLowerCase()" class="ri-check">✓</span>
                    <span v-else class="ri-cross">✗</span>
                  </span>
                  <p v-if="q.explanation" class="ri-explain">{{ q.explanation }}</p>
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
  letter-spacing: 0;
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

.bank-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 18px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.bank-toolbar h2 {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.bank-toolbar p {
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

.bank-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.random-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.random-btn:disabled {
  opacity: 0.45;
}

.reading-map-card {
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.reading-map-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.map-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--green);
  font-size: var(--font-size-xs);
  font-weight: 800;
  text-transform: uppercase;
}

.reading-map-head h2 {
  font-size: var(--font-size-lg);
  font-weight: 800;
  letter-spacing: 0;
}

.map-copy {
  margin-bottom: var(--space-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.map-chip {
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

.map-chip.type {
  background: var(--bg-tertiary);
}

.map-chip strong {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.map-chip.active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--text-primary);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.filter-chip.compact {
  font-size: var(--font-size-xs);
  padding: 6px 12px;
}

.filter-chip span {
  margin-left: 4px;
  color: var(--text-tertiary);
}

.filter-chip.active {
  background: var(--black);
  color: var(--white);
}

.filter-chip.active span {
  color: inherit;
  opacity: 0.75;
}

[data-theme="dark"] .filter-chip.active {
  background: var(--white);
  color: var(--black);
}

.empty-filter {
  padding: var(--space-xl);
  text-align: center;
  color: var(--text-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.history-strip {
  padding: var(--space-md);
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
  font-size: var(--font-size-xs);
  font-weight: 900;
}

.history-item small {
  color: var(--text-tertiary);
  font-size: 11px;
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

.passage-card.completed {
  border-left: 4px solid var(--blue);
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

.done-tag {
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--blue-soft);
  color: var(--blue);
}

.question-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.type-tag {
  font-size: 11px;
  padding: 2px 8px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
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
.heading-bank {
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.heading-bank p {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.heading-bank p:last-child {
  margin-bottom: 0;
}

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

.practice-insight {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.insight-main span,
.insight-metrics span {
  display: block;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 800;
  margin-bottom: 4px;
}

.insight-main strong {
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.insight-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.insight-metrics div {
  padding: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.insight-metrics strong {
  font-size: var(--font-size-lg);
  font-weight: 900;
}

.type-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: var(--space-2xl);
}

.type-row {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.type-row div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.type-row strong {
  font-size: var(--font-size-sm);
}

.type-row span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.type-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.type-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
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
  .bank-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .random-btn {
    width: 100%;
  }

  .bank-actions {
    width: 100%;
  }

  .map-chip {
    flex: 1 1 calc(50% - 8px);
    justify-content: space-between;
  }

  .passage-meta {
    flex-wrap: wrap;
  }

  .reading-layout {
    grid-template-columns: 1fr;
  }

  .passage-panel {
    position: static;
  }

  .result-header,
  .practice-insight,
  .insight-metrics {
    grid-template-columns: 1fr;
  }

  .result-header {
    flex-direction: column;
    gap: var(--space-lg);
  }
}
</style>
