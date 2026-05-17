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

function makeId(item) {
  return [
    item.module || 'general',
    item.type || 'note',
    normalizeText(item.text).toLowerCase()
  ].join(':')
}

export function getReviewItems() {
  return safeRead()
}

export function getReviewItemStats(now = Date.now()) {
  const items = getReviewItems()
  const due = items.filter(item => !item.reviewedAt && Number(item.due || 0) <= now)
  return { total: items.length, due: due.length, items, dueItems: due }
}

export function addReviewItemsFromFeedback(feedback, context = {}) {
  if (!feedback || !Array.isArray(feedback.reviewItems)) return []

  const existing = getReviewItems()
  const existingIds = new Set(existing.map(item => item.id))
  const createdAt = Date.now()

  const newItems = feedback.reviewItems
    .map(item => ({
      id: makeId({ ...item, module: context.module }),
      module: context.module || feedback.suggestedPractice?.module || 'general',
      source: context.source || 'ai-feedback',
      type: item.type || 'note',
      text: normalizeText(item.text),
      reason: normalizeText(item.reason),
      due: createdAt,
      createdAt,
      reviewedAt: null
    }))
    .filter(item => item.text && !existingIds.has(item.id))

  if (newItems.length) {
    safeWrite([...newItems, ...existing].slice(0, 200))
  }

  return newItems
}

