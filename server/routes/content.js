import { Router } from 'express'
import { contentQueries } from '../db.js'
import { readingPassages } from '../../src/data/ielts/reading.js'
import { listeningSections } from '../../src/data/ielts/listening.js'

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
    id: `db-reading-${row.id}`,
    title: row.title,
    level: row.level,
    passage: row.passage,
    questions: parseJsonField(row.questions, [])
  }
}

function mapListening(row) {
  return {
    id: `db-listening-${row.id}`,
    section: row.section_number,
    title: row.title,
    description: row.description,
    sentences: parseJsonField(row.sentences, [])
  }
}

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function appendUniqueByTitle(baseItems, extraItems) {
  const seen = new Set(baseItems.map(item => normalizeTitle(item.title)))
  const merged = [...baseItems]
  for (const item of extraItems) {
    const key = normalizeTitle(item.title)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

router.get('/reading', (req, res) => {
  try {
    res.json(appendUniqueByTitle(readingPassages, contentQueries.getReading.all().map(mapReading)))
  } catch (err) {
    console.error('Get reading content error:', err.message)
    res.status(500).json({ error: '获取阅读题库失败' })
  }
})

router.get('/listening', (req, res) => {
  try {
    res.json(appendUniqueByTitle(listeningSections, contentQueries.getListening.all().map(mapListening)))
  } catch (err) {
    console.error('Get listening content error:', err.message)
    res.status(500).json({ error: '获取听力题库失败' })
  }
})

export default router
