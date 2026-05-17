import api from './api'

const STORAGE_KEY = 'mamio-review-items'

function safeRead() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function safeWrite(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function normalizeText(value) {
  return String(value || '').trim()
}

function makeLocalId(item) {
  return [
    item.module || 'general',
    item.type || 'note',
    normalizeText(item.text).toLowerCase()
  ].join(':')
}

function normalizeApiItem(item) {
  const createdAt = new Date(item.created_at).getTime()
  return {
    id: item.id,
    localKey: makeLocalId(item),
    module: item.module,
    type: item.type,
    text: item.text,
    reason: item.reason,
    source: item.source,
    due: createdAt,
    createdAt,
    reviewedAt: item.reviewed_at
  }
}

function getItemKey(item) {
  return item.localKey || makeLocalId(item)
}

// Local methods (fallback)
function getLocalItems() {
  return safeRead()
}

function getLocalStats(now = Date.now()) {
  const items = getLocalItems()
  const due = items.filter(item => !item.reviewedAt && Number(item.due || 0) <= now)
  return { total: items.length, due: due.length, items, dueItems: due }
}

// API methods
async function fetchFromApi() {
  try {
    const { data } = await api.get('/progress/review-items')
    return data
  } catch {
    return null
  }
}

async function addToApi(items) {
  try {
    const { data } = await api.post('/progress/review-items', items)
    return data
  } catch {
    return null
  }
}

async function markReviewedApi(id) {
  try {
    await api.patch(`/progress/review-items/${id}/review`)
    return true
  } catch {
    return false
  }
}

async function deleteFromApi(id) {
  try {
    await api.delete(`/progress/review-items/${id}`)
    return true
  } catch {
    return false
  }
}

async function migrateToApi(items) {
  try {
    const { data } = await api.post('/progress/review-items/migrate', items)
    return data
  } catch {
    return null
  }
}

// Public API — tries server first, falls back to localStorage

export async function getReviewItems() {
  const apiItems = await fetchFromApi()
  if (apiItems) {
    const normalized = apiItems.map(normalizeApiItem)
    // Sync to localStorage as cache
    safeWrite(normalized)
    return normalized
  }
  return getLocalItems()
}

export async function getReviewItemStats(now = Date.now()) {
  const items = await getReviewItems()
  const due = items.filter(item => !item.reviewedAt && Number(item.due || 0) <= now)
  return { total: items.length, due: due.length, items, dueItems: due }
}

// Sync version for computed properties (uses localStorage cache)
export function getReviewItemStatsSync(now = Date.now()) {
  const items = getLocalItems()
  const due = items.filter(item => !item.reviewedAt && Number(item.due || 0) <= now)
  return { total: items.length, due: due.length, items, dueItems: due }
}

export async function addReviewItemsFromFeedback(feedback, context = {}) {
  if (!feedback || !Array.isArray(feedback.reviewItems)) return []

  const createdAt = Date.now()
  const newItems = feedback.reviewItems
    .map(item => ({
      module: context.module || feedback.suggestedPractice?.module || 'general',
      source: context.source || 'ai-feedback',
      type: item.type || 'note',
      text: normalizeText(item.text),
      reason: normalizeText(item.reason)
    }))
    .filter(item => item.text)

  if (!newItems.length) return []

  // Deduplicate against local cache
  const existing = getLocalItems()
  const existingKeys = new Set(existing.map(getItemKey))
  const seenKeys = new Set()
  const deduped = newItems.filter(item => {
    const key = makeLocalId(item)
    if (existingKeys.has(key) || seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  if (!deduped.length) return []

  // Save to API
  const apiResult = await addToApi(deduped)

  // Save to localStorage (as cache)
  const localItems = deduped.map(item => ({
    id: apiResult?.ids?.[deduped.indexOf(item)] || makeLocalId(item),
    localKey: makeLocalId(item),
    ...item,
    due: createdAt,
    createdAt,
    reviewedAt: null
  }))
  safeWrite([...localItems, ...existing].slice(0, 200))

  return localItems
}

export async function markReviewItemReviewed(id) {
  const apiOk = await markReviewedApi(id)
  // Update localStorage
  const items = getLocalItems()
  const updated = items.map(item => item.id === id ? { ...item, reviewedAt: new Date().toISOString() } : item)
  safeWrite(updated)
  return apiOk
}

export async function deleteReviewItem(id) {
  const apiOk = await deleteFromApi(id)
  // Update localStorage
  const items = getLocalItems()
  safeWrite(items.filter(item => item.id !== id))
  return apiOk
}

// Migrate localStorage items to server (call once on login)
export async function migrateLocalToServer() {
  const localItems = getLocalItems()
  if (!localItems.length) return null
  const result = await migrateToApi(localItems)
  if (result) {
    // Clear local after successful migration
    safeWrite([])
  }
  return result
}
