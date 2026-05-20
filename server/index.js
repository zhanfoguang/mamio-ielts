import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'

const [
  { default: authRoutes },
  { default: aiRoutes },
  { default: progressRoutes },
  { default: contentRoutes },
  { default: db }
] = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/ai.js'),
  import('./routes/progress.js'),
  import('./routes/content.js'),
  import('./db.js')
])

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '100kb' }))

// Auth routes
app.use('/api/auth', authRoutes)

// AI routes (with auth + quota)
app.use('/api/ai', aiRoutes)

// Progress routes (with auth)
app.use('/api/progress', progressRoutes)

// Published content routes
app.use('/api/content', contentRoutes)

function getCommitHash() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim()
  } catch {
    return 'unknown'
  }
}

function getDbStatus() {
  try {
    db.prepare('SELECT 1 as ok').get()
    return 'ok'
  } catch {
    return 'error'
  }
}

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus()
  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    commit: getCommitHash(),
    db: dbStatus,
    env: {
      jwtSecret: Boolean(process.env.JWT_SECRET),
      adminPassword: Boolean(process.env.ADMIN_PASSWORD),
      deepseekApiKey: Boolean(process.env.DEEPSEEK_API_KEY),
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
    }
  })
})

app.listen(PORT, () => {
  console.log(`Mamio IELTS server running on port ${PORT}`)
})
