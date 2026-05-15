<script setup>
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import { sentences } from '../../data/sentences'

const learningStore = useLearningStore()

function selectSentence(index) {
  learningStore.setSentence(index)
}
</script>

<template>
  <div class="sentence-list">
    <div
      v-for="(s, i) in sentences"
      :key="s.id"
      class="sentence-item"
      :class="{ active: i === learningStore.currentSentenceIndex }"
      @click="selectSentence(i)"
    >
      <span class="sentence-num">{{ i + 1 }}</span>
      <div class="sentence-text">
        <p class="sentence-en" v-if="learningStore.subtitleMode !== 'cn'">{{ s.en }}</p>
        <p class="sentence-cn" v-if="learningStore.subtitleMode !== 'en'">{{ s.cn }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sentence-list {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 100%;
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
</style>
