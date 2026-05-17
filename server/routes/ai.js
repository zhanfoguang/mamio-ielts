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

function clampScore(val) {
  const n = Number(val)
  if (isNaN(n)) return null
  return Math.max(1, Math.min(9, Math.round(n * 2) / 2))
}

function normalizeReviewItems(items) {
  if (!Array.isArray(items)) return []
  return items.filter(i => i && typeof i.text === 'string').map(i => ({
    type: String(i.type || 'note'),
    text: String(i.text).slice(0, 500),
    reason: String(i.reason || '').slice(0, 300)
  }))
}

function normalizeSpeakingResult(parsed) {
  return {
    fluency: parsed.fluency && typeof parsed.fluency === 'object' ? { score: clampScore(parsed.fluency.score), comment: String(parsed.fluency.comment || '') } : null,
    lexical: parsed.lexical && typeof parsed.lexical === 'object' ? { score: clampScore(parsed.lexical.score), comment: String(parsed.lexical.comment || '') } : null,
    grammar: parsed.grammar && typeof parsed.grammar === 'object' ? { score: clampScore(parsed.grammar.score), comment: String(parsed.grammar.comment || '') } : null,
    pronunciation: parsed.pronunciation && typeof parsed.pronunciation === 'object' ? { score: clampScore(parsed.pronunciation.score), comment: String(parsed.pronunciation.comment || '') } : null,
    overall: clampScore(parsed.overall),
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5).map(String) : [],
    improvedAnswer: parsed.improvedAnswer ? String(parsed.improvedAnswer).slice(0, 2000) : null,
    weakestArea: parsed.weakestArea ? String(parsed.weakestArea).slice(0, 100) : null,
    nextAction: parsed.nextAction ? String(parsed.nextAction).slice(0, 300) : null,
    suggestedPractice: parsed.suggestedPractice && typeof parsed.suggestedPractice === 'object' ? {
      module: String(parsed.suggestedPractice.module || 'speaking'),
      part: parsed.suggestedPractice.part || null,
      task: String(parsed.suggestedPractice.task || '').slice(0, 300)
    } : null,
    reviewItems: normalizeReviewItems(parsed.reviewItems),
    pronunciationWords: Array.isArray(parsed.pronunciationWords) ? parsed.pronunciationWords.map(w => ({
      word: String(w.word || ''),
      issue: String(w.issue || ''),
      tip: String(w.tip || '')
    })) : []
  }
}

function normalizeWritingResult(parsed) {
  return {
    taskResponse: parsed.taskResponse && typeof parsed.taskResponse === 'object' ? { score: clampScore(parsed.taskResponse.score), comment: String(parsed.taskResponse.comment || ''), direction: String(parsed.taskResponse.direction || '') } : null,
    coherence: parsed.coherence && typeof parsed.coherence === 'object' ? { score: clampScore(parsed.coherence.score), comment: String(parsed.coherence.comment || ''), direction: String(parsed.coherence.direction || '') } : null,
    lexical: parsed.lexical && typeof parsed.lexical === 'object' ? { score: clampScore(parsed.lexical.score), comment: String(parsed.lexical.comment || ''), direction: String(parsed.lexical.direction || '') } : null,
    grammar: parsed.grammar && typeof parsed.grammar === 'object' ? { score: clampScore(parsed.grammar.score), comment: String(parsed.grammar.comment || ''), direction: String(parsed.grammar.direction || '') } : null,
    overall: clampScore(parsed.overall),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).map(String) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5).map(String) : [],
    actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan.slice(0, 5).map(String) : [],
    weakestArea: parsed.weakestArea ? String(parsed.weakestArea).slice(0, 100) : null,
    nextAction: parsed.nextAction ? String(parsed.nextAction).slice(0, 300) : null,
    suggestedPractice: parsed.suggestedPractice && typeof parsed.suggestedPractice === 'object' ? {
      module: String(parsed.suggestedPractice.module || 'writing'),
      taskType: parsed.suggestedPractice.taskType || null,
      task: String(parsed.suggestedPractice.task || '').slice(0, 300)
    } : null,
    rewriteMission: parsed.rewriteMission && typeof parsed.rewriteMission === 'object' ? {
      target: String(parsed.rewriteMission.target || '').slice(0, 200),
      instruction: String(parsed.rewriteMission.instruction || '').slice(0, 500),
      checklist: Array.isArray(parsed.rewriteMission.checklist) ? parsed.rewriteMission.checklist.slice(0, 6).map(String) : []
    } : null,
    reviewItems: normalizeReviewItems(parsed.reviewItems)
  }
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
    const { question, history, userAnswer, part, lang } = req.body
    if (!question || !userAnswer) {
      return res.status(400).json({ error: '缺少题目或回答内容' })
    }

    const isZh = lang !== 'en'
    const exchangeCount = (history || []).filter(h => h.role === 'user').length
    const maxExchanges = (part === 1 || part === 3) ? 3 : 2
    const shouldScore = exchangeCount >= maxExchanges

    const systemPrompt = shouldScore
      ? (isZh
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
  "improvedAnswer": "改进后的示范回答",
  "weakestArea": "Fluency",
  "nextAction": "下一次练习时先用 3 句话完整展开原因和例子",
  "suggestedPractice": {"module": "speaking", "part": 2, "task": "用 90 秒回答同类话题，重点练连贯展开"},
  "reviewItems": [
    {"type": "expression", "text": "I would say that...", "reason": "用于自然展开观点"},
    {"type": "weakness", "text": "回答过短，缺少具体例子", "reason": "影响 Fluency and Coherence"}
  ]
}`
        : `You are a senior IELTS examiner. The candidate has just completed a speaking practice session (Part ${part}). Please evaluate based on the entire conversation.
Scoring dimensions: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.
Score each dimension on a band scale (1-9), give an overall score and improvement suggestions.
Reply in JSON format only, no other content:
{
  "type": "score",
  "fluency": {"score": 7, "comment": "..."},
  "lexical": {"score": 6, "comment": "..."},
  "grammar": {"score": 7, "comment": "..."},
  "pronunciation": {"score": 6, "comment": "..."},
  "overall": 6.5,
  "suggestions": ["suggestion1", "suggestion2"],
  "improvedAnswer": "An improved model answer",
  "weakestArea": "Fluency",
  "nextAction": "In the next attempt, expand each answer with a reason and one concrete example.",
  "suggestedPractice": {"module": "speaking", "part": 2, "task": "Answer a similar cue card for 90 seconds with a clear example"},
  "reviewItems": [
    {"type": "expression", "text": "I would say that...", "reason": "Useful for naturally expanding an opinion"},
    {"type": "weakness", "text": "Answers are too short and lack examples", "reason": "Limits Fluency and Coherence"}
  ]
}`)
      : (isZh
        ? `你是一位雅思考官，正在进行口语考试 Part ${part}。请根据考生的回答提出一个自然的追问问题（像真实考官那样），让对话更深入。
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
        : `You are an IELTS examiner conducting a speaking test Part ${part}. Based on the candidate's answer, ask a natural follow-up question (like a real examiner) to deepen the conversation.
Requirements:
- Keep follow-ups natural and concise
- If the answer is too short, guide them to elaborate
- If the answer is good, explore details further
- Ask in English, maintain test atmosphere
Reply in JSON format only, no other content:
{
  "type": "followup",
  "question": "Your follow-up question here"
}`)

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
      const normalized = result.type === 'score' ? normalizeSpeakingResult(result) : result
      incrementCalls(req.user.id)
      res.json({ ...normalized, quota: req.quota })
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
    const { question, userAnswer, part, confidenceData, lang } = req.body
    if (!question || !userAnswer) {
      return res.status(400).json({ error: '缺少题目或回答内容' })
    }
    if (userAnswer.length > 5000) {
      return res.status(400).json({ error: '回答内容过长，最多 5000 字符' })
    }

    const isZh = lang !== 'en'
    const confidenceInfo = confidenceData && confidenceData.length > 0
      ? (isZh
        ? `\n\n语音识别置信度数据（每句话的识别置信度，0-1，越低表示发音可能越不清晰）：${JSON.stringify(confidenceData.map(w => ({ word: w.word, confidence: Math.round(w.confidence * 100) / 100 })))}\n平均置信度：${Math.round((confidenceData.reduce((s, w) => s + w.confidence, 0) / confidenceData.length) * 100) / 100}`
        : `\n\nSpeech recognition confidence data (per-word confidence, 0-1, lower = less clear pronunciation): ${JSON.stringify(confidenceData.map(w => ({ word: w.word, confidence: Math.round(w.confidence * 100) / 100 })))}\nAverage confidence: ${Math.round((confidenceData.reduce((s, w) => s + w.confidence, 0) / confidenceData.length) * 100) / 100}`)
      : ''

    const hasConfidence = confidenceData && confidenceData.length > 0
    const systemPrompt = isZh
      ? `你是一位资深雅思考官。请根据雅思口语评分标准对考生的回答进行评分。
评分维度：流利度与连贯性(Fluency)、词汇多样性(Lexical)、语法准确性(Grammar)、发音(Pronunciation)。
${hasConfidence ? '发音评分时请参考语音识别置信度数据——置信度低的词可能发音不清晰。' : '发音评分基于用词和表达的准确性推测。'}
每个维度给 band 分数(1-9)，并给出总分。
${hasConfidence ? '另外请分析可能发音不准的词（尤其是置信度低于0.8的词、以及中国考生常见的发音难点词），给出 pronunciationWords 数组。' : ''}
请用 JSON 格式回复，不要包含其他内容：
{
  "fluency": {"score": 7, "comment": "..."},
  "lexical": {"score": 6, "comment": "..."},
  "grammar": {"score": 7, "comment": "..."},
  "pronunciation": {"score": 6, "comment": "..."},
  "overall": 6.5,
  "suggestions": ["建议1", "建议2"],
  "improvedAnswer": "改进后的示范回答",
  "weakestArea": "Fluency",
  "nextAction": "下一次回答时用 1 个观点 + 1 个原因 + 1 个例子的结构展开",
  "suggestedPractice": {"module": "speaking", "part": ${part || 1}, "task": "重答同一题，至少说 45 秒并加入具体例子"},
  "reviewItems": [
    {"type": "expression", "text": "The main reason is that...", "reason": "帮助展开原因"},
    {"type": "weakness", "text": "回答缺少具体例子", "reason": "影响流利度与连贯性"}
  ]${hasConfidence ? ',\n  "pronunciationWords": [\n    {"word": "example", "issue": "th音发音不准", "tip": "舌尖轻触上齿"}\n  ]' : ''}
}`
      : `You are a senior IELTS examiner. Please evaluate the candidate's answer based on IELTS speaking assessment criteria.
Scoring dimensions: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.
${hasConfidence ? 'When scoring pronunciation, refer to the speech recognition confidence data — words with lower confidence may have unclear pronunciation.' : 'Pronunciation scoring is based on vocabulary usage and expression accuracy.'}
Score each dimension on a band scale (1-9) and give an overall score.
${hasConfidence ? 'Also analyze words that may be mispronounced (especially those with confidence below 0.8 and common pronunciation difficulty words), and provide a pronunciationWords array.' : ''}
Reply in JSON format only, no other content:
{
  "fluency": {"score": 7, "comment": "..."},
  "lexical": {"score": 6, "comment": "..."},
  "grammar": {"score": 7, "comment": "..."},
  "pronunciation": {"score": 6, "comment": "..."},
  "overall": 6.5,
  "suggestions": ["suggestion1", "suggestion2"],
  "improvedAnswer": "An improved model answer",
  "weakestArea": "Fluency",
  "nextAction": "In the next answer, use one point, one reason, and one concrete example.",
  "suggestedPractice": {"module": "speaking", "part": ${part || 1}, "task": "Answer the same question again for at least 45 seconds with a concrete example"},
  "reviewItems": [
    {"type": "expression", "text": "The main reason is that...", "reason": "Helps expand reasons"},
    {"type": "weakness", "text": "Answer lacks concrete examples", "reason": "Limits Fluency and Coherence"}
  ]${hasConfidence ? ',\n  "pronunciationWords": [\n    {"word": "example", "issue": "Unclear th sound", "tip": "Tongue lightly touches upper teeth"}\n  ]' : ''}
}`

    const userPrompt = isZh
      ? `Part ${part || 1} 口语题目：${question}\n\n考生回答（语音转文字）：${userAnswer}${confidenceInfo}`
      : `Part ${part || 1} Speaking question: ${question}\n\nCandidate's answer (speech-to-text): ${userAnswer}${confidenceInfo}`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    const normalized = normalizeSpeakingResult(parsed)
    incrementCalls(req.user.id)
    res.json({ ...normalized, quota: req.quota })
  } catch (err) {
    console.error('AI speaking error:', err.message)
    res.status(500).json({ error: 'AI 评分失败，请稍后重试' })
  }
})

// 写作批改
router.post('/writing', checkQuota, async (req, res) => {
  try {
    const { task, essay, taskType, lang } = req.body
    if (!task || !essay) {
      return res.status(400).json({ error: '缺少题目或作文内容' })
    }
    if (essay.length > 5000) {
      return res.status(400).json({ error: '作文内容过长，最多 5000 字符' })
    }

    const isZh = lang !== 'en'
    const systemPrompt = isZh
      ? `你是一位雅思考官。请对考生的雅思写作给出评分方向和改进建议。
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
  "actionPlan": ["行动建议1", "行动建议2"],
  "weakestArea": "Coherence",
  "nextAction": "重写主体段第一段，确保 topic sentence、解释和例子形成一条线",
  "suggestedPractice": {"module": "writing", "taskType": ${taskType || 2}, "task": "只重写一个主体段，重点改善逻辑衔接"},
  "rewriteMission": {
    "target": "body paragraph 1",
    "instruction": "重写一个主体段，保留原观点，但补清楚解释链和具体例子",
    "checklist": ["首句明确观点", "解释为什么成立", "加入具体例子", "段内连接自然"]
  },
  "reviewItems": [
    {"type": "expression", "text": "This is largely because...", "reason": "用于解释原因"},
    {"type": "weakness", "text": "主体段解释链不完整", "reason": "影响 Coherence and Cohesion"}
  ]
}`
      : `You are an IELTS examiner. Please evaluate the candidate's IELTS essay and provide scoring directions and improvement suggestions.
Scoring dimensions: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
Score each dimension on a band scale (1-9), identify main issues, and provide improvement directions.
Note: Focus on directional guidance rather than line-by-line corrections, helping the candidate understand their weak areas.
Reply in JSON format only, no other content:
{
  "taskResponse": {"score": 6, "comment": "...", "direction": "improvement direction"},
  "coherence": {"score": 6, "comment": "...", "direction": "improvement direction"},
  "lexical": {"score": 5, "comment": "...", "direction": "improvement direction"},
  "grammar": {"score": 6, "comment": "...", "direction": "improvement direction"},
  "overall": 6,
  "strengths": ["strength1"],
  "weaknesses": ["issue1", "issue2"],
  "actionPlan": ["action1", "action2"],
  "weakestArea": "Coherence",
  "nextAction": "Rewrite the first body paragraph with a clearer topic sentence, explanation chain, and concrete example.",
  "suggestedPractice": {"module": "writing", "taskType": ${taskType || 2}, "task": "Rewrite one body paragraph and focus on logical progression"},
  "rewriteMission": {
    "target": "body paragraph 1",
    "instruction": "Rewrite one body paragraph while keeping the same idea but improving explanation and examples.",
    "checklist": ["Clear topic sentence", "Explain why the idea is valid", "Add a concrete example", "Use natural linking"]
  },
  "reviewItems": [
    {"type": "expression", "text": "This is largely because...", "reason": "Useful for explaining causes"},
    {"type": "weakness", "text": "Body paragraph explanation is underdeveloped", "reason": "Limits Coherence and Cohesion"}
  ]
}`

    const userPrompt = isZh
      ? `${taskType === 1 ? 'Task 1' : 'Task 2'} 题目：${task}\n\n考生作文：\n${essay}`
      : `${taskType === 1 ? 'Task 1' : 'Task 2'} Question: ${task}\n\nCandidate's essay:\n${essay}`

    const result = await callDeepSeek(systemPrompt, userPrompt)
    const parsed = parseJSON(result)
    const normalized = normalizeWritingResult(parsed)
    incrementCalls(req.user.id)
    res.json({ ...normalized, quota: req.quota })
  } catch (err) {
    console.error('AI writing error:', err.message)
    res.status(500).json({ error: 'AI 批改失败，请稍后重试' })
  }
})

// 词汇生成
router.post('/vocab', checkQuota, async (req, res) => {
  try {
    const { topic, level, lang } = req.body
    if (!topic) {
      return res.status(400).json({ error: '请提供话题名称' })
    }

    const isZh = lang !== 'en'
    const systemPrompt = isZh
      ? `你是一位雅思词汇专家。请为指定话题生成雅思高频词汇。
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
      : `You are an IELTS vocabulary expert. Generate high-frequency IELTS vocabulary for the given topic.
Each word should include: word, phonetic, meaning (in English), example sentence (commonly used in IELTS writing/speaking), common collocations, and applicable band level.
Generate 10 words, ordered by increasing difficulty.
Reply in JSON format only, no other content:
{
  "words": [
    {
      "word": "example",
      "phonetic": "/ɪɡˈzɑːmpəl/",
      "meaning": "a thing characteristic of its kind",
      "example": "For example, ...",
      "collocations": ["give an example", "set an example"],
      "band": 6
    }
  ]
}`

    const userPrompt = isZh
      ? `话题：${topic}，目标 band：${level || '6-7'}`
      : `Topic: ${topic}, target band: ${level || '6-7'}`

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
    const { topic, section, lang } = req.body
    if (!topic) {
      return res.status(400).json({ error: '请提供话题名称' })
    }

    const isZh = lang !== 'en'
    const systemPrompt = isZh
      ? `你是一位雅思听力专家。请为指定话题生成一段雅思听力练习材料。
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
      : `You are an IELTS listening expert. Generate an IELTS listening practice material for the given topic.
Include:
1. A listening transcript (dialogue or monologue, 150-250 words)
2. 5 comprehension questions (multiple choice or fill in the blank)
Reply in JSON format only, no other content:
{
  "transcript": "English listening transcript",
  "questions": [
    {
      "question": "Question description",
      "type": "choice",
      "options": ["A. ...", "B. ...", "C. ..."],
      "answer": "A"
    }
  ]
}`

    const userPrompt = isZh
      ? `话题：${topic}，Section ${section || 1} 难度`
      : `Topic: ${topic}, Section ${section || 1} difficulty`

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
