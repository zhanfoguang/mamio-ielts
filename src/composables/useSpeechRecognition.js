import { ref, onUnmounted } from 'vue'

export function useSpeechRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref(null)

  // Recording state
  const isRecording = ref(false)
  const audioBlob = ref(null)
  const audioUrl = ref(null)
  const recordingDuration = ref(0)

  let recognition = null
  let mediaRecorder = null
  let audioChunks = []
  let recordingTimer = null
  let stream = null

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

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      audioChunks = []
      recordingDuration.value = 0

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        audioBlob.value = blob
        if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
        audioUrl.value = URL.createObjectURL(blob)
        isRecording.value = false
        clearInterval(recordingTimer)
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          stream = null
        }
      }

      mediaRecorder.start()
      isRecording.value = true

      recordingTimer = setInterval(() => {
        recordingDuration.value++
      }, 1000)
    } catch (e) {
      error.value = '无法访问麦克风，请检查权限设置'
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }

  function clearRecording() {
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    audioBlob.value = null
    audioUrl.value = null
    recordingDuration.value = 0
  }

  function start() {
    if (!recognition) {
      error.value = '浏览器不支持语音识别'
      return
    }
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
    clearRecording()
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
    clearRecording()
  }

  onUnmounted(() => {
    stop()
    stopRecording()
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    if (stream) stream.getTracks().forEach(track => track.stop())
    clearInterval(recordingTimer)
  })

  const isSupported = !!SpeechRecognition

  return {
    isListening, transcript, interimTranscript, error, isSupported,
    isRecording, audioBlob, audioUrl, recordingDuration,
    start, stop, reset, startRecording, stopRecording, clearRecording
  }
}
