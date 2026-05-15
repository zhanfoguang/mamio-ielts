import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLearningStore = defineStore('learning', () => {
  const currentSentenceIndex = ref(0)
  const currentWordIndex = ref(-1)
  const isPlaying = ref(false)
  const subtitleMode = ref('bilingual') // bilingual, en, cn, hidden
  const playbackSpeed = ref(1)
  const videoProgress = ref(0)

  // Flashcard state
  const currentCardIndex = ref(0)
  const isCardFlipped = ref(false)
  const cardResults = ref([]) // { id, quality, nextReview }

  // Stats
  const totalPracticeTime = ref(0)
  const sentencesCompleted = ref(0)
  const wordsLookedUp = ref(0)
  const aiScoresToday = ref(0)

  function play() { isPlaying.value = true }
  function pause() { isPlaying.value = false }
  function togglePlay() { isPlaying.value = !isPlaying.value }

  function nextSentence(total) {
    if (currentSentenceIndex.value < total - 1) {
      currentSentenceIndex.value++
      currentWordIndex.value = -1
    }
  }

  function prevSentence() {
    if (currentSentenceIndex.value > 0) {
      currentSentenceIndex.value--
      currentWordIndex.value = -1
    }
  }

  function setSentence(index) {
    currentSentenceIndex.value = index
    currentWordIndex.value = -1
  }

  function setSubtitleMode(mode) {
    subtitleMode.value = mode
  }

  function setSpeed(speed) {
    playbackSpeed.value = speed
  }

  function flipCard() {
    isCardFlipped.value = !isCardFlipped.value
  }

  function nextCard(total) {
    if (currentCardIndex.value < total - 1) {
      currentCardIndex.value++
      isCardFlipped.value = false
    }
  }

  function prevCard() {
    if (currentCardIndex.value > 0) {
      currentCardIndex.value--
      isCardFlipped.value = false
    }
  }

  return {
    currentSentenceIndex, currentWordIndex, isPlaying, subtitleMode, playbackSpeed, videoProgress,
    currentCardIndex, isCardFlipped, cardResults,
    totalPracticeTime, sentencesCompleted, wordsLookedUp, aiScoresToday,
    play, pause, togglePlay, nextSentence, prevSentence, setSentence,
    setSubtitleMode, setSpeed, flipCard, nextCard, prevCard
  }
})
