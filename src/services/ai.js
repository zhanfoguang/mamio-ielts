import api from './api.js'

export async function scoreSpeaking(question, userAnswer, part, confidenceData, lang) {
  const { data } = await api.post('/ai/speaking', { question, userAnswer, part, confidenceData, lang })
  return data
}

export async function speakingConversation(question, history, userAnswer, part, lang) {
  const { data } = await api.post('/ai/speaking-conversation', { question, history, userAnswer, part, lang })
  return data
}

export async function batchWriting(task, essay, taskType, lang) {
  const { data } = await api.post('/ai/writing', { task, essay, taskType, lang })
  return data
}

export async function generateVocab(topic, level, lang) {
  const { data } = await api.post('/ai/vocab', { topic, level, lang })
  return data
}

export async function generateListening(topic, section, lang) {
  const { data } = await api.post('/ai/listening', { topic, section, lang })
  return data
}
