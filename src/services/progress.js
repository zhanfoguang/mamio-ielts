import api from './api.js'

// Speaking
export async function getSpeakingHistory() {
  const { data } = await api.get('/progress/speaking')
  return data
}

export async function addSpeakingRecord(record) {
  const { data } = await api.post('/progress/speaking', record)
  return data
}

// Writing
export async function getWritingHistory() {
  const { data } = await api.get('/progress/writing')
  return data
}

export async function addWritingRecord(record) {
  const { data } = await api.post('/progress/writing', record)
  return data
}

// Reading
export async function getReadingHistory() {
  const { data } = await api.get('/progress/reading')
  return data
}

export async function getReadingRecord(id) {
  const { data } = await api.get(`/progress/reading/${id}`)
  return data
}

export async function addReadingRecord(record) {
  const { data } = await api.post('/progress/reading', record)
  return data
}

// Listening
export async function getListeningHistory() {
  const { data } = await api.get('/progress/listening')
  return data
}

export async function getListeningRecord(id) {
  const { data } = await api.get(`/progress/listening/${id}`)
  return data
}

export async function addListeningRecord(record) {
  const { data } = await api.post('/progress/listening', record)
  return data
}

// Vocab SRS
export async function getVocabProgress() {
  const { data } = await api.get('/progress/vocab')
  return data
}

export async function updateVocabProgress(wordData) {
  const { data } = await api.post('/progress/vocab', wordData)
  return data
}

// Daily stats
export async function getDailyStats(date) {
  const { data } = await api.get('/progress/daily-stats', { params: { date } })
  return data
}

export async function incrementDailyStats(date, module) {
  const { data } = await api.post('/progress/daily-stats/increment', { date, module })
  return data
}

// Dashboard aggregate
export async function getDashboardData() {
  const { data } = await api.get('/progress/dashboard')
  return data
}
