import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import aiRoutes from './routes/ai.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// AI routes (no auth needed)
app.use('/api/ai', aiRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Mamio IELTS server running on port ${PORT}`)
})
