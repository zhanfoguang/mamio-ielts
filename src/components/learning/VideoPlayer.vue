<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useLearningStore } from '../../stores/learning'
import { useThemeStore } from '../../stores/theme'
import { sentences } from '../../data/sentences'

const learningStore = useLearningStore()
const themeStore = useThemeStore()
const progressRef = ref(null)

const currentSentence = computed(() => sentences[learningStore.currentSentenceIndex])
const totalSentences = computed(() => sentences.length)

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
let wordInterval = null

function startWordHighlight() {
  clearInterval(wordInterval)
  learningStore.currentWordIndex = -1
  const words = currentSentence.value.words
  const wordDuration = currentSentence.value.duration / words.length / learningStore.playbackSpeed

  wordInterval = setInterval(() => {
    if (learningStore.currentWordIndex < words.length - 1) {
      learningStore.currentWordIndex++
    } else {
      clearInterval(wordInterval)
      setTimeout(() => {
        if (learningStore.currentSentenceIndex < totalSentences.value - 1) {
          learningStore.nextSentence(totalSentences.value)
          if (learningStore.isPlaying) startWordHighlight()
        } else {
          learningStore.pause()
        }
      }, 600)
    }
  }, wordDuration)
}

function togglePlay() {
  learningStore.togglePlay()
  if (learningStore.isPlaying) {
    startWordHighlight()
  } else {
    clearInterval(wordInterval)
  }
}

function goNext() {
  clearInterval(wordInterval)
  learningStore.nextSentence(totalSentences.value)
  if (learningStore.isPlaying) startWordHighlight()
}

function goPrev() {
  clearInterval(wordInterval)
  learningStore.prevSentence()
  if (learningStore.isPlaying) startWordHighlight()
}

function cycleSpeed() {
  const idx = speeds.indexOf(learningStore.playbackSpeed)
  learningStore.setSpeed(speeds[(idx + 1) % speeds.length])
}

function onProgressClick(e) {
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  const newIndex = Math.floor(ratio * totalSentences.value)
  clearInterval(wordInterval)
  learningStore.setSentence(Math.max(0, Math.min(totalSentences.value - 1, newIndex)))
  if (learningStore.isPlaying) startWordHighlight()
}

onUnmounted(() => clearInterval(wordInterval))

watch(() => learningStore.currentSentenceIndex, () => {
  learningStore.currentWordIndex = -1
})
</script>

<template>
  <div class="video-player">
    <div class="player-screen">
      <div class="screen-inner">
        <div v-if="learningStore.subtitleMode !== 'hidden'" class="subtitle-overlay">
          <p v-if="learningStore.subtitleMode !== 'cn'" class="subtitle-en">
            <span
              v-for="(word, i) in currentSentence.words"
              :key="i"
              class="word"
              :class="{ highlight: i === learningStore.currentWordIndex }"
            >{{ word }} </span>
          </p>
          <p v-if="learningStore.subtitleMode !== 'en'" class="subtitle-cn">{{ currentSentence.cn }}</p>
        </div>
        <div v-if="!learningStore.isPlaying" class="play-overlay" @click="togglePlay">
          <span class="play-icon">▶</span>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="progress-track" ref="progressRef" @click="onProgressClick">
        <div class="progress-fill" :style="{ width: ((learningStore.currentSentenceIndex + 1) / totalSentences * 100) + '%' }"></div>
      </div>

      <div class="controls-row">
        <button class="ctrl-btn" @click="goPrev" :disabled="learningStore.currentSentenceIndex === 0">⏮</button>
        <button class="ctrl-btn play-btn" @click="togglePlay">
          {{ learningStore.isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="ctrl-btn" @click="goNext" :disabled="learningStore.currentSentenceIndex >= totalSentences - 1">⏭</button>
        <span class="time">{{ learningStore.currentSentenceIndex + 1 }} / {{ totalSentences }}</span>
        <div class="controls-right">
          <button class="speed-btn" @click="cycleSpeed">{{ learningStore.playbackSpeed }}x</button>
          <button class="mic-btn" :title="themeStore.lang === 'zh' ? '录音' : 'Record'">
            🎤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-player {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #111;
}

.player-screen {
  aspect-ratio: 16 / 9;
  background: #1a1a2e;
  position: relative;
}

.screen-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px;
}

.subtitle-overlay {
  text-align: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-sm);
  max-width: 90%;
}

.subtitle-en {
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  color: white;
  font-weight: 600;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.word {
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.word.highlight {
  background: rgba(74, 222, 128, 0.35);
  color: #4ade80;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
}

.subtitle-cn {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(0,0,0,0.2);
}

.play-icon {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
}

.controls {
  padding: 0 16px 12px;
}

.progress-track {
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  cursor: pointer;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #a78bfa);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn {
  color: white;
  font-size: 0.9rem;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background var(--transition-fast);
}

.ctrl-btn:hover { background: rgba(255,255,255,0.1); }
.ctrl-btn:disabled { opacity: 0.3; }

.play-btn {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time {
  font-size: var(--font-size-xs);
  color: rgba(255,255,255,0.6);
  margin-left: 4px;
}

.controls-right {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.speed-btn {
  padding: 4px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: var(--radius-full);
  color: rgba(255,255,255,0.7);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.mic-btn {
  width: 36px;
  height: 36px;
  background: var(--blue);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  animation: pulse-blue 2s infinite;
}
</style>
