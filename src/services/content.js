import api from './api.js'

export async function getReadingBank() {
  const { data } = await api.get('/content/reading')
  return Array.isArray(data) ? data : []
}

export async function getListeningBank() {
  const { data } = await api.get('/content/listening')
  return Array.isArray(data) ? data : []
}
