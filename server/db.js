import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'
import { toLocalDateKey } from './utils/date.js'

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

  CREATE TABLE IF NOT EXISTS speaking_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mode TEXT DEFAULT 'practice',
    part INTEGER,
    topic TEXT,
    question TEXT,
    answer TEXT,
    score REAL,
    details TEXT,
    exchanges INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS writing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_type INTEGER,
    task TEXT,
    essay TEXT,
    score REAL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    passage TEXT,
    score INTEGER,
    correct INTEGER,
    total INTEGER,
    time INTEGER,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    section TEXT,
    section_number INTEGER,
    mode TEXT DEFAULT 'completion',
    score INTEGER,
    correct INTEGER,
    total INTEGER,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vocab_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    ease REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    due INTEGER,
    last_review INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, word),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    speaking INTEGER DEFAULT 0,
    writing INTEGER DEFAULT 0,
    listening INTEGER DEFAULT 0,
    reading INTEGER DEFAULT 0,
    vocab INTEGER DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS review_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module TEXT NOT NULL DEFAULT 'general',
    type TEXT NOT NULL DEFAULT 'note',
    text TEXT NOT NULL,
    reason TEXT DEFAULT '',
    source TEXT DEFAULT '',
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_review_items_user ON review_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items(user_id, reviewed_at);
  CREATE INDEX IF NOT EXISTS idx_reading_history_user_time ON reading_history(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_listening_history_user_time ON listening_history(user_id, created_at);

  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'POST',
    status INTEGER,
    latency_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_logs_time ON api_logs(created_at);

  CREATE TABLE IF NOT EXISTS content_draft_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft',
    notes TEXT DEFAULT '',
    reviewed_by INTEGER,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_content_draft_reviews_status ON content_draft_reviews(status);

  CREATE TABLE IF NOT EXISTS reading_passages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT UNIQUE,
    title TEXT NOT NULL,
    level TEXT DEFAULT 'medium',
    passage TEXT NOT NULL,
    questions TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listening_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT UNIQUE,
    section_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    sentences TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reading_passages_status ON reading_passages(status);
  CREATE INDEX IF NOT EXISTS idx_listening_sections_status ON listening_sections(status, section_number);
`)

// Auto-create admin account
function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@mamio.com'
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.error('FATAL: ADMIN_PASSWORD environment variable is required')
    process.exit(1)
  }
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

// Progress queries
export const progressQueries = {
  // Speaking
  getSpeaking: db.prepare('SELECT * FROM speaking_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  addSpeaking: db.prepare('INSERT INTO speaking_history (user_id, mode, part, topic, question, answer, score, details, exchanges) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),

  // Writing
  getWriting: db.prepare('SELECT * FROM writing_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  addWriting: db.prepare('INSERT INTO writing_history (user_id, task_type, task, essay, score, details) VALUES (?, ?, ?, ?, ?, ?)'),

  // Reading
  getReading: db.prepare('SELECT * FROM reading_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  addReading: db.prepare('INSERT INTO reading_history (user_id, passage, score, correct, total, time, details) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  addReadingWithDate: db.prepare('INSERT INTO reading_history (user_id, passage, score, correct, total, time, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),

  // Listening
  getListening: db.prepare('SELECT * FROM listening_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
  addListening: db.prepare('INSERT INTO listening_history (user_id, section, section_number, mode, score, correct, total, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  addListeningWithDate: db.prepare('INSERT INTO listening_history (user_id, section, section_number, mode, score, correct, total, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),

  // Vocab
  getVocab: db.prepare('SELECT * FROM vocab_progress WHERE user_id = ?'),
  upsertVocab: db.prepare(`INSERT INTO vocab_progress (user_id, word, ease, interval, reps, due, last_review, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, word) DO UPDATE SET ease=excluded.ease, interval=excluded.interval, reps=excluded.reps, due=excluded.due, last_review=excluded.last_review, updated_at=datetime('now')`),

  // Daily stats
  getDailyStats: db.prepare('SELECT * FROM daily_stats WHERE user_id = ? AND date = ?'),
  getDailyStatsRange: db.prepare('SELECT * FROM daily_stats WHERE user_id = ? AND date >= ? ORDER BY date'),
  ensureDailyStats: db.prepare('INSERT OR IGNORE INTO daily_stats (user_id, date) VALUES (?, ?)'),
  incrementDailyModule: {
    speaking: db.prepare('UPDATE daily_stats SET speaking = speaking + 1 WHERE user_id = ? AND date = ?'),
    writing: db.prepare('UPDATE daily_stats SET writing = writing + 1 WHERE user_id = ? AND date = ?'),
    listening: db.prepare('UPDATE daily_stats SET listening = listening + 1 WHERE user_id = ? AND date = ?'),
    reading: db.prepare('UPDATE daily_stats SET reading = reading + 1 WHERE user_id = ? AND date = ?'),
    vocab: db.prepare('UPDATE daily_stats SET vocab = vocab + 1 WHERE user_id = ? AND date = ?')
  }
}

// Review items queries
export const reviewItemQueries = {
  getByUser: db.prepare('SELECT * FROM review_items WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'),
  getDueByUser: db.prepare('SELECT * FROM review_items WHERE user_id = ? AND reviewed_at IS NULL ORDER BY created_at DESC LIMIT 50'),
  findActiveDuplicate: db.prepare('SELECT id FROM review_items WHERE user_id = ? AND module = ? AND type = ? AND lower(text) = lower(?) AND reviewed_at IS NULL LIMIT 1'),
  add: db.prepare('INSERT INTO review_items (user_id, module, type, text, reason, source) VALUES (?, ?, ?, ?, ?, ?)'),
  markReviewed: db.prepare('UPDATE review_items SET reviewed_at = datetime(\'now\') WHERE id = ? AND user_id = ?'),
  delete: db.prepare('DELETE FROM review_items WHERE id = ? AND user_id = ?'),
  deleteAll: db.prepare('DELETE FROM review_items WHERE user_id = ?'),
  countByUser: db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN reviewed_at IS NULL THEN 1 ELSE 0 END) as due FROM review_items WHERE user_id = ?')
}

// API log queries
export const logQueries = {
  add: db.prepare('INSERT INTO api_logs (user_id, endpoint, method, status, latency_ms) VALUES (?, ?, ?, ?, ?)'),
  getByUser: db.prepare('SELECT * FROM api_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'),
  getRecent: db.prepare('SELECT al.*, u.email, u.nickname FROM api_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 200'),
  prune: db.prepare("DELETE FROM api_logs WHERE created_at < datetime('now', '-30 days')"),
  statsByDay: db.prepare("SELECT date(created_at) as day, COUNT(*) as calls, AVG(latency_ms) as avg_latency FROM api_logs WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY day DESC")
}

// Content draft review queries
export const contentDraftQueries = {
  getAll: db.prepare('SELECT * FROM content_draft_reviews ORDER BY created_at DESC'),
  getByFile: db.prepare('SELECT * FROM content_draft_reviews WHERE file_name = ?'),
  upsertStatus: db.prepare(`INSERT INTO content_draft_reviews (file_name, status, notes, reviewed_by, reviewed_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(file_name) DO UPDATE SET status=excluded.status, notes=excluded.notes, reviewed_by=excluded.reviewed_by, reviewed_at=datetime('now')`)
}

// Published content queries
export const contentQueries = {
  getReading: db.prepare("SELECT * FROM reading_passages WHERE status = 'published' ORDER BY id"),
  getListening: db.prepare("SELECT * FROM listening_sections WHERE status = 'published' ORDER BY section_number, id"),
  findReadingByTitle: db.prepare("SELECT id FROM reading_passages WHERE lower(title) = lower(?) AND status != 'disabled' LIMIT 1"),
  findListeningByTitle: db.prepare("SELECT id FROM listening_sections WHERE lower(title) = lower(?) AND status != 'disabled' LIMIT 1"),
  addReading: db.prepare(`INSERT OR IGNORE INTO reading_passages (source_id, title, level, passage, questions, status, version)
    VALUES (?, ?, ?, ?, ?, 'published', 1)`),
  addListening: db.prepare(`INSERT OR IGNORE INTO listening_sections (source_id, section_number, title, description, sentences, status, version)
    VALUES (?, ?, ?, ?, ?, 'published', 1)`)
}

// Prune old logs on startup
logQueries.prune.run()

// Check and update user quota
export function checkUserQuota(userId) {
  const user = userQueries.findById.get(userId)
  if (!user) return { allowed: false, reason: '用户不存在' }

  const today = toLocalDateKey()

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
