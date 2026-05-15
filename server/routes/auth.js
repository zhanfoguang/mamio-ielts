import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userQueries, codeQueries } from '../db.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'mamio-ielts-secret-key'

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
}

// Register
router.post('/register', (req, res) => {
  try {
    const { email, password, nickname } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' })
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
router.post('/login', (req, res) => {
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

    const token = generateToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        ai_calls_today: user.ai_calls_today,
        trial_start: user.trial_start,
        expires_at: user.expires_at
      }
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = req.user
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

    const inviteCode = codeQueries.findByCode.get(code.trim())
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
      const code = 'MAMIO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
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

export default router
