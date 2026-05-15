<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { phonemeExamples } from '../../data/phonemes'

const themeStore = useThemeStore()
const currentWordIndex = ref(0)
const animatedScores = ref([])
let cycleInterval = null

const currentWord = computed(() => phonemeExamples[currentWordIndex.value])

function getScoreColor(score) {
  if (score >= 85) return 'var(--green)'
  if (score >= 55) return 'var(--yellow)'
  return 'var(--red)'
}

function getScoreGradient(score) {
  if (score >= 85) return 'linear-gradient(to top, #22c55e, #4ade80)'
  if (score >= 55) return 'linear-gradient(to top, #eab308, #facc15)'
  return 'linear-gradient(to top, #ef4444, #f87171)'
}

function getGrade(score) {
  if (score >= 85) return themeStore.lang === 'zh' ? '优秀' : 'Excellent'
  if (score >= 65) return themeStore.lang === 'zh' ? '良好' : 'Good'
  if (score >= 45) return themeStore.lang === 'zh' ? '一般' : 'Average'
  return themeStore.lang === 'zh' ? '需练习' : 'Needs Practice'
}

function animateScores() {
  const phonemes = currentWord.value.phonemes
  animatedScores.value = phonemes.map(() => 0)
  phonemes.forEach((p, i) => {
    setTimeout(() => {
      animatedScores.value[i] = p.score
    }, i * 100 + 200)
  })
}

function switchWord(index) {
  currentWordIndex.value = index
  animateScores()
}

const overallScore = computed(() => {
  const phonemes = currentWord.value.phonemes
  return Math.round(phonemes.reduce((sum, p) => sum + p.score, 0) / phonemes.length)
})

onMounted(() => {
  animateScores()
  cycleInterval = setInterval(() => {
    currentWordIndex.value = (currentWordIndex.value + 1) % phonemeExamples.length
    animateScores()
  }, 3500)
})

onUnmounted(() => {
  clearInterval(cycleInterval)
})
</script>

<template>
  <section class="section phoneme-section">
    <div class="container">
      <div class="section-header">
        <p class="section-label">{{ themeStore.lang === 'zh' ? '发音评分' : 'PRONUNCIATION' }}</p>
        <h2 class="section-title">{{ themeStore.lang === 'zh' ? '音素级发音评分' : 'Phoneme-level Scoring' }}</h2>
        <p class="section-desc">{{ themeStore.lang === 'zh' ? '不止整句评分，精确到每个音素' : 'Not just sentence scoring, precise to every phoneme' }}</p>
      </div>

      <div class="phoneme-demo">
        <div class="word-tabs">
          <button
            v-for="(ex, i) in phonemeExamples"
            :key="ex.word"
            class="word-tab"
            :class="{ active: currentWordIndex === i }"
            @click="switchWord(i)"
          >
            {{ ex.word }}
          </button>
        </div>

        <div class="phoneme-content">
          <div class="word-header">
            <h3 class="demo-word">{{ currentWord.word }}</h3>
            <span class="phonetic">{{ currentWord.phonetic }}</span>
          </div>

          <div class="phoneme-bars">
            <div
              v-for="(p, i) in currentWord.phonemes"
              :key="i"
              class="phoneme-bar-wrapper"
            >
              <div class="bar-container">
                <div
                  class="bar"
                  :style="{
                    height: animatedScores[i] + '%',
                    background: getScoreGradient(p.score)
                  }"
                >
                  <span class="bar-score">{{ p.score }}</span>
                </div>
              </div>
              <span class="bar-label">{{ p.symbol }}</span>
            </div>
          </div>

          <div class="overall-score">
            <div class="score-circle" :style="{ borderColor: getScoreColor(overallScore) }">
              <span class="score-num">{{ overallScore }}</span>
            </div>
            <div class="score-info">
              <span class="score-label">{{ themeStore.lang === 'zh' ? '综合评分' : 'Overall Score' }}</span>
              <span class="score-grade" :style="{ color: getScoreColor(overallScore) }">{{ getGrade(overallScore) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.phoneme-section {
  background: var(--bg-secondary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.section-desc {
  margin-left: auto;
  margin-right: auto;
}

.phoneme-demo {
  max-width: 700px;
  margin: 0 auto;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.word-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: var(--space-xl);
}

.word-tab {
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.word-tab.active {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .word-tab.active {
  background: var(--white);
  color: var(--black);
}

.word-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.demo-word {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.phonetic {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
}

.phoneme-bars {
  display: flex;
  justify-content: center;
  gap: 12px;
  height: 200px;
  align-items: flex-end;
  margin-bottom: var(--space-xl);
}

.phoneme-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 60px;
  height: 100%;
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  transition: height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  min-height: 4px;
}

.bar-score {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.bar-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.overall-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.score-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-num {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.score-info {
  display: flex;
  flex-direction: column;
}

.score-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.score-grade {
  font-size: var(--font-size-lg);
  font-weight: 700;
}

@media (max-width: 480px) {
  .phoneme-demo { padding: var(--space-lg); }
  .phoneme-bars { height: 160px; gap: 8px; }
}
</style>
