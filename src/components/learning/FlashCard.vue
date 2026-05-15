<script setup>
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import { useThemeStore } from '../../stores/theme'
import { flashcards } from '../../data/flashcards'

const learningStore = useLearningStore()
const themeStore = useThemeStore()

const currentCard = computed(() => flashcards[learningStore.currentCardIndex])
const totalCards = computed(() => flashcards.length)
</script>

<template>
  <div class="flashcard-container">
    <div class="card-counter">
      {{ learningStore.currentCardIndex + 1 }} / {{ totalCards }}
    </div>

    <div class="flashcard" :class="{ flipped: learningStore.isCardFlipped }" @click="learningStore.flipCard()">
      <div class="card-inner">
        <div class="card-front">
          <span class="card-level">{{ currentCard.level }}</span>
          <h2 class="card-word">{{ currentCard.word }}</h2>
          <p class="card-phonetic">{{ currentCard.phonetic }}</p>
          <p class="flip-hint">{{ themeStore.lang === 'zh' ? '点击翻转' : 'Tap to flip' }}</p>
        </div>
        <div class="card-back">
          <h3 class="card-meaning">{{ currentCard.meaning }}</h3>
          <p class="card-example">"{{ currentCard.example }}"</p>
          <p class="flip-hint">{{ themeStore.lang === 'zh' ? '点击翻回' : 'Tap to flip back' }}</p>
        </div>
      </div>
    </div>

    <div class="card-actions">
      <button class="action-btn prev" @click="learningStore.prevCard()" :disabled="learningStore.currentCardIndex === 0">
        ←
      </button>
      <button class="action-btn unknown" @click="learningStore.nextCard(totalCards)">
        {{ themeStore.lang === 'zh' ? '不认识' : 'Unknown' }}
      </button>
      <button class="action-btn know" @click="learningStore.nextCard(totalCards)">
        {{ themeStore.lang === 'zh' ? '认识' : 'Know' }}
      </button>
      <button class="action-btn next" @click="learningStore.nextCard(totalCards)" :disabled="learningStore.currentCardIndex >= totalCards - 1">
        →
      </button>
    </div>
  </div>
</template>

<style scoped>
.flashcard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.card-counter {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-weight: 600;
}

.flashcard {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 3 / 2;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}

.flashcard.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
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

.card-level {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  margin-bottom: var(--space-sm);
}

.card-word {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-xs);
}

.card-phonetic {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
}

.card-meaning {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.card-example {
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  max-width: 280px;
}

[data-theme="dark"] .card-example {
  color: rgba(0, 0, 0, 0.6);
}

.flip-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: auto;
}

.card-back .flip-hint {
  color: rgba(255, 255, 255, 0.4);
}

[data-theme="dark"] .card-back .flip-hint {
  color: rgba(0, 0, 0, 0.4);
}

.card-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.prev, .next {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 10px 16px;
}

.unknown {
  background: var(--red-soft);
  color: var(--red);
  border: 1px solid var(--red);
}

.know {
  background: var(--green-soft);
  color: var(--green);
  border: 1px solid var(--green);
}

.unknown:hover, .know:hover {
  opacity: 0.8;
}
</style>
