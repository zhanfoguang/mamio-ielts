<script setup>
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import { sentences } from '../../data/sentences'

const learningStore = useLearningStore()
const currentSentence = computed(() => sentences[learningStore.currentSentenceIndex])
</script>

<template>
  <div class="subtitle-overlay" v-if="learningStore.subtitleMode !== 'hidden'">
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
</template>

<style scoped>
.subtitle-overlay {
  text-align: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-sm);
  max-width: 90%;
  margin: 0 auto;
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
</style>
