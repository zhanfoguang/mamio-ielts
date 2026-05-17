<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { vocabTopics } from '../data/ielts/vocabulary'
import { generateVocab } from '../services/ai'
import { getVocabProgress, updateVocabProgress } from '../services/progress'

const themeStore = useThemeStore()

// Mode: browse, quiz, srs, daily
const mode = ref('browse')
const activeTopic = ref(0)
const flippedCards = ref(new Set())
const aiWords = ref([])
const loadingAi = ref(false)

// SRS state (SM-2 algorithm)
const srsData = ref(JSON.parse(localStorage.getItem('mamio-vocab-srs') || '{}'))
const srsQueue = ref([])
const srsIndex = ref(0)
const showSrsAnswer = ref(false)

// Load SRS from API on mount
onMounted(async () => {
  try {
    const apiData = await getVocabProgress()
    if (apiData.length > 0) {
      const merged = { ...srsData.value }
      for (const row of apiData) {
        const key = row.word.toLowerCase()
        const existing = merged[key]
        // Use API data if it's newer or local doesn't have it
        if (!existing || (row.last_review && row.last_review > (existing.lastReview || 0))) {
          merged[key] = {
            ease: row.ease,
            interval: row.interval,
            reps: row.reps,
            due: row.due,
            lastReview: row.last_review
          }
        }
      }
      srsData.value = merged
      localStorage.setItem('mamio-vocab-srs', JSON.stringify(merged))
    }
  } catch {
    // API failed, localStorage data already loaded
  }
})

// Quiz state
const quizType = ref('choice') // choice, spelling, meaning
const quizQuestions = ref([])
const quizIndex = ref(0)
const quizAnswer = ref('')
const quizResult = ref(null) // null, 'correct', 'wrong'
const quizScore = ref({ correct: 0, total: 0 })
const quizDone = ref(false)

// Saved AI words
const savedAiWords = ref(JSON.parse(localStorage.getItem('mamio-vocab-ai') || '[]'))

// Daily words state
const dailyGoal = 10
const today = new Date().toISOString().split('T')[0]
const dailyProgress = ref(JSON.parse(localStorage.getItem('mamio-vocab-daily') || '{}'))
const vocabStreak = ref(JSON.parse(localStorage.getItem('mamio-vocab-streak') || '{"count":0,"lastDate":""}'))

// Daily recommendations
const dailyWords = computed(() => {
  const learned = Object.keys(srsData.value)
  const allWords = vocabTopics.flatMap(t => t.words)
  const unseen = allWords.filter(w => !learned.includes(w.word.toLowerCase()))
  // Mix: 5 new words + 5 due for review
  const newWords = unseen.sort(() => Math.random() - 0.5).slice(0, 5)
  const due = getDueWords().slice(0, 5)
  const combined = [...newWords, ...due]
  // Deduplicate
  const seen = new Set()
  return combined.filter(w => {
    if (seen.has(w.word.toLowerCase())) return false
    seen.add(w.word.toLowerCase())
    return true
  }).slice(0, dailyGoal)
})

const todayStudied = computed(() => {
  return dailyProgress.value[today] || 0
})

function updateDailyProgress() {
  dailyProgress.value[today] = (dailyProgress.value[today] || 0) + 1
  localStorage.setItem('mamio-vocab-daily', JSON.stringify(dailyProgress.value))
  updateVocabStreak()
}

function updateVocabStreak() {
  if (vocabStreak.value.lastDate === today) return
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (vocabStreak.value.lastDate === yesterday) {
    vocabStreak.value.count++
  } else {
    vocabStreak.value.count = 1
  }
  vocabStreak.value.lastDate = today
  localStorage.setItem('mamio-vocab-streak', JSON.stringify(vocabStreak.value))
}

const currentTopic = computed(() => vocabTopics[activeTopic.value])

const allCurrentWords = computed(() => {
  const base = currentTopic.value?.words || []
  const ai = aiWords.value.length ? aiWords.value : []
  return [...base, ...ai]
})

// Stats
const stats = computed(() => {
  const data = srsData.value
  let newCount = 0, learning = 0, mastered = 0
  for (const topic of vocabTopics) {
    for (const w of topic.words) {
      const key = w.word.toLowerCase()
      if (!data[key]) {
        newCount++
      } else if (data[key].ease < 2.5 || data[key].interval < 21) {
        learning++
      } else {
        mastered++
      }
    }
  }
  return { newCount, learning, mastered, total: newCount + learning + mastered }
})

// SRS functions (SM-2)
function getSrsKey(word) {
  return word.toLowerCase().trim()
}

function getDueWords() {
  const now = Date.now()
  const due = []
  for (const topic of vocabTopics) {
    for (const w of topic.words) {
      const key = getSrsKey(w.word)
      const entry = srsData.value[key]
      if (!entry || entry.due <= now) {
        due.push(w)
      }
    }
  }
  return due
}

function startSrs() {
  srsQueue.value = getDueWords()
  if (srsQueue.value.length === 0) {
    // All words reviewed, reset queue
    srsQueue.value = allCurrentWords.value.slice(0, 10)
  }
  srsIndex.value = 0
  showSrsAnswer.value = false
  mode.value = 'srs'
}

function rateSrs(quality) {
  // quality: 0 = again, 3 = hard, 4 = good, 5 = easy
  const word = srsQueue.value[srsIndex.value]
  if (!word) return
  const key = getSrsKey(word.word)
  const entry = srsData.value[key] || { ease: 2.5, interval: 0, due: 0, reps: 0 }

  if (quality < 3) {
    // Failed - reset
    entry.interval = 1
    entry.reps = 0
  } else {
    if (entry.reps === 0) {
      entry.interval = 1
    } else if (entry.reps === 1) {
      entry.interval = 6
    } else {
      entry.interval = Math.round(entry.interval * entry.ease)
    }
    entry.reps++
  }

  // Update ease factor
  entry.ease = Math.max(1.3, entry.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  entry.due = Date.now() + entry.interval * 24 * 60 * 60 * 1000
  entry.lastReview = Date.now()

  srsData.value[key] = entry
  localStorage.setItem('mamio-vocab-srs', JSON.stringify(srsData.value))
  updateDailyProgress()

  // Save to API (fire-and-forget)
  updateVocabProgress({
    word: word.word,
    ease: entry.ease,
    interval: entry.interval,
    reps: entry.reps,
    due: entry.due,
    last_review: entry.lastReview
  }).catch(() => {})

  // Next card
  showSrsAnswer.value = false
  if (srsIndex.value < srsQueue.value.length - 1) {
    srsIndex.value++
  } else {
    // Queue done
    mode.value = 'browse'
  }
}

// Quiz functions
function startQuiz(type) {
  quizType.value = type
  const words = allCurrentWords.value
  if (words.length < 4) return

  // All words pool for distractors (from all topics)
  const allPool = vocabTopics.flatMap(t => t.words)

  // Generate 10 questions
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 10)
  quizQuestions.value = shuffled.map(w => {
    if (type === 'choice') {
      // Wrong options from ALL topics, not just current
      const others = allPool.filter(x => x.word !== w.word).sort(() => Math.random() - 0.5).slice(0, 3)
      const options = [w.meaning, ...others.map(o => o.meaning)].sort(() => Math.random() - 0.5)
      return { word: w, options, answer: w.meaning }
    } else if (type === 'spelling') {
      return { word: w, prompt: w.meaning, answer: w.word }
    } else {
      return { word: w, prompt: w.word, answer: w.meaning }
    }
  })
  quizIndex.value = 0
  quizAnswer.value = ''
  quizResult.value = null
  quizScore.value = { correct: 0, total: 0 }
  quizDone.value = false
  mode.value = 'quiz'
}

function checkQuizAnswer(selected) {
  if (quizResult.value !== null) return
  const q = quizQuestions.value[quizIndex.value]
  const isCorrect = quizType.value === 'choice'
    ? selected === q.answer
    : quizAnswer.value.trim().toLowerCase() === q.answer.toLowerCase()

  quizResult.value = isCorrect ? 'correct' : 'wrong'
  quizScore.value.total++
  if (isCorrect) quizScore.value.correct++
}

function nextQuizQuestion() {
  quizResult.value = null
  quizAnswer.value = ''
  if (quizIndex.value < quizQuestions.value.length - 1) {
    quizIndex.value++
  } else {
    quizDone.value = true
  }
}

// Card functions
function toggleFlip(index) {
  if (flippedCards.value.has(index)) {
    flippedCards.value.delete(index)
  } else {
    flippedCards.value.add(index)
  }
}

function isFlipped(index) {
  return flippedCards.value.has(index)
}

async function generateMore() {
  loadingAi.value = true
  try {
    const result = await generateVocab(currentTopic.value.topic, undefined, themeStore.lang)
    aiWords.value = result.words || []
    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('mamio-vocab-ai') || '[]')
    const newWords = (result.words || []).filter(w => !existing.find(e => e.word === w.word))
    if (newWords.length) {
      const updated = [...existing, ...newWords].slice(-100) // Keep max 100
      localStorage.setItem('mamio-vocab-ai', JSON.stringify(updated))
      savedAiWords.value = updated
    }
  } catch {
    aiWords.value = []
  } finally {
    loadingAi.value = false
  }
}

function getBandColor(band) {
  if (band >= 8) return 'var(--purple)'
  if (band >= 7) return 'var(--blue)'
  if (band >= 6) return 'var(--green)'
  return 'var(--text-tertiary)'
}

watch(activeTopic, () => {
  aiWords.value = []
  flippedCards.value = new Set()
})
</script>

<template>
  <div class="vocab-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思词汇' : 'IELTS Vocabulary' }}</h1>

      <!-- Daily words card -->
      <div class="daily-card">
        <div class="daily-top">
          <div>
            <h3>{{ themeStore.lang === 'zh' ? '今日词汇' : "Today's Words" }}</h3>
            <p class="daily-sub">{{ themeStore.lang === 'zh' ? `目标 ${dailyGoal} 个词` : `Goal: ${dailyGoal} words` }}</p>
          </div>
          <div class="daily-stats">
            <div class="daily-count">
              <span class="daily-num">{{ todayStudied }}</span>
              <span class="daily-label">/ {{ dailyGoal }}</span>
            </div>
            <div class="daily-streak">
              🔥 {{ vocabStreak.count }} {{ themeStore.lang === 'zh' ? '天' : 'days' }}
            </div>
          </div>
        </div>
        <div class="daily-progress-bar">
          <div class="daily-progress-fill" :style="{ width: Math.min(100, (todayStudied / dailyGoal) * 100) + '%' }"></div>
        </div>
        <button class="daily-btn" @click="mode = 'daily'">
          {{ themeStore.lang === 'zh' ? '开始今日学习' : 'Start Daily Review' }}
          <span class="daily-btn-count">{{ dailyWords.length }} {{ themeStore.lang === 'zh' ? '个待学' : 'words' }}</span>
        </button>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-num new">{{ stats.newCount }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '待学习' : 'New' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-num learning">{{ stats.learning }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '学习中' : 'Learning' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-num mastered">{{ stats.mastered }}</span>
          <span class="stat-label">{{ themeStore.lang === 'zh' ? '已掌握' : 'Mastered' }}</span>
        </div>
        <div class="stat-actions">
          <button class="mode-btn" :class="{ active: mode === 'srs' }" @click="startSrs">
            {{ themeStore.lang === 'zh' ? '间隔复习' : 'SRS Review' }}
            <span v-if="getDueWords().length" class="due-badge">{{ getDueWords().length }}</span>
          </button>
        </div>
      </div>

      <!-- Mode: Browse -->
      <template v-if="mode === 'browse'">
        <!-- Topic tabs -->
        <div class="topic-tabs">
          <button v-for="(topic, i) in vocabTopics" :key="topic.topic" class="topic-btn" :class="{ active: activeTopic === i }" @click="activeTopic = i; aiWords = []">
            <span class="topic-icon">{{ topic.icon }}</span>
            {{ topic.topic }}
          </button>
        </div>

        <div class="topic-header">
          <h2>{{ currentTopic.icon }} {{ currentTopic.topic }}</h2>
          <div class="topic-actions">
            <button class="quiz-btn" @click="startQuiz('choice')">
              {{ themeStore.lang === 'zh' ? '选择题测验' : 'Quiz' }}
            </button>
            <button class="ai-gen-btn" @click="generateMore" :disabled="loadingAi">
              {{ loadingAi ? '...' : (themeStore.lang === 'zh' ? 'AI 生成更多' : 'AI Generate') }}
            </button>
          </div>
        </div>

        <!-- Word cards -->
        <div class="word-grid">
          <div v-for="(word, i) in currentTopic.words" :key="i" class="word-card" :class="{ flipped: isFlipped(i) }" @click="toggleFlip(i)">
            <div class="card-inner">
              <div class="card-front">
                <span class="band-badge" :style="{ color: getBandColor(word.band) }">Band {{ word.band }}</span>
                <h3 class="card-word">{{ word.word }}</h3>
                <p class="card-phonetic">{{ word.phonetic }}</p>
                <p class="flip-hint">{{ themeStore.lang === 'zh' ? '点击翻转' : 'Tap to flip' }}</p>
              </div>
              <div class="card-back">
                <h3 class="card-meaning">{{ word.meaning }}</h3>
                <p class="card-example">"{{ word.example }}"</p>
                <div class="card-collocations">
                  <span v-for="c in word.collocations" :key="c" class="col-tag">{{ c }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI generated words -->
        <div v-if="aiWords.length" class="ai-section">
          <h3>{{ themeStore.lang === 'zh' ? 'AI 生成词汇' : 'AI Generated Words' }}</h3>
          <div class="word-grid">
            <div v-for="(word, i) in aiWords" :key="'ai-' + i" class="word-card" :class="{ flipped: isFlipped('ai-' + i) }" @click="toggleFlip('ai-' + i)">
              <div class="card-inner">
                <div class="card-front">
                  <span class="band-badge" :style="{ color: getBandColor(word.band) }">Band {{ word.band }}</span>
                  <h3 class="card-word">{{ word.word }}</h3>
                  <p class="card-phonetic">{{ word.phonetic }}</p>
                </div>
                <div class="card-back">
                  <h3 class="card-meaning">{{ word.meaning }}</h3>
                  <p class="card-example">"{{ word.example }}"</p>
                  <div class="card-collocations">
                    <span v-for="c in word.collocations" :key="c" class="col-tag">{{ c }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Mode: Daily Words -->
      <template v-if="mode === 'daily'">
        <div class="srs-header">
          <h2>{{ themeStore.lang === 'zh' ? '今日词汇学习' : "Today's Word Study" }}</h2>
          <button class="back-btn" @click="mode = 'browse'">{{ themeStore.lang === 'zh' ? '返回' : 'Back' }}</button>
        </div>

        <div v-if="dailyWords.length === 0" class="srs-empty">
          <p>{{ themeStore.lang === 'zh' ? '今日词汇已全部学完！' : "All today's words completed!" }}</p>
        </div>

        <div v-else class="daily-words-grid">
          <div v-for="(w, i) in dailyWords" :key="w.word" class="daily-word-card" :class="{ flipped: flippedCards.has('daily-' + i) }" @click="toggleFlip('daily-' + i)">
            <div class="dwc-front">
              <span class="band-badge" :style="{ color: getBandColor(w.band) }">Band {{ w.band }}</span>
              <h4>{{ w.word }}</h4>
              <p class="dwc-phonetic">{{ w.phonetic }}</p>
            </div>
            <div class="dwc-back">
              <p class="dwc-meaning">{{ w.meaning }}</p>
              <p class="dwc-example">"{{ w.example }}"</p>
              <div class="dwc-collocations">
                <span v-for="c in w.collocations" :key="c" class="col-tag">{{ c }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="dailyWords.length > 0" class="daily-actions">
          <button class="srs-show-btn" @click="startSrs">
            {{ themeStore.lang === 'zh' ? '开始间隔复习' : 'Start SRS Review' }}
          </button>
        </div>
      </template>

      <!-- Mode: SRS Review -->
      <template v-if="mode === 'srs'">
        <div class="srs-header">
          <h2>{{ themeStore.lang === 'zh' ? '间隔复习' : 'Spaced Repetition Review' }}</h2>
          <button class="back-btn" @click="mode = 'browse'">{{ themeStore.lang === 'zh' ? '返回浏览' : 'Back' }}</button>
        </div>

        <div v-if="srsQueue.length === 0" class="srs-empty">
          <p>{{ themeStore.lang === 'zh' ? '没有需要复习的词汇！' : 'No words due for review!' }}</p>
        </div>

        <template v-else>
          <div class="srs-progress">
            {{ srsIndex + 1 }} / {{ srsQueue.length }}
          </div>

          <div class="srs-card" v-if="srsQueue[srsIndex]">
            <div class="srs-front">
              <span class="band-badge" :style="{ color: getBandColor(srsQueue[srsIndex].band) }">Band {{ srsQueue[srsIndex].band }}</span>
              <h3 class="srs-word">{{ srsQueue[srsIndex].word }}</h3>
              <p class="srs-phonetic">{{ srsQueue[srsIndex].phonetic }}</p>
            </div>

            <div v-if="showSrsAnswer" class="srs-back">
              <h3 class="srs-meaning">{{ srsQueue[srsIndex].meaning }}</h3>
              <p class="srs-example">"{{ srsQueue[srsIndex].example }}"</p>
              <div class="srs-collocations">
                <span v-for="c in srsQueue[srsIndex].collocations" :key="c" class="col-tag">{{ c }}</span>
              </div>
            </div>

            <div class="srs-actions">
              <button v-if="!showSrsAnswer" class="srs-show-btn" @click="showSrsAnswer = true">
                {{ themeStore.lang === 'zh' ? '显示释义' : 'Show Answer' }}
              </button>
              <template v-else>
                <button class="srs-rate-btn again" @click="rateSrs(0)">{{ themeStore.lang === 'zh' ? '不认识' : 'Again' }}</button>
                <button class="srs-rate-btn hard" @click="rateSrs(3)">{{ themeStore.lang === 'zh' ? '困难' : 'Hard' }}</button>
                <button class="srs-rate-btn good" @click="rateSrs(4)">{{ themeStore.lang === 'zh' ? '认识' : 'Good' }}</button>
                <button class="srs-rate-btn easy" @click="rateSrs(5)">{{ themeStore.lang === 'zh' ? '简单' : 'Easy' }}</button>
              </template>
            </div>
          </div>
        </template>
      </template>

      <!-- Mode: Quiz -->
      <template v-if="mode === 'quiz'">
        <div class="quiz-header">
          <h2>{{ themeStore.lang === 'zh' ? '词汇测验' : 'Vocabulary Quiz' }}</h2>
          <button class="back-btn" @click="mode = 'browse'">{{ themeStore.lang === 'zh' ? '返回浏览' : 'Back' }}</button>
        </div>

        <div v-if="!quizDone" class="quiz-area">
          <div class="quiz-progress">
            {{ quizIndex + 1 }} / {{ quizQuestions.length }}
            <span class="quiz-score">{{ quizScore.correct }}/{{ quizScore.total }}</span>
          </div>

          <div v-if="quizQuestions[quizIndex]" class="quiz-card">
            <p class="quiz-prompt">
              <template v-if="quizType === 'choice'">
                "{{ quizQuestions[quizIndex].word.word }}" {{ themeStore.lang === 'zh' ? '的意思是？' : 'means:' }}
              </template>
              <template v-else-if="quizType === 'spelling'">
                {{ themeStore.lang === 'zh' ? '拼写这个词：' : 'Spell this word: ' }}{{ quizQuestions[quizIndex].prompt }}
              </template>
              <template v-else>
                "{{ quizQuestions[quizIndex].prompt }}" {{ themeStore.lang === 'zh' ? '的中文意思是？' : 'in Chinese:' }}
              </template>
            </p>

            <!-- Choice mode -->
            <div v-if="quizType === 'choice'" class="quiz-options">
              <button
                v-for="opt in quizQuestions[quizIndex].options"
                :key="opt"
                class="quiz-option"
                :class="{
                  correct: quizResult !== null && opt === quizQuestions[quizIndex].answer,
                  wrong: quizResult === 'wrong' && quizAnswer === opt && opt !== quizQuestions[quizIndex].answer,
                  selected: quizAnswer === opt
                }"
                @click="quizAnswer = opt; checkQuizAnswer(opt)"
                :disabled="quizResult !== null"
              >
                {{ opt }}
              </button>
            </div>

            <!-- Text input modes -->
            <div v-else class="quiz-input-area">
              <input
                v-model="quizAnswer"
                class="quiz-input"
                :placeholder="themeStore.lang === 'zh' ? '输入答案...' : 'Type your answer...'"
                @keyup.enter="checkQuizAnswer()"
                :disabled="quizResult !== null"
              />
              <button v-if="!quizResult" class="quiz-submit" @click="checkQuizAnswer()" :disabled="!quizAnswer.trim()">
                {{ themeStore.lang === 'zh' ? '确认' : 'Submit' }}
              </button>
            </div>

            <!-- Result -->
            <div v-if="quizResult" class="quiz-result" :class="quizResult">
              <p v-if="quizResult === 'correct'">{{ themeStore.lang === 'zh' ? '正确！' : 'Correct!' }}</p>
              <p v-else>{{ themeStore.lang === 'zh' ? '错误。正确答案：' : 'Wrong. Answer: ' }} <strong>{{ quizQuestions[quizIndex].answer }}</strong></p>
              <button class="quiz-next" @click="nextQuizQuestion">
                {{ quizIndex < quizQuestions.length - 1 ? (themeStore.lang === 'zh' ? '下一题' : 'Next') : (themeStore.lang === 'zh' ? '查看结果' : 'See Results') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Quiz results -->
        <div v-else class="quiz-results">
          <div class="result-circle">
            <span class="result-pct">{{ Math.round(quizScore.correct / quizScore.total * 100) }}%</span>
            <span class="result-detail">{{ quizScore.correct }}/{{ quizScore.total }}</span>
          </div>
          <p class="result-message">
            {{ quizScore.correct === quizScore.total ? (themeStore.lang === 'zh' ? '完美！' : 'Perfect!') : quizScore.correct >= quizScore.total * 0.7 ? (themeStore.lang === 'zh' ? '不错！继续加油' : 'Well done!') : (themeStore.lang === 'zh' ? '还需要多练习' : 'Keep practicing!') }}
          </p>
          <div class="result-actions">
            <button class="quiz-btn" @click="startQuiz(quizType)">{{ themeStore.lang === 'zh' ? '再试一次' : 'Try Again' }}</button>
            <button class="back-btn" @click="mode = 'browse'">{{ themeStore.lang === 'zh' ? '返回浏览' : 'Back' }}</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.vocab-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.vocab-page h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: var(--space-lg);
}

/* Stats */
.stats-bar {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  padding: 16px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xl);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.stat-num.new { color: var(--text-secondary); }
.stat-num.learning { color: var(--yellow); }
.stat-num.mastered { color: var(--green); }

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.stat-actions { margin-left: auto; }

.mode-btn {
  position: relative;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--purple-soft);
  color: var(--purple);
  border: 1px solid var(--purple);
}

.due-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--red);
  color: white;
  font-size: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Topic tabs */
.topic-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.topic-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.topic-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .topic-btn.active { background: var(--white); color: var(--black); }

.topic-icon { font-size: 1rem; }

.topic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: 12px;
}

.topic-header h2 { font-size: var(--font-size-xl); font-weight: 700; }

.topic-actions { display: flex; gap: 8px; }

.quiz-btn {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--blue-soft);
  color: var(--blue);
  border: 1px solid var(--blue);
}

.ai-gen-btn {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--purple-soft);
  color: var(--purple);
  border: 1px solid var(--purple);
}

.ai-gen-btn:disabled { opacity: 0.5; }

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: var(--space-xl);
}

.word-card {
  aspect-ratio: 3 / 2;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}

.word-card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  text-align: center;
}

.card-front {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.card-back {
  background: var(--black);
  color: var(--white);
  transform: rotateY(180deg);
}

[data-theme="dark"] .card-back {
  background: var(--white);
  color: var(--black);
}

.band-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  margin-bottom: 4px;
}

.card-word {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: 0;
}

.card-phonetic {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-style: italic;
}

.flip-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: auto;
}

.card-meaning { font-size: var(--font-size-lg); font-weight: 700; margin-bottom: 8px; }
.card-example { font-size: var(--font-size-xs); color: rgba(255,255,255,0.7); font-style: italic; margin-bottom: 10px; max-width: 220px; }
[data-theme="dark"] .card-example { color: rgba(0,0,0,0.6); }

.card-collocations { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.col-tag {
  padding: 2px 8px;
  background: rgba(255,255,255,0.15);
  border-radius: var(--radius-full);
  font-size: 10px;
}
[data-theme="dark"] .col-tag { background: rgba(0,0,0,0.1); }

.ai-section {
  margin-top: var(--space-xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.ai-section h3 { font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-md); }

/* SRS */
.srs-header, .quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.srs-header h2, .quiz-header h2 { font-size: var(--font-size-xl); font-weight: 700; }

.back-btn {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.srs-progress, .quiz-progress {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-md);
}

.quiz-score {
  margin-left: 12px;
  font-weight: 600;
  color: var(--blue);
}

/* Daily card */
.daily-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.daily-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.daily-top h3 { font-weight: 700; font-size: var(--font-size-base); }
.daily-sub { font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 2px; }

.daily-stats {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.daily-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.daily-num { font-size: var(--font-size-2xl); font-weight: 800; }
.daily-label { font-size: var(--font-size-sm); color: var(--text-tertiary); }

.daily-streak {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.daily-progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--space-md);
}

.daily-progress-fill {
  height: 100%;
  background: var(--green);
  border-radius: 3px;
  transition: width var(--transition-base);
}

.daily-btn {
  width: 100%;
  padding: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background var(--transition-fast);
}

.daily-btn:hover { background: var(--border-color); }

.daily-btn-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

/* Daily words grid */
.daily-words-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: var(--space-xl);
}

.daily-word-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 120px;
}

.daily-word-card:hover { box-shadow: var(--shadow-md); }

.daily-word-card h4 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin: 8px 0 4px;
}

.dwc-phonetic {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-style: italic;
}

.daily-word-card .dwc-back {
  display: none;
}

.daily-word-card.flipped .dwc-front { display: none; }
.daily-word-card.flipped .dwc-back { display: block; }

.dwc-meaning {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 8px;
}

.dwc-example {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
  margin-bottom: 8px;
  line-height: 1.5;
}

.dwc-collocations {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.daily-actions {
  text-align: center;
}

.srs-empty {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-lg);
}

.srs-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.srs-front { margin-bottom: var(--space-lg); }
.srs-word { font-size: 32px; font-weight: 800; margin: 12px 0 4px; }
.srs-phonetic { font-size: var(--font-size-sm); color: var(--text-tertiary); font-style: italic; }

.srs-back {
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
  margin-bottom: var(--space-lg);
}

.srs-meaning { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: 8px; }
.srs-example { font-size: var(--font-size-sm); color: var(--text-secondary); font-style: italic; margin-bottom: 12px; }
.srs-collocations { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: var(--space-md); }

.srs-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.srs-show-btn {
  padding: 12px 32px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
  background: var(--blue);
  color: white;
}

.srs-rate-btn {
  padding: 10px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.srs-rate-btn.again { background: var(--red-soft); color: var(--red); border: 1px solid var(--red); }
.srs-rate-btn.hard { background: var(--yellow-soft, #fef3c7); color: var(--yellow, #d97706); border: 1px solid var(--yellow, #d97706); }
.srs-rate-btn.good { background: var(--green-soft); color: var(--green); border: 1px solid var(--green); }
.srs-rate-btn.easy { background: var(--blue-soft); color: var(--blue); border: 1px solid var(--blue); }

/* Quiz */
.quiz-area {
  max-width: 600px;
  margin: 0 auto;
}

.quiz-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.quiz-prompt {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-xl);
  text-align: center;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-option {
  padding: 14px 20px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  text-align: left;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.quiz-option:hover:not(:disabled) { background: var(--border-color); }

.quiz-option.correct { background: var(--green-soft); color: var(--green); font-weight: 600; }
.quiz-option.wrong { background: var(--red-soft); color: var(--red); }
.quiz-option.selected:not(.correct):not(.wrong) { border: 2px solid var(--blue); }

.quiz-input-area {
  display: flex;
  gap: 10px;
}

.quiz-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: transparent;
  color: var(--text-primary);
  outline: none;
}

.quiz-input:focus { border-color: var(--blue); }

.quiz-submit {
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 700;
  background: var(--blue);
  color: white;
}

.quiz-submit:disabled { opacity: 0.5; }

.quiz-result {
  margin-top: var(--space-lg);
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: center;
}

.quiz-result.correct { background: var(--green-soft); color: var(--green); }
.quiz-result.wrong { background: var(--red-soft); color: var(--red); }

.quiz-result strong { font-weight: 700; }

.quiz-next {
  margin-top: 12px;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .quiz-next { background: var(--white); color: var(--black); }

/* Quiz results */
.quiz-results {
  text-align: center;
  padding: var(--space-3xl);
}

.result-circle {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--green);
  margin-bottom: var(--space-lg);
}

.result-pct {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--green);
}

.result-detail {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.result-message {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-xl);
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 480px) {
  .word-grid { grid-template-columns: 1fr; }
  .stats-bar { flex-wrap: wrap; gap: 12px; }
}
</style>
