<script setup>
import { ref, computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { speakingTopics } from '../data/ielts/speaking'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'
import { scoreSpeaking } from '../services/ai'

const themeStore = useThemeStore()
const { isListening, transcript, interimTranscript, error: speechError, isSupported, start, stop, reset } = useSpeechRecognition()

const activePart = ref(1)
const selectedTopic = ref(null)
const selectedQuestion = ref('')
const showResult = ref(false)
const aiResult = ref(null)
const loading = ref(false)
const showSample = ref(false)

const topics = computed(() => {
  if (activePart.value === 1) return speakingTopics.part1
  if (activePart.value === 2) return speakingTopics.part2
  return speakingTopics.part3
})

function selectTopic(topic) {
  selectedTopic.value = topic
  selectedQuestion.value = activePart.value === 2 ? topic.cueCard : topic.questions[0]
  showResult.value = false
  aiResult.value = null
  reset()
}

function selectQuestion(q) {
  selectedQuestion.value = q
  showResult.value = false
  aiResult.value = null
  reset()
}

function toggleRecording() {
  if (isListening.value) {
    stop()
  } else {
    reset()
    start()
  }
}

async function submitForScoring() {
  if (!transcript.value.trim()) return
  loading.value = true
  try {
    aiResult.value = await scoreSpeaking(selectedQuestion.value, transcript.value, activePart.value)
    showResult.value = true
  } catch (e) {
    aiResult.value = { error: e.response?.data?.error || '评分失败，请稍后重试' }
    showResult.value = true
  } finally {
    loading.value = false
  }
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow)'
  return 'var(--red)'
}
</script>

<template>
  <div class="speaking-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思口语练习' : 'IELTS Speaking Practice' }}</h1>

      <!-- Part selector -->
      <div class="part-tabs">
        <button v-for="p in [1,2,3]" :key="p" class="part-btn" :class="{ active: activePart === p }" @click="activePart = p; selectedTopic = null">
          Part {{ p }}
        </button>
      </div>

      <div class="speaking-layout">
        <!-- Topic list -->
        <div class="topic-sidebar">
          <div v-for="(topic, i) in topics" :key="i" class="topic-item" :class="{ active: selectedTopic === topic }" @click="selectTopic(topic)">
            <span class="topic-label">{{ activePart === 2 ? topic.topic : (topic.topic || themeStore.lang === 'zh' ? '话题' : 'Topic') }}</span>
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

              <!-- Transcript display -->
              <div v-if="transcript || interimTranscript" class="transcript-box">
                <p class="transcript-text">{{ transcript }}<span class="interim">{{ interimTranscript }}</span></p>
              </div>

              <!-- Submit button -->
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
                  <ul>
                    <li v-for="s in aiResult.suggestions" :key="s">{{ s }}</li>
                  </ul>
                </div>

                <div v-if="aiResult.improvedAnswer" class="improved-answer">
                  <h4>{{ themeStore.lang === 'zh' ? '示范回答' : 'Improved Answer' }}</h4>
                  <p>{{ aiResult.improvedAnswer }}</p>
                </div>
              </template>
            </div>

            <!-- Sample answer for Part 2 -->
            <div v-if="activePart === 2 && selectedTopic.sampleAnswer" class="sample-section">
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
    </div>
  </div>
</template>

<style scoped>
.speaking-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.speaking-page h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
}

.part-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-xl);
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
}
</style>
