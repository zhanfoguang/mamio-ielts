import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { userQueries, codeQueries, resetCodeQueries } from '../db.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { sendResetCode } from '../mail.js'

const router = Router()
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

export default router
