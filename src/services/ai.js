import api from './api.js'

export async function scoreSpeaking(question, userAnswer, part) {
  const { data } = await api.post('/ai/speaking', { question, userAnswer, part })
  return data
}

export async function speakingConversation(question, history, userAnswer, part) {
  const { data } = await api.post('/ai/speaking-conversation', { question, history, userAnswer, part })
  return data
}

export async function batchWriting(task, essay, taskType) {
  const { data } = await api.post('/ai/writing', { task, essay, taskType })
  return data
}

export async function generateVocab(topic, level) {
  const { data } = await api.post('/ai/vocab', { topic, level })
  return data
}

export async function generateListening(topic, section) {
  const { data } = await api.post('/ai/listening', { topic, section })
  return data
}
