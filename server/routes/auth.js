import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import db, { userQueries, codeQueries, resetCodeQueries, logQueries, contentDraftQueries } from '../db.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { sendResetCode } from '../mail.js'
import { localDateKeyDaysAgo, toLocalDateKey } from '../utils/date.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contentDraftDir = path.resolve(__dirname, '../../AI-OPS/content-drafts')
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
      drafts.push({
        fileName,
        status: review?.status || payload.status || 'draft',
        notes: review?.notes || '',
        reviewedAt: review?.reviewed_at || null,
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

// Admin: review generated content draft
router.patch('/admin/content-drafts/:fileName', authMiddleware, adminMiddleware, (req, res) => {
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
    res.json({ fileName, status, notes })
  } catch (err) {
    console.error('Update content draft error:', err.message)
    res.status(500).json({ error: '更新草稿状态失败' })
  }
})

export default router
