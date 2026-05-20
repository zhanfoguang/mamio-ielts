import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'

const [
  { default: authRoutes },
  { default: aiRoutes },
  { default: progressRoutes },
  { default: contentRoutes }
] = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/ai.js'),
  import('./routes/progress.js'),
  import('./routes/content.js')
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Mamio IELTS server running on port ${PORT}`)
})
