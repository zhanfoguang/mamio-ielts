import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'mamio.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'trial',
    ai_calls_today INTEGER DEFAULT 0,
    ai_calls_date TEXT,
    trial_start TEXT,
    expires_at TEXT,
    invite_code TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    duration_days INTEGER DEFAULT 30,
    used_by INTEGER,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// Auto-create admin account
function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@mamio.com'
  const password = process.env.ADMIN_PASSWORD || 'mamio2024'
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10)
    db.prepare('INSERT INTO users (email, password, nickname, role, trial_start, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      email, hash, 'Admin', 'admin', null, null
    )
    console.log(`Admin account created: ${email}`)
  }
}

ensureAdmin()

// User queries
export const userQueries = {
  create: db.prepare('INSERT INTO users (email, password, nickname, role, trial_start, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
  findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findById: db.prepare('SELECT id, email, nickname, role, ai_calls_today, ai_calls_date, trial_start, expires_at, invite_code, created_at FROM users WHERE id = ?'),
  incrementCalls: db.prepare('UPDATE users SET ai_calls_today = ai_calls_today + 1, ai_calls_date = ? WHERE id = ?'),
  resetDailyCalls: db.prepare('UPDATE users SET ai_calls_today = 0, ai_calls_date = ? WHERE id = ? AND ai_calls_date != ?'),
  activateCode: db.prepare('UPDATE users SET role = ?, expires_at = ?, invite_code = ? WHERE id = ?'),
  getAllUsers: db.prepare('SELECT id, email, nickname, role, ai_calls_today, trial_start, expires_at, created_at FROM users ORDER BY created_at DESC'),
  updateRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  updatePassword: db.prepare('UPDATE users SET password = ? WHERE id = ?')
}

// Reset code queries
export const resetCodeQueries = {
  create: db.prepare('INSERT INTO reset_codes (email, code, expires_at) VALUES (?, ?, ?)'),
  findValid: db.prepare('SELECT * FROM reset_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime(\'now\') ORDER BY created_at DESC LIMIT 1'),
  markUsed: db.prepare('UPDATE reset_codes SET used = 1 WHERE id = ?'),
  cleanExpired: db.prepare('DELETE FROM reset_codes WHERE expires_at < datetime(\'now\')')
}

// Invite code queries
export const codeQueries = {
  create: db.prepare('INSERT INTO invite_codes (code, duration_days) VALUES (?, ?)'),
  findByCode: db.prepare('SELECT * FROM invite_codes WHERE code = ?'),
  markUsed: db.prepare('UPDATE invite_codes SET used_by = ?, used_at = datetime(\'now\') WHERE id = ?'),
  getAll: db.prepare('SELECT ic.*, u.email as used_by_email FROM invite_codes ic LEFT JOIN users u ON ic.used_by = u.id ORDER BY ic.created_at DESC'),
  getUnused: db.prepare('SELECT * FROM invite_codes WHERE used_by IS NULL ORDER BY created_at DESC')
}

// Check and update user quota
export function checkUserQuota(userId) {
  const user = userQueries.findById.get(userId)
  if (!user) return { allowed: false, reason: '用户不存在' }

  const today = new Date().toISOString().split('T')[0]

  // Reset daily counter if new day
  if (user.ai_calls_date !== today) {
    userQueries.resetDailyCalls.run(today, userId, today)
    user.ai_calls_today = 0
  }

  // Admin: unlimited
  if (user.role === 'admin') {
    return { allowed: true, remaining: -1, role: 'admin' }
  }

  // Check expiry for paid users
  if (user.role === 'paid') {
    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      userQueries.updateRole.run('expired', userId)
      return { allowed: false, reason: '会员已过期，请续费激活', remaining: 0, role: 'expired' }
    }
    return { allowed: true, remaining: -1, role: 'paid' }
  }

  // Expired
  if (user.role === 'expired') {
    return { allowed: false, reason: '试用已过期，请激活码激活', remaining: 0, role: 'expired' }
  }

  // Trial: check 3-day window + daily limit
  if (user.role === 'trial') {
    const trialStart = new Date(user.trial_start)
    const daysSinceTrial = Math.floor((new Date() - trialStart) / (1000 * 60 * 60 * 24))
    if (daysSinceTrial >= 3) {
      userQueries.updateRole.run('expired', userId)
      return { allowed: false, reason: '3天试用已过期，请激活码激活', remaining: 0, role: 'expired' }
    }

    const dailyLimit = 10
    if (user.ai_calls_today >= dailyLimit) {
      return { allowed: false, reason: `今日免费次数已用完（${dailyLimit}次/天），明天再来或激活码解锁`, remaining: 0, role: 'trial' }
    }

    return { allowed: true, remaining: dailyLimit - user.ai_calls_today, role: 'trial', daysLeft: 3 - daysSinceTrial }
  }

  return { allowed: false, reason: '未知状态', remaining: 0 }
}

export default db
