<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { listeningSections } from '../data/ielts/listening'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { incrementDailyStats } from '../services/progress'
import { addReviewItemsFromFeedback } from '../services/reviewItems'
import { toLocalDateKey } from '../utils/date'

const themeStore = useThemeStore()
const { isListening, transcript, interimTranscript, isSupported, start, stop, reset } = useSpeechRecognition()

const activeSection = ref(0)
const currentSentenceIndex = ref(0)
const isPlaying = ref(false)
const subtitleMode = ref('bilingual')
const showComparison = ref(false)
const autoPlay = ref(false)

const section = computed(() => listeningSections[activeSection.value])
const currentSentence = computed(() => section.value.sentences[currentSentenceIndex.value])

const currentWordIndex = ref(-1)
let currentUtterance = null

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

function startDictation() {
  reset()
  start()
}

function stopDictation() {
  stop()
  showComparison.value = true

  // Save listening practice to history
  if (transcript.value.trim()) {
    const history = JSON.parse(localStorage.getItem('mamio-listening-history') || '[]')
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      section: section.value.title,
      sentence: currentSentence.value.en,
      transcript: transcript.value
    })
    if (history.length > 50) history.length = 50
    localStorage.setItem('mamio-listening-history', JSON.stringify(history))
  }

  incrementDailyStats(toLocalDateKey(), 'listening')

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
onMounted(() => {
  if (ttsSupported) {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
  }
})

onUnmounted(() => stopPlayback())
</script>

<template>
  <div class="listening-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思听力练习' : 'IELTS Listening Practice' }}</h1>

      <!-- Section tabs -->
      <div class="section-tabs">
        <button v-for="(s, i) in listeningSections" :key="s.id" class="section-btn" :class="{ active: activeSection === i }" @click="activeSection = i; currentSentenceIndex = 0; stopPlayback()">
          {{ themeStore.lang === 'zh' ? '第' + s.section + '部分' : 'Section ' + s.section }}
        </button>
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

.section-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-md);
}

.section-btn {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.section-btn.active {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .section-btn.active {
  background: var(--white);
  color: var(--black);
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
  .listening-layout { grid-template-columns: 1fr; }
  .sentence-list { max-height: 240px; }
}
</style>
