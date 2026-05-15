<script setup>
import { ref, computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { vocabTopics } from '../data/ielts/vocabulary'
import { generateVocab } from '../services/ai'

const themeStore = useThemeStore()
const activeTopic = ref(0)
const flippedCards = ref(new Set())
const aiWords = ref([])
const loadingAi = ref(false)

const currentTopic = computed(() => vocabTopics[activeTopic.value])

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
    const result = await generateVocab(currentTopic.value.topic)
    aiWords.value = result.words || []
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
</script>

<template>
  <div class="vocab-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思词汇' : 'IELTS Vocabulary' }}</h1>

      <!-- Topic tabs -->
      <div class="topic-tabs">
        <button v-for="(topic, i) in vocabTopics" :key="topic.topic" class="topic-btn" :class="{ active: activeTopic === i }" @click="activeTopic = i; aiWords = []">
          <span class="topic-icon">{{ topic.icon }}</span>
          {{ topic.topic }}
        </button>
      </div>

      <div class="topic-header">
        <h2>{{ currentTopic.icon }} {{ currentTopic.topic }}</h2>
        <button class="ai-gen-btn" @click="generateMore" :disabled="loadingAi">
          {{ loadingAi ? '...' : (themeStore.lang === 'zh' ? 'AI 生成更多' : 'AI Generate More') }}
        </button>
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
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
}

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
}

.topic-header h2 { font-size: var(--font-size-xl); font-weight: 700; }

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
  letter-spacing: -0.02em;
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

.card-back .flip-hint { color: rgba(255,255,255,0.4); }
[data-theme="dark"] .card-back .flip-hint { color: rgba(0,0,0,0.4); }

.ai-section {
  margin-top: var(--space-xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.ai-section h3 { font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-md); }

@media (max-width: 480px) {
  .word-grid { grid-template-columns: 1fr; }
}
</style>
