import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { progressQueries } from '../db.js'

const router = Router()
router.use(authMiddleware)

// === Speaking History ===
router.get('/speaking', (req, res) => {
  try {
    const rows = progressQueries.getSpeaking.all(req.user.id)
    res.json(rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null, date: r.created_at })))
  } catch (err) {
    console.error('Get speaking error:', err.message)
    res.status(500).json({ error: '获取口语历史失败' })
  }
})

router.post('/speaking', (req, res) => {
  try {
    const { mode, part, topic, question, answer, score, details, exchanges } = req.body
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
    res.json(rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null, date: r.created_at })))
  } catch (err) {
    console.error('Get writing error:', err.message)
    res.status(500).json({ error: '获取写作历史失败' })
  }
})

router.post('/writing', (req, res) => {
  try {
    const { task_type, task, essay, score, details } = req.body
    const result = progressQueries.addWriting.run(
      req.user.id, task_type, task, essay, score, details ? JSON.stringify(details) : null
    )
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    console.error('Add writing error:', err.message)
    res.status(500).json({ error: '保存写作记录失败' })
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
    if (!date) return res.status(400).json({ error: '缺少日期' })
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
    const allowed = ['speaking', 'writing', 'listening', 'reading', 'vocab']
    if (!allowed.includes(module)) return res.status(400).json({ error: '无效模块' })
    progressQueries.ensureDailyStats.run(req.user.id, date)
    progressQueries.incrementDailyModule(module).run(req.user.id, date)
    res.json({ ok: true })
  } catch (err) {
    console.error('Increment daily error:', err.message)
    res.status(500).json({ error: '更新每日统计失败' })
  }
})

// === Dashboard Aggregate ===
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.user.id
    const speaking = progressQueries.getSpeaking.all(userId).map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null, date: r.created_at }))
    const writing = progressQueries.getWriting.all(userId).map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null, date: r.created_at }))
    const vocabRows = progressQueries.getVocab.all(userId)
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
    progressQueries.ensureDailyStats.run(userId, today)
    const dailyStats = progressQueries.getDailyStatsRange.all(userId, thirtyDaysAgo)

    res.json({
      speaking,
      writing,
      vocabCount: vocabRows.length,
      dailyStats
    })
  } catch (err) {
    console.error('Dashboard error:', err.message)
    res.status(500).json({ error: '获取仪表盘数据失败' })
  }
})

export default router
