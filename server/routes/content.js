import { Router } from 'express'
import { contentQueries } from '../db.js'

const router = Router()

function parseJsonField(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function mapReading(row) {
  return {
    id: row.source_id || row.id,
    title: row.title,
    level: row.level,
    passage: row.passage,
    questions: parseJsonField(row.questions, [])
  }
}

function mapListening(row) {
  return {
    id: row.source_id || row.id,
    section: row.section_number,
    title: row.title,
    description: row.description,
    sentences: parseJsonField(row.sentences, [])
  }
}

router.get('/reading', (req, res) => {
  try {
    res.json(contentQueries.getReading.all().map(mapReading))
  } catch (err) {
    console.error('Get reading content error:', err.message)
    res.status(500).json({ error: '获取阅读题库失败' })
  }
})

router.get('/listening', (req, res) => {
  try {
    res.json(contentQueries.getListening.all().map(mapListening))
  } catch (err) {
    console.error('Get listening content error:', err.message)
    res.status(500).json({ error: '获取听力题库失败' })
  }
})

export default router
