import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import progressRoutes from './routes/progress.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Auth routes
app.use('/api/auth', authRoutes)

// AI routes (with auth + quota)
app.use('/api/ai', aiRoutes)

// Progress routes (with auth)
app.use('/api/progress', progressRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Mamio IELTS server running on port ${PORT}`)
})
