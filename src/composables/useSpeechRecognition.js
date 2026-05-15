import { ref, onUnmounted } from 'vue'

export function useSpeechRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref(null)

  let recognition = null

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) transcript.value += final
      interimTranscript.value = interim
    }

    recognition.onerror = (event) => {
      error.value = event.error
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  }

  function start() {
    if (!recognition) {
      error.value = '浏览器不支持语音识别'
      return
    }
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
    try {
      recognition.start()
      isListening.value = true
    } catch (e) {
      error.value = e.message
    }
  }

  function stop() {
    if (recognition && isListening.value) {
      recognition.stop()
      isListening.value = false
    }
  }

  function reset() {
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
  }

  onUnmounted(() => stop())

  const isSupported = !!SpeechRecognition

  return { isListening, transcript, interimTranscript, error, isSupported, start, stop, reset }
}
