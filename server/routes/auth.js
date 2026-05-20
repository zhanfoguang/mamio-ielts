import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { userQueries, codeQueries, resetCodeQueries, logQueries, contentDraftQueries, contentQueries } from '../db.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { sendResetCode } from '../mail.js'
import { localDateKeyDaysAgo, toLocalDateKey } from '../utils/date.js'
import { readingPassages } from '../../src/data/ielts/reading.js'
import { listeningSections } from '../../src/data/ielts/listening.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDraftDir = path.resolve(__dirname, '../../AI-OPS/content-drafts')
const allowedReadingTypes = new Set(['true-false-ng', 'matching', 'matching-headings', 'short-answer', 'multiple-choice'])
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: '请求过于频繁，请15分钟后再试' }
})

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '请求过于频繁，请15分钟后再试' }
})

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
}

function syncExpiredUserRole(user) {
  if (!user || user.role === 'admin' || user.role === 'expired') return user
  let shouldExpire = false

  if (user.role === 'paid' && user.expires_at && new Date(user.expires_at) < new Date()) {
    shouldExpire = true
  }

  if (user.role === 'trial') {
    const trialStart = user.trial_start ? new Date(user.trial_start) : null
    const daysSinceTrial = trialStart ? Math.floor((new Date() - trialStart) / (1000 * 60 * 60 * 24)) : 0
    shouldExpire = daysSinceTrial >= 3
  }

  if (!shouldExpire) return user
  userQueries.updateRole.run('expired', user.id)
  return { ...user, role: 'expired' }
}

function normalizeDraftStatus(payload, review) {
  if (payload?.publishedAt) return 'published'
  if (review?.status) return review.status
  if (payload?.review?.status) return payload.review.status
  if (payload?.status === 'approved' || payload?.status === 'rejected') return payload.status
  return 'draft'
}

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function countReadingQuestionItems(question) {
  if (question.type === 'true-false-ng') return question.statements?.length || 0
  if (question.type === 'multiple-choice') return question.items?.length || 0
  if (question.type === 'short-answer') return question.items?.length || 0
  if (question.type === 'matching') return question.items?.length || 0
  if (question.type === 'matching-headings') return question.answers?.length || 0
  return 0
}

function normalizeReadingDraft(item, index) {
  const title = String(item?.title || '').trim()
  const level = String(item?.level || '').trim()
  const passage = String(item?.passage || '').trim()
  const questions = Array.isArray(item?.questions) ? item.questions : []
  const errors = []

  if (!title) errors.push('missing title')
  if (!['easy', 'medium', 'hard'].includes(level)) errors.push(`unsupported level: ${level || '(empty)'}`)
  if (passage.length < 500) errors.push('passage is too short')
  if (questions.length < 3) errors.push('needs at least 3 question groups')

  const normalizedQuestions = questions.map((question, questionIndex) => {
    if (!allowedReadingTypes.has(question?.type)) errors.push(`unsupported question type: ${question?.type || '(empty)'}`)
    if (countReadingQuestionItems(question) === 0) errors.push(`question group ${questionIndex + 1} has no scorable items`)
    return { ...question, id: question.id || `q${questionIndex + 1}` }
  })

  if (errors.length) return { ok: false, title: title || `reading draft #${index + 1}`, errors }
  return { ok: true, item: { title, level, passage, questions: normalizedQuestions } }
}

function normalizeListeningDraft(item, index) {
  const title = String(item?.title || '').trim()
  const description = String(item?.description || '').trim()
  const section = Number(item?.section)
  const sentences = Array.isArray(item?.sentences) ? item.sentences : []
  const errors = []

  if (!title) errors.push('missing title')
  if (!Number.isInteger(section) || section < 1 || section > 4) errors.push(`unsupported section: ${item?.section || '(empty)'}`)
  if (!description) errors.push('missing description')
  if (sentences.length < 5) errors.push('needs at least 5 sentences')

  const normalizedSentences = sentences.map((sentence, sentenceIndex) => {
    const en = String(sentence?.en || '').trim()
    const cn = String(sentence?.cn || '').trim()
    const duration = Number(sentence?.duration)
    if (!en || !cn) errors.push(`sentence ${sentenceIndex + 1} is missing en/cn text`)
    if (!Number.isFinite(duration) || duration < 2500) errors.push(`sentence ${sentenceIndex + 1} has invalid duration`)
    return { en, cn, duration: Math.round(duration) }
  })

  if (errors.length) return { ok: false, title: title || `listening draft #${index + 1}`, errors }
  return { ok: true, item: { section, title, description, sentences: normalizedSentences } }
}

function assessContentDraft(payload) {
  const flags = []
  const existingReadingTitles = new Set(readingPassages.map(item => normalizeTitle(item.title)))
  const existingListeningTitles = new Set(listeningSections.map(item => normalizeTitle(item.title)))
  const readingItems = Array.isArray(payload?.readingPassages) ? payload.readingPassages : []
  const listeningItems = Array.isArray(payload?.listeningSections) ? payload.listeningSections : []

  if (!readingItems.length) flags.push({ severity: 'high', message: 'No reading passages in this draft.' })
  if (!listeningItems.length) flags.push({ severity: 'high', message: 'No listening sections in this draft.' })

  for (const item of readingItems) {
    const label = item?.title || '(untitled reading)'
    if (existingReadingTitles.has(normalizeTitle(label))) flags.push({ severity: 'medium', message: `Duplicate reading title: ${label}` })
    if (!['easy', 'medium', 'hard'].includes(item?.level)) flags.push({ severity: 'high', message: `Reading "${label}" has invalid level.` })
    if (String(item?.passage || '').length < 500) flags.push({ severity: 'high', message: `Reading "${label}" passage is too short.` })
    if (!Array.isArray(item?.questions) || item.questions.length < 3) flags.push({ severity: 'high', message: `Reading "${label}" needs at least 3 question groups.` })
    for (const question of item?.questions || []) {
      if (!allowedReadingTypes.has(question?.type)) flags.push({ severity: 'high', message: `Reading "${label}" has unsupported question type: ${question?.type || '(empty)'}.` })
      if (countReadingQuestionItems(question) === 0) flags.push({ severity: 'medium', message: `Reading "${label}" has an empty question group.` })
    }
  }

  for (const item of listeningItems) {
    const label = item?.title || '(untitled listening)'
    if (existingListeningTitles.has(normalizeTitle(label))) flags.push({ severity: 'medium', message: `Duplicate listening title: ${label}` })
    if (!Number.isInteger(Number(item?.section)) || Number(item?.section) < 1 || Number(item?.section) > 4) flags.push({ severity: 'high', message: `Listening "${label}" has invalid section.` })
    if (!Array.isArray(item?.sentences) || item.sentences.length < 5) flags.push({ severity: 'high', message: `Listening "${label}" needs at least 5 sentences.` })
    for (const [index, sentence] of (item?.sentences || []).entries()) {
      if (!sentence?.en || !sentence?.cn) flags.push({ severity: 'high', message: `Listening "${label}" sentence ${index + 1} is missing en/cn text.` })
      if (!Number.isFinite(Number(sentence?.duration)) || Number(sentence?.duration) < 2500) flags.push({ severity: 'medium', message: `Listening "${label}" sentence ${index + 1} has weak duration data.` })
    }
  }

  const score = Math.max(0, 100 - flags.reduce((sum, flag) => sum + (flag.severity === 'high' ? 20 : 8), 0))
  return {
    score,
    flags,
    canMerge: score >= 70 && !flags.some(flag => flag.severity === 'high')
  }
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

function buildContentHealth() {
  const readingBank = appendUniqueByTitle(readingPassages, contentQueries.getReading.all().map(mapPublishedReading))
  const listeningBank = appendUniqueByTitle(listeningSections, contentQueries.getListening.all().map(mapPublishedListening))
  const dbReadingCount = Math.max(0, readingBank.length - readingPassages.length)
  const dbListeningCount = Math.max(0, listeningBank.length - listeningSections.length)

  const readingByLevel = readingBank.reduce((acc, passage) => {
    acc[passage.level] = (acc[passage.level] || 0) + 1
    return acc
  }, { easy: 0, medium: 0, hard: 0 })

  const readingTypes = readingBank.reduce((acc, passage) => {
    for (const question of passage.questions || []) {
      acc[question.type] = (acc[question.type] || 0) + 1
    }
    return acc
  }, {})

  const listeningBySection = listeningBank.reduce((acc, section) => {
    acc[section.section] = (acc[section.section] || 0) + 1
    return acc
  }, { 1: 0, 2: 0, 3: 0, 4: 0 })

  const readingWordCounts = readingBank.map(passage => wordCount(passage.passage))
  const listeningSentenceCounts = listeningBank.map(section => section.sentences?.length || 0)
  const duplicateReadingTitles = findDuplicateTitles(readingBank)
  const duplicateListeningTitles = findDuplicateTitles(listeningBank)
  const gaps = []

  for (const [level, count] of Object.entries(readingByLevel)) {
    if (count < 4) gaps.push(`Reading ${level} needs at least 4 passages; current ${count}.`)
  }
  for (const type of allowedReadingTypes) {
    if (!readingTypes[type]) gaps.push(`Reading question type missing: ${type}.`)
  }
  for (const [section, count] of Object.entries(listeningBySection)) {
    if (count < 2) gaps.push(`Listening Section ${section} needs at least 2 scenes; current ${count}.`)
  }
  if (duplicateReadingTitles.length) gaps.push(`Duplicate reading titles: ${duplicateReadingTitles.join(', ')}.`)
  if (duplicateListeningTitles.length) gaps.push(`Duplicate listening titles: ${duplicateListeningTitles.join(', ')}.`)

  return {
    generatedAt: new Date().toISOString(),
    score: Math.max(0, 100 - gaps.length * 10),
    gaps,
    reading: {
      total: readingBank.length,
      staticTotal: readingPassages.length,
      dbPublished: dbReadingCount,
      byLevel: readingByLevel,
      questionTypes: readingTypes,
      avgWords: readingWordCounts.length ? Math.round(readingWordCounts.reduce((sum, count) => sum + count, 0) / readingWordCounts.length) : 0,
      shortest: readingWordCounts.length ? Math.min(...readingWordCounts) : 0,
      longest: readingWordCounts.length ? Math.max(...readingWordCounts) : 0
    },
    listening: {
      total: listeningBank.length,
      staticTotal: listeningSections.length,
      dbPublished: dbListeningCount,
      bySection: listeningBySection,
      avgSentences: listeningSentenceCounts.length ? Math.round(listeningSentenceCounts.reduce((sum, count) => sum + count, 0) / listeningSentenceCounts.length) : 0,
      shortest: listeningSentenceCounts.length ? Math.min(...listeningSentenceCounts) : 0,
      longest: listeningSentenceCounts.length ? Math.max(...listeningSentenceCounts) : 0
    }
  }
}

function findDuplicateTitles(items) {
  const seen = new Set()
  const duplicates = new Set()
  for (const item of items) {
    const title = normalizeTitle(item.title)
    if (!title) continue
    if (seen.has(title)) duplicates.add(item.title)
    seen.add(title)
  }
  return [...duplicates]
}

function mapPublishedReading(row) {
  return {
    id: `db-reading-${row.id}`,
    title: row.title,
    level: row.level,
    passage: row.passage,
    questions: (() => {
      try { return JSON.parse(row.questions) } catch { return [] }
    })()
  }
}

function mapPublishedListening(row) {
  return {
    id: `db-listening-${row.id}`,
    section: row.section_number,
    title: row.title,
    description: row.description,
    sentences: (() => {
      try { return JSON.parse(row.sentences) } catch { return [] }
    })()
  }
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

async function readContentDraftFiles() {
  let fileNames = []
  try {
    fileNames = await fs.readdir(contentDraftDir)
  } catch {
    return []
  }

  const reviews = new Map(contentDraftQueries.getAll.all().map(row => [row.file_name, row]))
  const drafts = []
  for (const fileName of fileNames.filter(name => name.endsWith('.json') && name.startsWith('generated-content-'))) {
    try {
      const fullPath = path.join(contentDraftDir, fileName)
      const payload = JSON.parse(await fs.readFile(fullPath, 'utf8'))
      const review = reviews.get(fileName)
      const quality = assessContentDraft(payload)
      drafts.push({
        fileName,
        status: normalizeDraftStatus(payload, review),
        notes: review?.notes || payload.review?.notes || '',
        reviewedAt: review?.reviewed_at || payload.review?.reviewedAt || null,
        mergedAt: payload.mergedAt || null,
        publishedAt: payload.publishedAt || null,
        publishedSummary: payload.publishedSummary || null,
        quality,
        generatedAt: payload.generatedAt || null,
        sourceSeedFile: payload.sourceSeedFile || null,
        readingCount: Array.isArray(payload.readingPassages) ? payload.readingPassages.length : 0,
        listeningCount: Array.isArray(payload.listeningSections) ? payload.listeningSections.length : 0,
        readingTitles: (payload.readingPassages || []).map(item => item.title).filter(Boolean).slice(0, 6),
        listeningTitles: (payload.listeningSections || []).map(item => item.title).filter(Boolean).slice(0, 6),
        payload
      })
    } catch (err) {
      drafts.push({
        fileName,
        status: 'invalid',
        notes: err.message,
        reviewedAt: null,
        generatedAt: null,
        sourceSeedFile: null,
        readingCount: 0,
        listeningCount: 0,
        readingTitles: [],
        listeningTitles: [],
        payload: null
      })
    }
  }
  return drafts.sort((a, b) => String(b.generatedAt || b.fileName).localeCompare(String(a.generatedAt || a.fileName)))
}

// Register
router.post('/register', authLimiter, (req, res) => {
  try {
    const { email, password, nickname } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' })
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: '密码长度 6-128 位' })
    }
    if (nickname && nickname.length > 50) {
      return res.status(400).json({ error: '昵称最多 50 个字符' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' })
    }

    const existing = userQueries.findByEmail.get(email.toLowerCase().trim())
    if (existing) {
      return res.status(400).json({ error: '该邮箱已注册' })
    }

    const hash = bcrypt.hashSync(password, 10)
    const trialStart = new Date().toISOString()
    const result = userQueries.create.run(
      email.toLowerCase().trim(),
      hash,
      nickname || email.split('@')[0],
      'trial',
      trialStart,
      null
    )

    const user = userQueries.findById.get(result.lastInsertRowid)
    const token = generateToken(user)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        ai_calls_today: 0,
        trial_start: user.trial_start,
        expires_at: user.expires_at
      }
    })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// Login
router.post('/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' })
    }

    const user = userQueries.findByEmail.get(email.toLowerCase().trim())
    if (!user) {
      return res.status(400).json({ error: '邮箱或密码错误' })
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: '邮箱或密码错误' })
    }

    const currentUser = syncExpiredUserRole(user)
    const token = generateToken(currentUser)
    res.json({
      token,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        nickname: currentUser.nickname,
        role: currentUser.role,
        ai_calls_today: currentUser.ai_calls_today,
        trial_start: currentUser.trial_start,
        expires_at: currentUser.expires_at
      }
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = syncExpiredUserRole(req.user)
  res.json({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    ai_calls_today: user.ai_calls_today,
    ai_calls_date: user.ai_calls_date,
    trial_start: user.trial_start,
    expires_at: user.expires_at,
    created_at: user.created_at
  })
})

// Activate invite code
router.post('/activate', authMiddleware, (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: '请输入激活码' })
    }

    const normalizedCode = String(code).trim().toUpperCase()
    const inviteCode = codeQueries.findByCode.get(normalizedCode)
    if (!inviteCode) {
      return res.status(400).json({ error: '激活码无效' })
    }
    if (inviteCode.used_by) {
      return res.status(400).json({ error: '该激活码已被使用' })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + inviteCode.duration_days)

    userQueries.activateCode.run('paid', expiresAt.toISOString(), inviteCode.code, req.user.id)
    codeQueries.markUsed.run(req.user.id, inviteCode.id)

    const updatedUser = userQueries.findById.get(req.user.id)
    res.json({
      message: `激活成功！有效期 ${inviteCode.duration_days} 天`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        role: updatedUser.role,
        expires_at: updatedUser.expires_at
      }
    })
  } catch (err) {
    console.error('Activate error:', err.message)
    res.status(500).json({ error: '激活失败，请稍后重试' })
  }
})

// Forgot password - send reset code
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: '请输入邮箱' })
    }

    const user = userQueries.findByEmail.get(email.toLowerCase().trim())
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: '如果该邮箱已注册，验证码已发送' })
    }

    // Generate 6-digit code (cryptographically secure)
    const code = String(crypto.randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    resetCodeQueries.create.run(email.toLowerCase().trim(), code, expiresAt)

    await sendResetCode(email, code)

    res.json({ message: '验证码已发送到你的邮箱，10分钟内有效' })
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(500).json({ error: '发送验证码失败，请稍后重试' })
  }
})

// Verify reset code
router.post('/verify-reset-code', resetLimiter, (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return res.status(400).json({ error: '请输入邮箱和验证码' })
    }

    const resetCode = resetCodeQueries.findValid.get(email.toLowerCase().trim(), code.trim())
    if (!resetCode) {
      return res.status(400).json({ error: '验证码无效或已过期' })
    }

    res.json({ message: '验证成功' })
  } catch (err) {
    console.error('Verify code error:', err.message)
    res.status(500).json({ error: '验证失败' })
  }
})

// Reset password
router.post('/reset-password', resetLimiter, (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: '缺少必要参数' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' })
    }

    const resetCode = resetCodeQueries.findValid.get(email.toLowerCase().trim(), code.trim())
    if (!resetCode) {
      return res.status(400).json({ error: '验证码无效或已过期' })
    }

    const user = userQueries.findByEmail.get(email.toLowerCase().trim())
    if (!user) {
      return res.status(400).json({ error: '用户不存在' })
    }

    const hash = bcrypt.hashSync(newPassword, 10)
    userQueries.updatePassword.run(hash, user.id)
    resetCodeQueries.markUsed.run(resetCode.id)

    res.json({ message: '密码重置成功，请重新登录' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(500).json({ error: '重置失败，请稍后重试' })
  }
})

// Admin: get all users
router.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = userQueries.getAllUsers.all()
  res.json(users)
})

// Admin: generate invite codes
router.post('/admin/codes', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { count = 1, duration_days = 30 } = req.body
    const codes = []
    for (let i = 0; i < Math.min(count, 50); i++) {
      const seg1 = crypto.randomBytes(3).toString('base64url').substring(0, 4).toUpperCase()
      const seg2 = crypto.randomBytes(3).toString('base64url').substring(0, 4).toUpperCase()
      const code = `MAMIO-${seg1}-${seg2}`
      codeQueries.create.run(code, duration_days)
      codes.push(code)
    }
    res.json({ codes, duration_days })
  } catch (err) {
    console.error('Generate codes error:', err.message)
    res.status(500).json({ error: '生成失败' })
  }
})

// Admin: get all codes
router.get('/admin/codes', authMiddleware, adminMiddleware, (req, res) => {
  const codes = codeQueries.getAll.all()
  res.json(codes)
})

// Admin: usage stats
router.get('/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const today = toLocalDateKey()
    const sevenDaysAgo = localDateKeyDaysAgo(7)
    const thirtyDaysAgo = localDateKeyDaysAgo(30)

    // User counts by role
    const roleCounts = db.prepare(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `).all()

    // Active users (those who have AI calls)
    const activeUsers7d = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE ai_calls_date >= ?
    `).get(sevenDaysAgo)

    const activeUsers30d = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE ai_calls_date >= ?
    `).get(thirtyDaysAgo)

    // Total AI calls today
    const callsToday = db.prepare(`
      SELECT SUM(ai_calls_today) as total FROM users WHERE ai_calls_date = ?
    `).get(today)

    // Top users by AI calls
    const topUsers = db.prepare(`
      SELECT id, email, nickname, role, ai_calls_today, ai_calls_date, created_at
      FROM users WHERE ai_calls_today > 0
      ORDER BY ai_calls_today DESC LIMIT 10
    `).all()

    // Trial conversion: users who were trial and became paid
    const trialTotal = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role IN ('trial','expired','paid') AND created_at IS NOT NULL`).get()
    const paidTotal = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'paid'`).get()

    // Expiring soon (next 7 days)
    const expiringSoon = db.prepare(`
      SELECT id, email, nickname, role, expires_at FROM users
      WHERE role = 'paid' AND expires_at IS NOT NULL AND expires_at <= datetime('now', '+7 days')
      ORDER BY expires_at
    `).all()

    res.json({
      roleCounts: Object.fromEntries(roleCounts.map(r => [r.role, r.count])),
      activeUsers7d: activeUsers7d.count,
      activeUsers30d: activeUsers30d.count,
      callsToday: callsToday.total || 0,
      topUsers,
      trialConversion: {
        total: trialTotal.count,
        converted: paidTotal.count,
        rate: trialTotal.count > 0 ? Math.round(paidTotal.count / trialTotal.count * 100) : 0
      },
      expiringSoon
    })
  } catch (err) {
    console.error('Admin stats error:', err.message)
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

// Admin: recent API logs
router.get('/admin/logs', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const logs = logQueries.getRecent.all()
    const dailyStats = logQueries.statsByDay.all()
    res.json({ logs, dailyStats })
  } catch (err) {
    console.error('Admin logs error:', err.message)
    res.status(500).json({ error: '获取日志失败' })
  }
})

// Admin: generated content drafts
router.get('/admin/content-drafts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const drafts = await readContentDraftFiles()
    res.json({ drafts })
  } catch (err) {
    console.error('Content drafts error:', err.message)
    res.status(500).json({ error: '获取内容草稿失败' })
  }
})

// Admin: current IELTS content bank health
router.get('/admin/content-health', authMiddleware, adminMiddleware, (req, res) => {
  try {
    res.json(buildContentHealth())
  } catch (err) {
    console.error('Content health error:', err.message)
    res.status(500).json({ error: '获取题库健康数据失败' })
  }
})

// Admin: DB-published content controls
router.get('/admin/content-published', authMiddleware, adminMiddleware, (req, res) => {
  try {
    res.json({
      reading: contentQueries.getAllReading.all(),
      listening: contentQueries.getAllListening.all()
    })
  } catch (err) {
    console.error('Published content error:', err.message)
    res.status(500).json({ error: '获取已发布内容失败' })
  }
})

router.patch('/admin/content-published/:type/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { type, id } = req.params
    const { status } = req.body
    const allowed = new Set(['published', 'disabled'])
    if (!allowed.has(status)) return res.status(400).json({ error: '状态无效' })

    let result
    if (type === 'reading') {
      result = contentQueries.updateReadingStatus.run(status, id)
    } else if (type === 'listening') {
      result = contentQueries.updateListeningStatus.run(status, id)
    } else {
      return res.status(400).json({ error: '内容类型无效' })
    }

    res.json({ ok: result.changes > 0, type, id: Number(id), status })
  } catch (err) {
    console.error('Update published content status error:', err.message)
    res.status(500).json({ error: '更新发布内容状态失败' })
  }
})

async function writeDraftReviewToFile(fileName, status, notes, userId) {
  const fullPath = path.join(contentDraftDir, fileName)
  const payload = JSON.parse(await fs.readFile(fullPath, 'utf8'))
  await fs.writeFile(fullPath, `${JSON.stringify({
    ...payload,
    status,
    review: {
      status,
      notes: String(notes).slice(0, 500),
      reviewedBy: userId,
      reviewedAt: new Date().toISOString()
    }
  }, null, 2)}\n`)
}

async function writeDraftPublishToFile(fileName, publishedSummary, userId) {
  const fullPath = path.join(contentDraftDir, fileName)
  const payload = JSON.parse(await fs.readFile(fullPath, 'utf8'))
  await fs.writeFile(fullPath, `${JSON.stringify({
    ...payload,
    status: 'published',
    publishedAt: new Date().toISOString(),
    publishedBy: userId,
    publishedSummary
  }, null, 2)}\n`)
}

// Admin: review generated content draft
router.patch('/admin/content-drafts/:fileName', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName || '')
    const { status, notes = '' } = req.body
    const allowed = new Set(['draft', 'approved', 'rejected'])
    if (!fileName.endsWith('.json') || !fileName.startsWith('generated-content-')) {
      return res.status(400).json({ error: '草稿文件名无效' })
    }
    if (!allowed.has(status)) {
      return res.status(400).json({ error: '状态无效' })
    }
    contentDraftQueries.upsertStatus.run(fileName, status, String(notes).slice(0, 500), req.user.id)
    await writeDraftReviewToFile(fileName, status, notes, req.user.id)
    res.json({ fileName, status, notes })
  } catch (err) {
    console.error('Update content draft error:', err.message)
    res.status(500).json({ error: '更新草稿状态失败' })
  }
})

// Admin: publish approved generated content draft to DB
router.post('/admin/content-drafts/:fileName/publish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName || '')
    if (!fileName.endsWith('.json') || !fileName.startsWith('generated-content-')) {
      return res.status(400).json({ error: '草稿文件名无效' })
    }

    const fullPath = path.join(contentDraftDir, fileName)
    const payload = JSON.parse(await fs.readFile(fullPath, 'utf8'))
    if (payload.publishedAt) return res.status(400).json({ error: '该草稿已发布' })

    const review = contentDraftQueries.getByFile.get(fileName)
    const status = normalizeDraftStatus(payload, review)
    const quality = assessContentDraft(payload)
    if (status !== 'approved' || !quality.canMerge) {
      return res.status(400).json({ error: '只有质检通过且已批准的草稿可以发布' })
    }

    const addedReading = []
    const addedListening = []
    const skipped = []

    for (const [index, item] of (payload.readingPassages || []).entries()) {
      const result = normalizeReadingDraft(item, index)
      if (!result.ok) {
        skipped.push({ type: 'reading', title: result.title, reason: result.errors.join('; ') })
        continue
      }
      if (contentQueries.findReadingByTitle.get(result.item.title)) {
        skipped.push({ type: 'reading', title: result.item.title, reason: 'duplicate title' })
        continue
      }
      const sourceId = `${fileName}:reading:${index + 1}`
      const insert = contentQueries.addReading.run(sourceId, result.item.title, result.item.level, result.item.passage, JSON.stringify(result.item.questions))
      if (insert.changes > 0) addedReading.push(result.item.title)
    }

    for (const [index, item] of (payload.listeningSections || []).entries()) {
      const result = normalizeListeningDraft(item, index)
      if (!result.ok) {
        skipped.push({ type: 'listening', title: result.title, reason: result.errors.join('; ') })
        continue
      }
      if (contentQueries.findListeningByTitle.get(result.item.title)) {
        skipped.push({ type: 'listening', title: result.item.title, reason: 'duplicate title' })
        continue
      }
      const sourceId = `${fileName}:listening:${index + 1}`
      const insert = contentQueries.addListening.run(sourceId, result.item.section, result.item.title, result.item.description, JSON.stringify(result.item.sentences))
      if (insert.changes > 0) addedListening.push(result.item.title)
    }

    if (!addedReading.length && !addedListening.length) {
      return res.status(400).json({ error: '没有可发布的新内容', skipped })
    }

    const publishedSummary = { readingTitles: addedReading, listeningTitles: addedListening, skipped }
    await writeDraftPublishToFile(fileName, publishedSummary, req.user.id)
    contentDraftQueries.upsertStatus.run(fileName, 'published', 'Published to content DB', req.user.id)
    res.json({ fileName, publishedSummary })
  } catch (err) {
    console.error('Publish content draft error:', err.message)
    res.status(500).json({ error: '发布内容草稿失败' })
  }
})

export default router
