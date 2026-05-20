import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { progressQueries, reviewItemQueries } from '../db.js'
import { localDateKeyDaysAgo, toLocalDateKey } from '../utils/date.js'

const router = Router()
router.use(authMiddleware)

const REVIEW_ITEM_BATCH_LIMIT = 100

function sanitizeReviewItem(item, fallbackSource = '') {
  if (!item?.text || typeof item.text !== 'string') return null
  const text = item.text.trim().slice(0, 500)
  if (!text) return null
  return {
    text,
    reason: String(item.reason || '').trim().slice(0, 300),
    module: String(item.module || 'general').trim().slice(0, 50) || 'general',
    type: String(item.type || 'note').trim().slice(0, 50) || 'note',
    source: String(item.source || fallbackSource).trim().slice(0, 100)
  }
}

function addReviewItemIfNew(userId, item) {
  const duplicate = reviewItemQueries.findActiveDuplicate.get(userId, item.module, item.type, item.text)
  if (duplicate) return { id: duplicate.id, created: false }
  const result = reviewItemQueries.add.run(userId, item.module, item.type, item.text, item.reason, item.source)
  return { id: result.lastInsertRowid, created: true }
}

function parseDetails(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function stringifyDetails(details) {
  if (!details) return null
  const value = JSON.stringify(details)
  return value.length <= 20000 ? value : null
}

function sanitizeCreatedAt(value) {
  if (typeof value !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return value.slice(0, 32)
}

function mapReadingRow(row) {
  return {
    ...row,
    passage: row.passage,
    score: row.score,
    correct: row.correct,
    total: row.total,
    time: row.time,
    details: parseDetails(row.details),
    date: row.created_at,
    synced: true
  }
}

function mapListeningRow(row) {
  const details = parseDetails(row.details)
  return {
    ...row,
    section: row.section,
    sectionNumber: row.section_number,
    mode: row.mode,
    score: row.score,
    correct: row.correct,
    total: row.total,
    missedWords: details?.missedWords || details?.report?.missedWords || [],
    sentence: details?.sentence,
    transcript: details?.transcript,
    details,
    date: row.created_at,
    synced: true
  }
}

// === Speaking History ===
router.get('/speaking', (req, res) => {
  try {
    const rows = progressQueries.getSpeaking.all(req.user.id)
    res.json(rows.map(r => ({ ...r, details: parseDetails(r.details), date: r.created_at })))
  } catch (err) {
    console.error('Get speaking error:', err.message)
    res.status(500).json({ error: '获取口语历史失败' })
  }
})

router.post('/speaking', (req, res) => {
  try {
    const { mode, part, topic, question, answer, score, details, exchanges } = req.body
    if (answer && answer.length > 10000) return res.status(400).json({ error: '回答内容过长' })
    if (topic && topic.length > 500) return res.status(400).json({ error: '话题内容过长' })
    const result = progressQueries.addSpeaking.run(
      req.user.id, mode || 'practice', part, topic, question, answer, score,
      details ? JSON.stringify(details) : null, exchanges || 1
    )
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    console.error('Add speaking error:', err.message)
    res.status(500).json({ error: '保存口语记录失败' })
  }
})

// === Writing History ===
router.get('/writing', (req, res) => {
  try {
    const rows = progressQueries.getWriting.all(req.user.id)
    res.json(rows.map(r => ({ ...r, details: parseDetails(r.details), date: r.created_at })))
  } catch (err) {
    console.error('Get writing error:', err.message)
    res.status(500).json({ error: '获取写作历史失败' })
  }
})

router.post('/writing', (req, res) => {
  try {
    const { task_type, task, essay, score, details } = req.body
    if (essay && essay.length > 20000) return res.status(400).json({ error: '作文内容过长' })
    if (task && task.length > 2000) return res.status(400).json({ error: '题目内容过长' })
    const result = progressQueries.addWriting.run(
      req.user.id, task_type, task, essay, score, details ? JSON.stringify(details) : null
    )
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    console.error('Add writing error:', err.message)
    res.status(500).json({ error: '保存写作记录失败' })
  }
})

// === Reading History ===
router.get('/reading', (req, res) => {
  try {
    const rows = progressQueries.getReading.all(req.user.id)
    res.json(rows.map(mapReadingRow))
  } catch (err) {
    console.error('Get reading error:', err.message)
    res.status(500).json({ error: '获取阅读历史失败' })
  }
})

router.get('/reading/:id', (req, res) => {
  try {
    const row = progressQueries.getReadingById.get(req.params.id, req.user.id)
    if (!row) return res.status(404).json({ error: '阅读记录不存在' })
    res.json(mapReadingRow(row))
  } catch (err) {
    console.error('Get reading detail error:', err.message)
    res.status(500).json({ error: '获取阅读记录失败' })
  }
})

router.post('/reading', (req, res) => {
  try {
    const { passage, score, correct, total, time, details } = req.body
    if (passage && (typeof passage !== 'string' || passage.length > 500)) return res.status(400).json({ error: '文章标题格式不正确' })
    const cleanScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Math.round(Number(score)))) : null
    const cleanCorrect = Number.isFinite(Number(correct)) ? Math.max(0, Math.round(Number(correct))) : null
    const cleanTotal = Number.isFinite(Number(total)) ? Math.max(0, Math.round(Number(total))) : null
    const cleanTime = Number.isFinite(Number(time)) ? Math.max(0, Math.round(Number(time))) : null
    const createdAt = sanitizeCreatedAt(req.body.createdAt || req.body.date)
    const args = [
      req.user.id,
      passage || '',
      cleanScore,
      cleanCorrect,
      cleanTotal,
      cleanTime,
      stringifyDetails(details)
    ]
    const result = createdAt
      ? progressQueries.addReadingWithDate.run(...args, createdAt)
      : progressQueries.addReading.run(...args)
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    console.error('Add reading error:', err.message)
    res.status(500).json({ error: '保存阅读记录失败' })
  }
})

// === Listening History ===
router.get('/listening', (req, res) => {
  try {
    const rows = progressQueries.getListening.all(req.user.id)
    res.json(rows.map(mapListeningRow))
  } catch (err) {
    console.error('Get listening error:', err.message)
    res.status(500).json({ error: '获取听力历史失败' })
  }
})

router.get('/listening/:id', (req, res) => {
  try {
    const row = progressQueries.getListeningById.get(req.params.id, req.user.id)
    if (!row) return res.status(404).json({ error: '听力记录不存在' })
    res.json(mapListeningRow(row))
  } catch (err) {
    console.error('Get listening detail error:', err.message)
    res.status(500).json({ error: '获取听力记录失败' })
  }
})

router.post('/listening', (req, res) => {
  try {
    const { section, sectionNumber, mode, score, correct, total, details } = req.body
    if (section && (typeof section !== 'string' || section.length > 500)) return res.status(400).json({ error: '听力场景格式不正确' })
    const cleanScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Math.round(Number(score)))) : null
    const cleanCorrect = Number.isFinite(Number(correct)) ? Math.max(0, Math.round(Number(correct))) : null
    const cleanTotal = Number.isFinite(Number(total)) ? Math.max(0, Math.round(Number(total))) : null
    const cleanSectionNumber = Number.isFinite(Number(sectionNumber)) ? Math.max(1, Math.min(4, Math.round(Number(sectionNumber)))) : null
    const createdAt = sanitizeCreatedAt(req.body.createdAt || req.body.date)
    const args = [
      req.user.id,
      section || '',
      cleanSectionNumber,
      mode || 'completion',
      cleanScore,
      cleanCorrect,
      cleanTotal,
      stringifyDetails(details)
    ]
    const result = createdAt
      ? progressQueries.addListeningWithDate.run(...args, createdAt)
      : progressQueries.addListening.run(...args)
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    console.error('Add listening error:', err.message)
    res.status(500).json({ error: '保存听力记录失败' })
  }
})

// === Vocab Progress ===
router.get('/vocab', (req, res) => {
  try {
    const rows = progressQueries.getVocab.all(req.user.id)
    res.json(rows)
  } catch (err) {
    console.error('Get vocab error:', err.message)
    res.status(500).json({ error: '获取词汇数据失败' })
  }
})

router.post('/vocab', (req, res) => {
  try {
    const { word, ease, interval, reps, due, last_review } = req.body
    if (!word) return res.status(400).json({ error: '缺少单词' })
    if (typeof word !== 'string' || word.length > 100) return res.status(400).json({ error: '单词格式不正确' })
    progressQueries.upsertVocab.run(req.user.id, word, ease, interval, reps, due, last_review)
    res.json({ ok: true })
  } catch (err) {
    console.error('Update vocab error:', err.message)
    res.status(500).json({ error: '更新词汇数据失败' })
  }
})

// === Daily Stats ===
router.get('/daily-stats', (req, res) => {
  try {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式不正确' })
    progressQueries.ensureDailyStats.run(req.user.id, date)
    const stats = progressQueries.getDailyStats.get(req.user.id, date)
    res.json(stats || { speaking: 0, writing: 0, listening: 0, reading: 0, vocab: 0 })
  } catch (err) {
    console.error('Get daily stats error:', err.message)
    res.status(500).json({ error: '获取每日统计失败' })
  }
})

router.post('/daily-stats/increment', (req, res) => {
  try {
    const { date, module } = req.body
    if (!date || !module) return res.status(400).json({ error: '缺少参数' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式不正确' })
    const allowed = ['speaking', 'writing', 'listening', 'reading', 'vocab']
    if (!allowed.includes(module)) return res.status(400).json({ error: '无效模块' })
    progressQueries.ensureDailyStats.run(req.user.id, date)
    progressQueries.incrementDailyModule[module].run(req.user.id, date)
    res.json({ ok: true })
  } catch (err) {
    console.error('Increment daily error:', err.message)
    res.status(500).json({ error: '更新每日统计失败' })
  }
})

// === Review Items ===
router.get('/review-items', (req, res) => {
  try {
    const rows = reviewItemQueries.getByUser.all(req.user.id)
    res.json(rows)
  } catch (err) {
    console.error('Get review items error:', err.message)
    res.status(500).json({ error: '获取复习项失败' })
  }
})

router.get('/review-items/due', (req, res) => {
  try {
    const rows = reviewItemQueries.getDueByUser.all(req.user.id)
    res.json(rows)
  } catch (err) {
    console.error('Get due review items error:', err.message)
    res.status(500).json({ error: '获取待复习项失败' })
  }
})

router.post('/review-items', (req, res) => {
  try {
    const items = (Array.isArray(req.body) ? req.body : [req.body]).slice(0, REVIEW_ITEM_BATCH_LIMIT)
    const added = []
    const ids = []
    for (const item of items) {
      const clean = sanitizeReviewItem(item)
      if (!clean) continue
      const result = addReviewItemIfNew(req.user.id, clean)
      ids.push(result.id)
      if (result.created) added.push(result.id)
    }
    res.json({ added: added.length, ids })
  } catch (err) {
    console.error('Add review items error:', err.message)
    res.status(500).json({ error: '保存复习项失败' })
  }
})

router.patch('/review-items/:id/review', (req, res) => {
  try {
    const result = reviewItemQueries.markReviewed.run(req.params.id, req.user.id)
    res.json({ ok: result.changes > 0 })
  } catch (err) {
    console.error('Mark reviewed error:', err.message)
    res.status(500).json({ error: '标记复习完成失败' })
  }
})

router.delete('/review-items/:id', (req, res) => {
  try {
    const result = reviewItemQueries.delete.run(req.params.id, req.user.id)
    res.json({ ok: result.changes > 0 })
  } catch (err) {
    console.error('Delete review item error:', err.message)
    res.status(500).json({ error: '删除复习项失败' })
  }
})

router.post('/review-items/migrate', (req, res) => {
  try {
    const items = (Array.isArray(req.body) ? req.body : []).slice(0, REVIEW_ITEM_BATCH_LIMIT)
    if (!items.length) return res.json({ migrated: 0 })
    let count = 0
    for (const item of items) {
      const clean = sanitizeReviewItem(item, 'local-migration')
      if (!clean) continue
      const result = addReviewItemIfNew(req.user.id, clean)
      if (result.created) count++
    }
    res.json({ migrated: count })
  } catch (err) {
    console.error('Migrate review items error:', err.message)
    res.status(500).json({ error: '迁移复习项失败' })
  }
})

// === Dashboard Aggregate ===
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.user.id
    const speaking = progressQueries.getSpeaking.all(userId).map(r => ({ ...r, details: parseDetails(r.details), date: r.created_at }))
    const writing = progressQueries.getWriting.all(userId).map(r => ({ ...r, details: parseDetails(r.details), date: r.created_at }))
    const reading = progressQueries.getReading.all(userId).map(mapReadingRow)
    const listening = progressQueries.getListening.all(userId).map(mapListeningRow)
    const vocabRows = progressQueries.getVocab.all(userId)
    const today = toLocalDateKey()
    const thirtyDaysAgo = localDateKeyDaysAgo(28)
    progressQueries.ensureDailyStats.run(userId, today)
    const dailyStats = progressQueries.getDailyStatsRange.all(userId, thirtyDaysAgo)

    res.json({
      speaking,
      writing,
      reading,
      listening,
      vocabCount: vocabRows.length,
      dailyStats
    })
  } catch (err) {
    console.error('Dashboard error:', err.message)
    res.status(500).json({ error: '获取仪表盘数据失败' })
  }
})

export default router
