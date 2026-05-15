<script setup>
import { ref, computed, watch } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { phonemeExamples } from '../../data/phonemes'

const themeStore = useThemeStore()
const currentWordIndex = ref(0)
const animatedScores = ref([])

const currentWord = computed(() => phonemeExamples[currentWordIndex.value])

const overallScore = computed(() => {
  const phonemes = currentWord.value.phonemes
  return Math.round(phonemes.reduce((sum, p) => sum + p.score, 0) / phonemes.length)
})

function getScoreGradient(score) {
  if (score >= 85) return 'linear-gradient(to top, #22c55e, #4ade80)'
  if (score >= 55) return 'linear-gradient(to top, #eab308, #facc15)'
  return 'linear-gradient(to top, #ef4444, #f87171)'
}

function getScoreColor(score) {
  if (score >= 85) return 'var(--green)'
  if (score >= 55) return 'var(--yellow)'
  return 'var(--red)'
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
    setTimeout(() => { animatedScores.value[i] = p.score }, i * 80 + 100)
  })
}

watch(currentWordIndex, animateScores, { immediate: true })
</script>

<template>
  <div class="phoneme-score">
    <div class="word-tabs">
      <button
        v-for="(ex, i) in phonemeExamples"
        :key="ex.word"
        class="word-tab"
        :class="{ active: currentWordIndex === i }"
        @click="currentWordIndex = i"
      >
        {{ ex.word }}
      </button>
    </div>

    <div class="word-header">
      <h3>{{ currentWord.word }}</h3>
      <span class="phonetic">{{ currentWord.phonetic }}</span>
    </div>

    <div class="phoneme-bars">
      <div v-for="(p, i) in currentWord.phonemes" :key="i" class="bar-wrapper">
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

    <div class="overall">
      <div class="score-circle" :style="{ borderColor: getScoreColor(overallScore) }">
        {{ overallScore }}
      </div>
      <div>
        <div class="overall-label">{{ themeStore.lang === 'zh' ? '综合评分' : 'Overall' }}</div>
        <div class="overall-grade" :style="{ color: getScoreColor(overallScore) }">{{ getGrade(overallScore) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phoneme-score {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.word-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-lg);
}

.word-tab {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
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
  margin-bottom: var(--space-lg);
}

.word-header h3 {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.phonetic {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.phoneme-bars {
  display: flex;
  justify-content: center;
  gap: 10px;
  height: 180px;
  align-items: flex-end;
  margin-bottom: var(--space-lg);
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 50px;
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
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.bar-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.overall {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.score-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.overall-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.overall-grade {
  font-size: var(--font-size-base);
  font-weight: 700;
}
</style>
