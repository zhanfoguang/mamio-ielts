import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { checkUserQuota, userQueries } from '../db.js'

const router = Router()

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

function parseJSON(text) {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  if (match) {
    try { return JSON.parse(match[1].trim()) } catch {}
  }
  throw new Error('Failed to parse AI response as JSON')
}

async function callDeepSeek(systemPrompt, userPrompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`DeepSeek API error: ${res.status} ${err}`)
    }

    const data = await res.json()
    return data.choices[0].message.content
  } finally {
    clearTimeout(timeout)
  }
}

// Auth + quota middleware for all AI routes
router.use(authMiddleware)

function checkQuota(req, res, next) {
  const quota = checkUserQuota(req.user.id)
  if (!quota.allowed) {
    return res.status(403).json({ error: quota.reason, quota })
  }
  req.quota = quota
  next()
}

function incrementCalls(userId) {
  const today = new Date().toISOString().split('T')[0]
  userQueries.incrementCalls.run(today, userId)
}

// 口语 AI 对话模式
router.post('/speaking-conversation', checkQuota, async (req, res) => {
  try {
    const { question, history, userAnswer, part } = req.body
    if (!question || !userAnswer) {
      return res.status(400).json({ error: '缺少题目或回答内容' })
    }

    const exchangeCount = (history || []).filter(h => h.role === 'user').length
    const maxExchanges = (part === 1 || part === 3) ? 3 : 2
    const shouldScore = exchangeCount >= maxExchanges

    const systemPrompt = shouldScore
      ? `你是一位资深雅思考官。考生刚完成了一段口语对话练习（Part ${part}）。请根据整个对话过程进行评分。
评分维度：流利度与连贯性(Fluency)、词汇多样性(Lexical)、语法准确性(Grammar)、发音(Pronunciation)。
每个维度给 band 分数(1-9)，并给出总分和改进建议。
请用 JSON 格式回复，不要包含其他内容：
{
  "type": "score",
  "fluency": {"score": 7, "comment": "..."},
  "lexical": {"score": 6, "comment": "..."},
  "grammar": {"score": 7, "comment": "..."},
  "pronunciation": {"score": 6, "comment": "..."},
  "overall": 6.5,
  "suggestions": ["建议1", "建议2"],
  "improvedAnswer": "改进后的示范回答"
}`
      : `你是一位雅思考官，正在进行口语考试 Part ${part}。请根据考生的回答提出一个自然的追问问题（像真实考官那样），让对话更深入。
要求：
- 追问要自然，不能太长
- 如果考生回答太短，可以引导他们展开
- 如果考生回答不错，可以深入探讨细节
- 用英文提问，保持考试氛围
请用 JSON 格式回复，不要包含其他内容：
{
  "type": "followup",
  "question": "Your follow-up question here"
}`

    const messages = [{ role: 'system', content: systemPrompt }]
    if (history && history.length > 0) {
      for (const h of history) {
        messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })
      }
    }
    messages.push({ role: 'user', content: `原始题目：${question}\n\n考生回答：${userAnswer}` })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 2000
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`DeepSeek API error: ${response.status} ${err}`)
      }

      const data = await response.json()
      const result = parseJSON(data.choices[0].message.content)
      incrementCalls(req.user.id)
      res.json({ ...result, quota: req.quota })
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    console.error('AI conversation error:', err.message)
    res.status(500).json({ error: 'AI 对话失败，请稍后重试' })
  }
})

// 口语评分
router.post('/speaking', checkQuota, async (req, res) => {
  try {
    const { question, userAnswer, part, confidenceData } = req.body
    if (!question || !userAnswer) {
      return res.status(400).json({ error: '缺少题目或回答内容' })
    }
    if (userAnswer.length > 3000) {
      return res.status(400).json({ error: '回答内容过长，最多 3000 字符' })
    }

    const confidenceInfo = confidenceData && confidenceData.length > 0
      ? `\n\n语音识别置信度数据（每句话的识别置信度，0-1，越低表示发音可能越不清晰）：${JSON.stringify(confidenceData.map(w => ({ word: w.word, confidence: Math.round(w.confidence * 100) / 100 })))}\n平均置信度：${Math.round((confidenceData.reduce((s, w) => s + w.confidence, 0) / confidenceData.length) * 100) / 100}`
      : ''

    const systemPrompt = `你是一位资深雅思考官。请根据雅思口语评分标准对考生的回答进行评分。
评分维度：流利度与连贯性(Fluency)、词汇多样性(Lexical)、语法准确性(Grammar)、发音(Pronunciation)。
${confidenceData && confidenceData.length > 0 ? '发音评分时请参考语音识别置信度数据——置信度低的词可能发音不清晰。' : '发音评分基于用词和表达的准确性推测。'}
每个维度给 band 分数(1-9)，并给出总分。
${confidenceData && confidenceData.length > 0 ? '另外请分析可能发音不准的词（尤其是置信度低于0.8的词、以及中国考生常见的发音难点词），给出 pronunciationWords 数组。' : ''}
请用 JSON 格式回复，不要包含其他内容：
{
  "fluency": {"score": 7, "comment": "..."},
  "lexical": {"score": 6, "comment": "..."},
  "grammar": {"score": 7, "comment": "..."},
  "pronunciation": {"score": 6, "comment": "..."},
  "overall": 6.5,
  "suggestions": ["建议1", "建议2"],
  "improvedAnswer": "改进后的示范回答"${confidenceData && confidenceData.length > 0 ? ',\n  "pronunciationWords": [\n    {"word": "example", "issue": "th音发音不准", "tip": "舌尖轻触上齿"}\n  ]' : ''}
}`

    const userPrompt = `Part ${part || 1} 口语题目：${question}\n\n考生回答（语音转文字）：${userAnswer}${confidenceInfo}`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    incrementCalls(req.user.id)
    res.json({ ...parsed, quota: req.quota })
  } catch (err) {
    console.error('AI speaking error:', err.message)
    res.status(500).json({ error: 'AI 评分失败，请稍后重试' })
  }
})

// 写作批改
router.post('/writing', checkQuota, async (req, res) => {
  try {
    const { task, essay, taskType } = req.body
    if (!task || !essay) {
      return res.status(400).json({ error: '缺少题目或作文内容' })
    }
    if (essay.length > 5000) {
      return res.status(400).json({ error: '作文内容过长，最多 5000 字符' })
    }

    const systemPrompt = `你是一位雅思考官。请对考生的雅思写作给出评分方向和改进建议。
评分维度：Task Response(任务回应)、Coherence(连贯性)、Lexical Resource(词汇)、Grammar(语法)。
每个维度给 band 分数(1-9)，指出主要问题，给出改进方向。
注意：不需要逐字逐句批改，重点是方向性指导，帮助考生理解自己的薄弱环节。
请用 JSON 格式回复，不要包含其他内容：
{
  "taskResponse": {"score": 6, "comment": "...", "direction": "改进方向"},
  "coherence": {"score": 6, "comment": "...", "direction": "改进方向"},
  "lexical": {"score": 5, "comment": "...", "direction": "改进方向"},
  "grammar": {"score": 6, "comment": "...", "direction": "改进方向"},
  "overall": 6,
  "strengths": ["优点1"],
  "weaknesses": ["问题1", "问题2"],
  "actionPlan": ["行动建议1", "行动建议2"]
}`

    const userPrompt = `${taskType === 1 ? 'Task 1' : 'Task 2'} 题目：${task}\n\n考生作文：\n${essay}`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    incrementCalls(req.user.id)
    res.json({ ...parsed, quota: req.quota })
  } catch (err) {
    console.error('AI writing error:', err.message)
    res.status(500).json({ error: 'AI 批改失败，请稍后重试' })
  }
})

// 词汇生成
router.post('/vocab', checkQuota, async (req, res) => {
  try {
    const { topic, level } = req.body
    if (!topic) {
      return res.status(400).json({ error: '请提供话题名称' })
    }

    const systemPrompt = `你是一位雅思词汇专家。请为指定话题生成雅思高频词汇。
每个词包含：单词、音标、中文释义、例句(雅思写作/口语中常用)、常见搭配、适用 band 等级。
生成 10 个词汇，按难度递增排列。
请用 JSON 格式回复，不要包含其他内容：
{
  "words": [
    {
      "word": "example",
      "phonetic": "/ɪɡˈzɑːmpəl/",
      "meaning": "例子，范例",
      "example": "For example, ...",
      "collocations": ["give an example", "set an example"],
      "band": 6
    }
  ]
}`

    const userPrompt = `话题：${topic}，目标 band：${level || '6-7'}`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    incrementCalls(req.user.id)
    res.json({ ...parsed, quota: req.quota })
  } catch (err) {
    console.error('AI vocab error:', err.message)
    res.status(500).json({ error: '词汇生成失败，请稍后重试' })
  }
})

// 听力理解题生成
router.post('/listening', checkQuota, async (req, res) => {
  try {
    const { topic, section } = req.body
    if (!topic) {
      return res.status(400).json({ error: '请提供话题名称' })
    }

    const systemPrompt = `你是一位雅思听力专家。请为指定话题生成一段雅思听力练习材料。
包含：
1. 一段听力原文（对话或独白，150-250词）
2. 中文翻译
3. 5道理解题（选择题或填空题）
请用 JSON 格式回复，不要包含其他内容：
{
  "transcript": "听力英文原文",
  "translation": "中文翻译",
  "questions": [
    {
      "question": "题目描述",
      "type": "choice",
      "options": ["A. ...", "B. ...", "C. ..."],
      "answer": "A"
    }
  ]
}`

    const userPrompt = `话题：${topic}，Section ${section || 1} 难度`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    incrementCalls(req.user.id)
    res.json({ ...parsed, quota: req.quota })
  } catch (err) {
    console.error('AI listening error:', err.message)
    res.status(500).json({ error: '听力材料生成失败，请稍后重试' })
  }
})

export default router
