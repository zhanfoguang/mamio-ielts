import jwt from 'jsonwebtoken'
import { userQueries } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = userQueries.findById.get(payload.id)
    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

export function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  next()
}
