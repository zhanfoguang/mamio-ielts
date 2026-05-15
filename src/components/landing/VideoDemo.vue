<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { sentences } from '../../data/sentences'

const themeStore = useThemeStore()
const currentIndex = ref(0)
const currentWordIndex = ref(-1)
const isPlaying = ref(false)
const subtitleMode = ref('bilingual')
const sectionRef = ref(null)
let wordInterval = null

const modes = ['bilingual', 'en', 'cn', 'hidden']

const currentSentence = computed(() => sentences[currentIndex.value])

function startPlayback() {
  isPlaying.value = true
  currentWordIndex.value = -1
  const words = currentSentence.value.words
  const wordDuration = currentSentence.value.duration / words.length

  wordInterval = setInterval(() => {
    if (currentWordIndex.value < words.length - 1) {
      currentWordIndex.value++
    } else {
      clearInterval(wordInterval)
      setTimeout(() => {
        if (currentIndex.value < sentences.length - 1) {
          currentIndex.value++
          startPlayback()
        } else {
          isPlaying.value = false
          currentIndex.value = 0
          currentWordIndex.value = -1
        }
      }, 500)
    }
  }, wordDuration)
}

function stopPlayback() {
  isPlaying.value = false
  clearInterval(wordInterval)
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

function goToSentence(index) {
  stopPlayback()
  currentIndex.value = index
  currentWordIndex.value = -1
}

let observer = null
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isPlaying.value) {
          startPlayback()
        } else if (!entry.isIntersecting) {
          stopPlayback()
        }
      })
    },
    { threshold: 0.4 }
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onUnmounted(() => {
  stopPlayback()
  if (observer) observer.disconnect()
})
</script>

<template>
  <section class="section video-demo-section" ref="sectionRef">
    <div class="container">
      <div class="section-header">
        <p class="section-label">{{ themeStore.lang === 'zh' ? '演示' : 'DEMO' }}</p>
        <h2 class="section-title">{{ themeStore.lang === 'zh' ? '视频跟读演示' : 'Video Follow-along Demo' }}</h2>
        <p class="section-desc">{{ themeStore.lang === 'zh' ? '逐句播放，逐词高亮，沉浸式跟读体验' : 'Sentence by sentence, word by word highlighting' }}</p>
      </div>

      <div class="demo-layout">
        <div class="video-area">
          <div class="video-placeholder">
            <div class="video-overlay">
              <div v-if="subtitleMode !== 'hidden'" class="subtitle-text">
                <p v-if="subtitleMode !== 'cn'" class="subtitle-en">
                  <span
                    v-for="(word, i) in currentSentence.words"
                    :key="i"
                    class="word"
                    :class="{ highlight: i === currentWordIndex }"
                  >{{ word }} </span>
                </p>
                <p v-if="subtitleMode !== 'en'" class="subtitle-cn">{{ currentSentence.cn }}</p>
              </div>
            </div>
            <div class="video-controls">
              <button class="ctrl-btn" @click="currentIndex > 0 && goToSentence(currentIndex - 1)">⏮</button>
              <button class="ctrl-btn play-btn" @click="togglePlay">
                {{ isPlaying ? '⏸' : '▶' }}
              </button>
              <button class="ctrl-btn" @click="currentIndex < sentences.length - 1 && goToSentence(currentIndex + 1)">⏭</button>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: ((currentIndex + 1) / sentences.length * 100) + '%' }"></div>
              </div>
              <span class="time-display">{{ currentIndex + 1 }} / {{ sentences.length }}</span>
            </div>
          </div>

          <div class="subtitle-modes">
            <button
              v-for="mode in modes"
              :key="mode"
              class="mode-btn"
              :class="{ active: subtitleMode === mode }"
              @click="subtitleMode = mode"
            >
              {{ { bilingual: themeStore.lang === 'zh' ? '双语' : 'Bilingual', en: 'English', cn: themeStore.lang === 'zh' ? '中文' : 'Chinese', hidden: themeStore.lang === 'zh' ? '隐藏' : 'Hidden' }[mode] }}
            </button>
          </div>
        </div>

        <div class="sentence-list">
          <div
            v-for="(s, i) in sentences"
            :key="s.id"
            class="sentence-item"
            :class="{ active: i === currentIndex }"
            @click="goToSentence(i)"
          >
            <span class="sentence-num">{{ i + 1 }}</span>
            <div class="sentence-text">
              <p class="sentence-en">{{ s.en }}</p>
              <p class="sentence-cn">{{ s.cn }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.video-demo-section {
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

.demo-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.video-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-placeholder {
  aspect-ratio: 16 / 9;
  background: #1a1a2e;
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-overlay {
  position: absolute;
  bottom: 60px;
  left: 20px;
  right: 20px;
  text-align: center;
}

.subtitle-en {
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  color: white;
  font-weight: 600;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.word {
  display: inline;
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
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
}

.ctrl-btn {
  color: white;
  font-size: 1rem;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background var(--transition-fast);
}

.ctrl-btn:hover { background: rgba(255,255,255,0.15); }

.play-btn {
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #a78bfa);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.time-display {
  font-size: var(--font-size-xs);
  color: rgba(255,255,255,0.7);
  min-width: 40px;
  text-align: right;
}

.subtitle-modes {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.mode-btn.active {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .mode-btn.active {
  background: var(--white);
  color: var(--black);
}

.sentence-list {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 500px;
}

.sentence-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.sentence-item:hover {
  background: var(--bg-tertiary);
}

.sentence-item.active {
  border-left-color: var(--green);
  background: var(--green-soft);
}

.sentence-num {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: 600;
  min-width: 20px;
  padding-top: 2px;
}

.sentence-en {
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-bottom: 2px;
}

.sentence-cn {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .demo-layout {
    grid-template-columns: 1fr;
  }

  .sentence-list {
    max-height: 260px;
  }
}
</style>
