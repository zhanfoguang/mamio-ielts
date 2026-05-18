<script setup>
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'
import { useCheckinStore } from '../stores/checkin'
import { useRouter } from 'vue-router'
import { getDashboardData } from '../services/progress'
import { getReviewItemStats, getReviewItemStatsSync, migrateLocalToServer } from '../services/reviewItems'
import { toLocalDateKey } from '../utils/date'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const checkinStore = useCheckinStore()
const router = useRouter()

const weekDays = computed(() => checkinStore.getWeekDays())

// Load all history
const speakingHistory = ref([])
const writingHistory = ref([])
const listeningHistory = ref([])
const readingHistory = ref([])

// Practice stats for today
const today = toLocalDateKey()
const dailyGoal = 10

const todayStats = computed(() => {
  const speaking = speakingHistory.value.filter(h => h.date?.startsWith(today)).length
  const writing = writingHistory.value.filter(h => h.date?.startsWith(today)).length
  const listening = listeningHistory.value.filter(h => h.date?.startsWith(today)).length
  const reading = readingHistory.value.filter(h => h.date?.startsWith(today)).length
  // Vocab: count today's SRS reviews
  const vocabDaily = JSON.parse(localStorage.getItem('mamio-vocab-daily') || '{}')
  const vocab = vocabDaily[today] || 0
  return { speaking, writing, listening, reading, vocab, total: speaking + writing + listening + reading + vocab }
})

const vocabReviewStats = computed(() => {
  const srsData = JSON.parse(localStorage.getItem('mamio-vocab-srs') || '{}')
  const now = Date.now()
  const rows = Object.values(srsData)
  const due = rows.filter(item => Number(item?.due || 0) <= now).length
  return { total: rows.length, due }
})

const reviewItemCacheVersion = ref(0)
const reviewItemStats = computed(() => {
  reviewItemCacheVersion.value
  return getReviewItemStatsSync()
})
const dueReviewItemsPreview = computed(() => reviewItemStats.value.dueItems.slice(0, 3))

const totalPracticeCount = computed(() => (
  speakingHistory.value.length +
  writingHistory.value.length +
  listeningHistory.value.length +
  readingHistory.value.length
))

const onboardingChecklist = computed(() => [
  {
    key: 'goal',
    done: targetScore.value > 0 || !!examDate.value,
    titleZh: '设置目标分或考试日期',
    titleEn: 'Set target score or exam date',
    detailZh: targetScore.value > 0 ? `目标 Band ${targetScore.value}` : '让学习计划知道你的冲刺方向',
    detailEn: targetScore.value > 0 ? `Target Band ${targetScore.value}` : 'Give the plan a clear direction',
    actionZh: '设置目标',
    actionEn: 'Set Goal',
    action: () => { showGoalSettings.value = true }
  },
  {
    key: 'first-practice',
    done: totalPracticeCount.value > 0,
    titleZh: '完成第一次有效练习',
    titleEn: 'Complete the first practice',
    detailZh: totalPracticeCount.value > 0 ? `已完成 ${totalPracticeCount.value} 次练习` : '建议从口语 Part 1 或阅读限时开始',
    detailEn: totalPracticeCount.value > 0 ? `${totalPracticeCount.value} practice session(s) done` : 'Start with Speaking Part 1 or timed Reading',
    actionZh: '开始口语',
    actionEn: 'Start Speaking',
    action: () => router.push('/speaking')
  },
  {
    key: 'review',
    done: reviewItemStats.value.total > 0 || vocabReviewStats.value.total > 0,
    titleZh: '建立复习材料',
    titleEn: 'Build review material',
    detailZh: reviewItemStats.value.total > 0 ? `已有 ${reviewItemStats.value.total} 个弱点项` : '错题和 AI 反馈会进入复习中心',
    detailEn: reviewItemStats.value.total > 0 ? `${reviewItemStats.value.total} weak spot(s) saved` : 'Mistakes and AI feedback flow into Review',
    actionZh: '去复习中心',
    actionEn: 'Open Review',
    action: () => router.push(reviewItemStats.value.total > 0 ? '/review' : '/vocabulary')
  }
])

const shouldShowStartChecklist = computed(() => onboardingChecklist.value.some(item => !item.done))

// Score trends (last 10 entries per module)
const speakingScores = computed(() => {
  return speakingHistory.value
    .filter(h => h.score)
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({ index: i + 1, score: h.score, date: h.date }))
})

const writingScores = computed(() => {
  return writingHistory.value
    .filter(h => h.score)
    .slice(0, 10)
    .reverse()
    .map((h, i) => ({ index: i + 1, score: h.score, date: h.date }))
})

// Target score and exam date
const targetScore = ref(parseFloat(localStorage.getItem('mamio-target-score') || '0'))
const examDate = ref(localStorage.getItem('mamio-exam-date') || '')
const showGoalSettings = ref(false)

function saveTargetScore() {
  localStorage.setItem('mamio-target-score', targetScore.value.toString())
}

function saveExamDate() {
  localStorage.setItem('mamio-exam-date', examDate.value)
}

const daysUntilExam = computed(() => {
  if (!examDate.value) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exam = new Date(examDate.value)
  const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
})

const targetGap = computed(() => {
  if (!targetScore.value) return null
  const avgSpk = avgSpeakingScore.value ? parseFloat(avgSpeakingScore.value) : null
  const avgWrt = avgWritingScore.value ? parseFloat(avgWritingScore.value) : null
  if (!avgSpk && !avgWrt) return null
  const bestAvg = Math.max(avgSpk || 0, avgWrt || 0)
  return {
    current: bestAvg.toFixed(1),
    target: targetScore.value,
    gap: (targetScore.value - bestAvg).toFixed(1),
    close: targetScore.value - bestAvg <= 0.5
  }
})

const avgSpeakingScore = computed(() => {
  const scores = speakingHistory.value.filter(h => h.score).map(h => h.score)
  if (scores.length === 0) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

const avgWritingScore = computed(() => {
  const scores = writingHistory.value.filter(h => h.score).map(h => h.score)
  if (scores.length === 0) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})

const avgReadingScore = computed(() => {
  const scores = readingHistory.value.filter(h => typeof h.score === 'number').map(h => h.score)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
})

const avgListeningScore = computed(() => {
  const scores = listeningHistory.value.filter(h => typeof h.score === 'number').map(h => h.score)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
})

const recentInputAttempts = computed(() => {
  const reading = readingHistory.value.map(item => ({
    ...item,
    module: 'reading',
    icon: '📖',
    title: item.passage,
    path: '/reading',
    scoreLabel: typeof item.score === 'number' ? `${item.score}%` : '-',
    issueZh: item.details?.report?.recommendation || (item.score < 70 ? '正确率偏低，建议重做同类题型。' : '保持输入训练节奏。'),
    issueEn: item.details?.report?.recommendation || (item.score < 70 ? 'Accuracy is low. Redo the same question type.' : 'Keep input practice steady.')
  }))
  const listening = listeningHistory.value.map(item => ({
    ...item,
    module: 'listening',
    icon: '🎧',
    title: item.section,
    path: '/listening',
    scoreLabel: typeof item.score === 'number' ? `${item.score}%` : (item.mode === 'dictation' ? 'Dictation' : '-'),
    issueZh: item.details?.report?.recommendation || (item.mode === 'dictation' ? '复听这句，检查漏听词。' : '先复盘错词，再做下一套。'),
    issueEn: item.details?.report?.recommendation || (item.mode === 'dictation' ? 'Replay this sentence and check missed words.' : 'Review missed words before the next set.')
  }))
  return [...reading, ...listening]
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
})

const inputRecoveryPlan = computed(() => {
  const weak = recentInputAttempts.value.find(item => typeof item.score === 'number' && item.score < 70)
  const dictation = recentInputAttempts.value.find(item => item.module === 'listening' && item.mode === 'dictation')
  return weak || dictation || recentInputAttempts.value[0] || null
})

function getLatestPracticeDate() {
  const dates = [
    ...speakingHistory.value,
    ...writingHistory.value,
    ...listeningHistory.value,
    ...readingHistory.value
  ].map(item => item.date).filter(Boolean)
  if (!dates.length) return null
  return dates.sort((a, b) => new Date(b) - new Date(a))[0]
}

const daysSincePractice = computed(() => {
  const latest = getLatestPracticeDate()
  if (!latest) return null
  const last = new Date(latest)
  const now = new Date()
  last.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now - last) / (1000 * 60 * 60 * 24)))
})

function getScoreField(details, keys) {
  for (const key of keys) {
    const value = details?.[key]
    if (typeof value === 'number') return value
    if (typeof value?.score === 'number') return value.score
  }
  return null
}

function inferWeakestFromDetails(details, module) {
  if (!details) return null
  if (details.weakestArea) {
    return {
      module,
      area: details.weakestArea,
      nextAction: details.nextAction,
      reviewItems: details.reviewItems || [],
      source: 'ai'
    }
  }

  const candidates = module === 'speaking'
    ? [
      ['fluency', 'Fluency'],
      ['lexical', 'Lexical Resource'],
      ['grammar', 'Grammar'],
      ['pronunciation', 'Pronunciation']
    ]
    : [
      ['taskResponse', 'Task Response'],
      ['coherence', 'Coherence'],
      ['lexical', 'Lexical Resource'],
      ['grammar', 'Grammar']
    ]

  const scored = candidates
    .map(([key, label]) => ({ key, label, score: getScoreField(details, [key]) }))
    .filter(item => typeof item.score === 'number')
    .sort((a, b) => a.score - b.score)

  if (!scored.length) return null
  const weakest = scored[0]
  return {
    module,
    area: weakest.label,
    score: weakest.score,
    nextAction: Array.isArray(details.actionPlan) ? details.actionPlan[0] : details.suggestions?.[0],
    reviewItems: details.reviewItems || [],
    source: 'rubric'
  }
}

const aiWeaknessSummary = computed(() => {
  const recentSpeaking = speakingHistory.value
    .slice(0, 8)
    .map(item => inferWeakestFromDetails(item.details, 'speaking'))
    .filter(Boolean)
  const recentWriting = writingHistory.value
    .slice(0, 8)
    .map(item => inferWeakestFromDetails(item.details, 'writing'))
    .filter(Boolean)
  const all = [...recentSpeaking, ...recentWriting]
  if (!all.length) return null

  const counts = all.reduce((acc, item) => {
    const key = `${item.module}:${item.area}`
    acc[key] = acc[key] || { ...item, count: 0 }
    acc[key].count += 1
    if (!acc[key].nextAction && item.nextAction) acc[key].nextAction = item.nextAction
    return acc
  }, {})

  return Object.values(counts).sort((a, b) => b.count - a.count)[0]
})

// Heatmap data (last 28 days = 4 weeks)
const heatmapDays = computed(() => {
  const days = []
  const todayDate = new Date()
  for (let i = 27; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - i)
    const dateStr = toLocalDateKey(d)
    const speakingCount = speakingHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const writingCount = writingHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const listeningCount = listeningHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const readingCount = readingHistory.value.filter(h => h.date?.startsWith(dateStr)).length
    const total = speakingCount + writingCount + listeningCount + readingCount
    days.push({
      date: dateStr,
      day: d.getDate(),
      count: total,
      level: total === 0 ? 0 : total <= 2 ? 1 : total <= 5 ? 2 : total <= 8 ? 3 : 4
    })
  }
  return days
})

function buildPlanTask({ icon, zh, en, path, reasonZh, reasonEn, tone = 'neutral' }) {
  return { icon, zh, en, path, reasonZh, reasonEn, tone }
}

// Study plan
const studyPlan = computed(() => {
  const speakingCount = speakingHistory.value.length
  const writingCount = writingHistory.value.length
  const listeningCount = listeningHistory.value.length
  const readingCount = readingHistory.value.length
  const vocab = JSON.parse(localStorage.getItem('mamio-progress') || '{}').vocabulary?.learned || 0
  const dueVocab = vocabReviewStats.value.due
  const dueReviewItems = reviewItemStats.value.due

  const totalPractice = speakingCount + writingCount + listeningCount + readingCount
  if (totalPractice === 0) {
    return {
      primary: buildPlanTask({
        icon: '🎤',
        zh: '完成 1 次口语 Part 1',
        en: 'Complete one Speaking Part 1 practice',
        path: '/speaking',
        reasonZh: '先用短回答建立第一次 AI 反馈样本',
        reasonEn: 'Start with short answers to create your first AI feedback sample',
        tone: 'blue'
      }),
      review: buildPlanTask({
        icon: '📚',
        zh: '学习 10 个 IELTS 高频词',
        en: 'Learn 10 high-frequency IELTS words',
        path: '/vocabulary',
        reasonZh: '词汇库还没有建立，先补底层材料',
        reasonEn: 'Build the vocabulary base before heavier practice'
      }),
      insight: {
        icon: '🎯',
        zh: '先跑出第一次有效反馈，不需要一开始就完整。',
        en: 'Get the first useful feedback loop before trying to be complete.'
      },
      tasks: [
        buildPlanTask({ icon: '🎤', zh: '口语 Part 1', en: 'Speaking Part 1', path: '/speaking' }),
        buildPlanTask({ icon: '📚', zh: '词汇闪卡', en: 'Vocabulary cards', path: '/vocabulary' }),
        buildPlanTask({ icon: '✍️', zh: '看 1 篇范文', en: 'Read one model essay', path: '/writing' })
      ]
    }
  }

  const avgSpk = avgSpeakingScore.value ? parseFloat(avgSpeakingScore.value) : 0
  const avgWrt = avgWritingScore.value ? parseFloat(avgWritingScore.value) : 0
  const practicedToday = todayStats.value.total > 0
  const hasTarget = targetScore.value > 0
  const isExamSoon = daysUntilExam.value !== null && daysUntilExam.value <= 14

  let primary
  let insight

  // Target-aware priority: if exam is soon, push harder
  if (hasTarget && isExamSoon && !practicedToday) {
    const gapSpk = targetScore.value - avgSpk
    const gapWrt = targetScore.value - avgWrt
    if (gapWrt > gapSpk && avgWrt > 0) {
      primary = buildPlanTask({
        icon: '✍️',
        zh: `考前冲刺：写作还差 ${gapWrt.toFixed(1)} 分`,
        en: `Exam push: writing gap is ${gapWrt.toFixed(1)}`,
        path: '/writing',
        reasonZh: `距考试 ${daysUntilExam.value} 天，写作离目标最远`,
        reasonEn: `${daysUntilExam.value} days to exam, writing is furthest from target`,
        tone: 'amber'
      })
    } else if (avgSpk > 0) {
      primary = buildPlanTask({
        icon: '🎤',
        zh: `考前冲刺：口语还差 ${gapSpk.toFixed(1)} 分`,
        en: `Exam push: speaking gap is ${gapSpk.toFixed(1)}`,
        path: '/speaking',
        reasonZh: `距考试 ${daysUntilExam.value} 天，口语离目标最远`,
        reasonEn: `${daysUntilExam.value} days to exam, speaking is furthest from target`,
        tone: 'amber'
      })
    }
  }

  if (!primary && !practicedToday && dueReviewItems > 0) {
    primary = buildPlanTask({
      icon: '🎯',
      zh: `先处理 ${Math.min(dueReviewItems, 5)} 个 AI 复习项`,
      en: `Clear ${Math.min(dueReviewItems, 5)} AI review items first`,
      path: '/review',
      reasonZh: '这些是从你自己的口语/写作反馈里提取的弱点',
      reasonEn: 'These came from your own speaking and writing feedback',
      tone: 'amber'
    })
  } else if (!practicedToday && dueVocab >= 10) {
    primary = buildPlanTask({
      icon: '📚',
      zh: `先复习 ${Math.min(dueVocab, 20)} 个到期词`,
      en: `Review ${Math.min(dueVocab, 20)} due words first`,
      path: '/vocabulary',
      reasonZh: '到期复习不处理，词汇会越积越多',
      reasonEn: 'Due reviews compound quickly if ignored',
      tone: 'purple'
    })
  } else if (avgWrt > 0 && avgWrt < 6) {
    primary = buildPlanTask({
      icon: '✍️',
      zh: '完成 1 篇 Writing Task 2',
      en: 'Complete one Writing Task 2 essay',
      path: '/writing',
      reasonZh: `写作平均 ${avgWrt}，先补最影响总分的输出项`,
      reasonEn: `Writing average is ${avgWrt}; prioritize the output skill`,
      tone: 'green'
    })
  } else if (avgSpk > 0 && avgSpk < 6) {
    primary = buildPlanTask({
      icon: '🎤',
      zh: '练 1 轮口语 Part 2 长回答',
      en: 'Practice one Speaking Part 2 long turn',
      path: '/speaking',
      reasonZh: `口语平均 ${avgSpk}，需要更长回答样本`,
      reasonEn: `Speaking average is ${avgSpk}; collect a longer answer sample`,
      tone: 'blue'
    })
  } else if (writingCount < Math.max(1, Math.floor(speakingCount / 2))) {
    primary = buildPlanTask({
      icon: '✍️',
      zh: '补 1 次写作批改',
      en: 'Add one writing feedback session',
      path: '/writing',
      reasonZh: '写作练习明显少于口语，输出结构需要补样本',
      reasonEn: 'Writing practice is lagging behind speaking',
      tone: 'green'
    })
  } else if (listeningCount + readingCount < speakingCount + writingCount) {
    primary = buildPlanTask({
      icon: '🎧',
      zh: '做 1 次听力或阅读输入训练',
      en: 'Do one listening or reading input drill',
      path: listeningCount <= readingCount ? '/listening' : '/reading',
      reasonZh: '输入训练偏少，容易限制词汇和表达质量',
      reasonEn: 'Input practice is behind output practice',
      tone: 'amber'
    })
  } else if (avgReadingScore.value !== null && avgReadingScore.value < 70) {
    primary = buildPlanTask({
      icon: '📖',
      zh: '做 1 篇阅读限时练习',
      en: 'Complete one timed reading passage',
      path: '/reading',
      reasonZh: `阅读平均正确率 ${avgReadingScore.value}%，需要补定位和题型稳定性`,
      reasonEn: `Reading average is ${avgReadingScore.value}%; work on locating evidence and question-type stability`,
      tone: 'amber'
    })
  } else if (avgListeningScore.value !== null && avgListeningScore.value < 70) {
    primary = buildPlanTask({
      icon: '🎧',
      zh: '做 1 套听力填空',
      en: 'Complete one listening completion set',
      path: '/listening',
      reasonZh: `听力平均正确率 ${avgListeningScore.value}%，先补关键词捕捉`,
      reasonEn: `Listening average is ${avgListeningScore.value}%; focus on catching key words`,
      tone: 'blue'
    })
  } else if (vocab < 50) {
    primary = buildPlanTask({
      icon: '📚',
      zh: '学习 10 个话题词',
      en: 'Learn 10 topic words',
      path: '/vocabulary',
      reasonZh: '词汇基础还薄，先提高表达材料储备',
      reasonEn: 'Vocabulary base is still thin',
      tone: 'purple'
    })
  } else {
    primary = buildPlanTask({
      icon: '✨',
      zh: '做 1 次口语 AI 对话',
      en: 'Try one AI speaking conversation',
      path: '/speaking',
      reasonZh: '当前节奏不错，继续增加真实互动压力',
      reasonEn: 'Keep the rhythm and add real interaction pressure',
      tone: 'blue'
    })
  }

  if (hasTarget && daysUntilExam.value !== null && daysUntilExam.value <= 7) {
    const gapSpk = avgSpk > 0 ? targetScore.value - avgSpk : 0
    const gapWrt = avgWrt > 0 ? targetScore.value - avgWrt : 0
    const maxGap = Math.max(gapSpk, gapWrt)
    insight = {
      icon: '🔥',
      zh: `还有 ${daysUntilExam.value} 天考试！${maxGap > 0.5 ? `还差 ${maxGap.toFixed(1)} 分，每天至少练 2 轮` : '差距不大，保持手感'}`,
      en: `${daysUntilExam.value} days to exam! ${maxGap > 0.5 ? `Gap is ${maxGap.toFixed(1)}, practice at least 2 rounds daily` : 'Gap is small, maintain your rhythm'}`
    }
  } else if (hasTarget && targetGap.value && !targetGap.value.close) {
    insight = {
      icon: '🎯',
      zh: `目标 Band ${targetScore.value}，当前 ${targetGap.value.current}，还差 ${targetGap.value.gap} 分。`,
      en: `Target Band ${targetScore.value}, currently ${targetGap.value.current}, gap is ${targetGap.value.gap}.`
    }
  } else if (aiWeaknessSummary.value?.nextAction) {
    const weak = aiWeaknessSummary.value
    insight = {
      icon: weak.module === 'writing' ? '✍️' : '🎤',
      zh: `${weak.module === 'writing' ? '写作' : '口语'}最近反复卡在 ${weak.area}。下一步：${weak.nextAction}`,
      en: `${weak.module === 'writing' ? 'Writing' : 'Speaking'} is repeatedly weak in ${weak.area}. Next: ${weak.nextAction}`
    }
  } else if (avgWrt > 0 && avgWrt < 6) {
    insight = {
      icon: '✍️',
      zh: `写作是当前弱项，平均 Band ${avgWrt}。重点看任务回应、结构和论证深度。`,
      en: `Writing is the current weak area at Band ${avgWrt}. Focus on response, structure, and argument depth.`
    }
  } else if (avgSpk > 0 && avgSpk < 6) {
    insight = {
      icon: '🎤',
      zh: `口语是当前弱项，平均 Band ${avgSpk}。优先练延展回答和连贯表达。`,
      en: `Speaking is the current weak area at Band ${avgSpk}. Prioritize extended and coherent answers.`
    }
  } else if (dueReviewItems > 0) {
    insight = {
      icon: '🎯',
      zh: `有 ${dueReviewItems} 个 AI 复习项待处理，优先复练自己的真实弱点。`,
      en: `${dueReviewItems} AI review items are due. Prioritize your real weak spots.`
    }
  } else if (dueVocab > 0) {
    insight = {
      icon: '📚',
      zh: `有 ${dueVocab} 个词到期复习，先处理它们能稳住长期记忆。`,
      en: `${dueVocab} words are due. Clear them first to protect long-term memory.`
    }
  } else {
    insight = {
      icon: '📈',
      zh: '当前没有明显低分项，重点保持连续练习并扩大样本量。',
      en: 'No obvious low-score area yet. Keep the streak and collect more samples.'
    }
  }

  const review = dueReviewItems > 0
    ? buildPlanTask({
      icon: '🎯',
      zh: `复练 ${Math.min(dueReviewItems, 5)} 个 AI 弱点`,
      en: `Review ${Math.min(dueReviewItems, 5)} AI weak spots`,
      path: '/review',
      reasonZh: '来自最近口语/写作反馈',
      reasonEn: 'From recent speaking and writing feedback'
    })
    : dueVocab > 0
    ? buildPlanTask({
      icon: '📚',
      zh: `复习 ${Math.min(dueVocab, 20)} 个到期词`,
      en: `Review ${Math.min(dueVocab, 20)} due words`,
      path: '/vocabulary',
      reasonZh: '先清到期词，再做新练习',
      reasonEn: 'Clear due words before new practice'
    })
    : buildPlanTask({
      icon: '📚',
      zh: '补充 10 个新词',
      en: 'Add 10 new words',
      path: '/vocabulary',
      reasonZh: '为写作和口语准备可复用表达',
      reasonEn: 'Prepare reusable language for writing and speaking'
    })

  const weakPath = aiWeaknessSummary.value?.module === 'writing' ? '/writing' : '/speaking'
  const weakLabelZh = aiWeaknessSummary.value
    ? `${aiWeaknessSummary.value.module === 'writing' ? '写作' : '口语'}弱点复练`
    : (writingCount <= speakingCount ? '写作批改' : '口语练习')
  const weakLabelEn = aiWeaknessSummary.value
    ? `${aiWeaknessSummary.value.module === 'writing' ? 'Writing' : 'Speaking'} weak-area drill`
    : (writingCount <= speakingCount ? 'Writing feedback' : 'Speaking practice')

  const tasks = [
    primary,
    review,
    buildPlanTask({
      icon: aiWeaknessSummary.value?.module === 'writing' || writingCount <= speakingCount ? '✍️' : '🎤',
      zh: weakLabelZh,
      en: weakLabelEn,
      path: aiWeaknessSummary.value ? weakPath : (writingCount <= speakingCount ? '/writing' : '/speaking')
    })
  ]

  const actionQueue = [
    {
      ...primary,
      labelZh: '先做',
      labelEn: 'Start',
      minutes: primary.path === '/writing' ? 35 : primary.path === '/reading' ? 20 : primary.path === '/listening' ? 15 : 10
    },
    {
      ...review,
      labelZh: '再清',
      labelEn: 'Then',
      minutes: review.path === '/vocabulary' ? 8 : 10
    },
    {
      icon: '✅',
      zh: '打卡并回看今日进度',
      en: 'Check in and review today',
      path: '/dashboard',
      reasonZh: '形成完成感，明天更容易接着练',
      reasonEn: 'Close the loop so tomorrow starts easier',
      labelZh: '收尾',
      labelEn: 'Finish',
      minutes: 2,
      tone: 'neutral'
    }
  ]

  return { primary, review, insight, tasks, actionQueue }
})

// Module stats
const moduleStats = computed(() => [
  {
    icon: '🎤',
    labelZh: '口语练习',
    labelEn: 'Speaking',
    count: speakingHistory.value.length,
    score: avgSpeakingScore.value,
    color: 'var(--blue)'
  },
  {
    icon: '✍️',
    labelZh: '写作练习',
    labelEn: 'Writing',
    count: writingHistory.value.length,
    score: avgWritingScore.value,
    color: 'var(--green)'
  },
  {
    icon: '🎧',
    labelZh: '听力练习',
    labelEn: 'Listening',
    count: listeningHistory.value.length,
    score: avgListeningScore.value,
    scoreSuffix: '%',
    color: 'var(--blue)'
  },
  {
    icon: '📖',
    labelZh: '阅读练习',
    labelEn: 'Reading',
    count: readingHistory.value.length,
    score: avgReadingScore.value,
    scoreSuffix: '%',
    color: 'var(--amber)'
  },
  {
    icon: '📚',
    labelZh: '词汇掌握',
    labelEn: 'Vocabulary',
    count: (JSON.parse(localStorage.getItem('mamio-progress') || '{}').vocabulary?.learned || 0),
    score: null,
    color: 'var(--purple)'
  }
])

// Onboarding
const showOnboarding = ref(false)

function closeOnboarding() {
  showOnboarding.value = false
  localStorage.setItem('mamio-onboarded', '1')
}

function openGoalFromOnboarding() {
  closeOnboarding()
  showGoalSettings.value = true
}

function startSpeakingFromOnboarding() {
  closeOnboarding()
  router.push('/speaking')
}

// Score chart (simple SVG sparkline)
function getSparklinePath(scores) {
  if (scores.length < 2) return ''
  const width = 200
  const height = 40
  const maxScore = 9
  const step = width / (scores.length - 1)
  return scores.map((s, i) => {
    const x = i * step
    const y = height - ((s.score / maxScore) * height)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow, var(--amber))'
  return 'var(--red)'
}

function getPercentScoreColor(score) {
  if (score >= 80) return 'var(--green)'
  if (score >= 60) return 'var(--yellow, var(--amber))'
  return 'var(--red)'
}

async function refreshReviewItems() {
  await getReviewItemStats()
  reviewItemCacheVersion.value += 1
}

onMounted(async () => {
  // Try loading from API first
  try {
    const data = await getDashboardData()
    speakingHistory.value = data.speaking || []
    writingHistory.value = data.writing || []
    readingHistory.value = data.reading?.length ? data.reading : JSON.parse(localStorage.getItem('mamio-reading-history') || '[]')
    listeningHistory.value = data.listening?.length ? data.listening : JSON.parse(localStorage.getItem('mamio-listening-history') || '[]')
    // Cache to localStorage
    localStorage.setItem('mamio-speaking-history', JSON.stringify(speakingHistory.value))
    localStorage.setItem('mamio-writing-history', JSON.stringify(writingHistory.value))
    localStorage.setItem('mamio-reading-history', JSON.stringify(readingHistory.value))
    localStorage.setItem('mamio-listening-history', JSON.stringify(listeningHistory.value))
  } catch {
    // API failed, load from localStorage
    speakingHistory.value = JSON.parse(localStorage.getItem('mamio-speaking-history') || '[]')
    writingHistory.value = JSON.parse(localStorage.getItem('mamio-writing-history') || '[]')
    readingHistory.value = JSON.parse(localStorage.getItem('mamio-reading-history') || '[]')
    listeningHistory.value = JSON.parse(localStorage.getItem('mamio-listening-history') || '[]')
  }

  // Show onboarding for first-time users
  if (!localStorage.getItem('mamio-onboarded')) {
    showOnboarding.value = true
  }

  // Migrate localStorage review items to server
  try {
    await migrateLocalToServer()
  } catch {
    // Keep local cache if migration is unavailable.
  }

  refreshReviewItems().catch(() => {
    reviewItemCacheVersion.value += 1
  })
})
</script>

<template>
  <div class="dashboard-page">
    <!-- Onboarding modal -->
    <div v-if="showOnboarding" class="onboarding-overlay" @click.self="closeOnboarding">
      <div class="onboarding-card">
        <h2>{{ themeStore.lang === 'zh' ? '欢迎使用 Mamio IELTS!' : 'Welcome to Mamio IELTS!' }}</h2>
        <p class="onboarding-desc">{{ themeStore.lang === 'zh' ? '你的 AI 雅思备考助手，帮你高效提分' : 'Your AI-powered IELTS prep assistant' }}</p>
        <div class="onboarding-steps">
          <div class="ob-step">
            <span class="ob-icon">🎤</span>
            <div>
              <strong>{{ themeStore.lang === 'zh' ? '口语练习' : 'Speaking' }}</strong>
              <p>{{ themeStore.lang === 'zh' ? 'AI 实时评分 + 对话模拟' : 'AI scoring + conversation simulation' }}</p>
            </div>
          </div>
          <div class="ob-step">
            <span class="ob-icon">✍️</span>
            <div>
              <strong>{{ themeStore.lang === 'zh' ? '写作批改' : 'Writing' }}</strong>
              <p>{{ themeStore.lang === 'zh' ? 'AI 方向性指导 + 范文对比' : 'AI feedback + essay comparison' }}</p>
            </div>
          </div>
          <div class="ob-step">
            <span class="ob-icon">🎧</span>
            <div>
              <strong>{{ themeStore.lang === 'zh' ? '听力训练' : 'Listening' }}</strong>
              <p>{{ themeStore.lang === 'zh' ? '跟读练习 + 逐句对比' : 'Dictation practice + word comparison' }}</p>
            </div>
          </div>
          <div class="ob-step">
            <span class="ob-icon">📖</span>
            <div>
              <strong>{{ themeStore.lang === 'zh' ? '阅读理解' : 'Reading' }}</strong>
              <p>{{ themeStore.lang === 'zh' ? '限时练习 + 详细解析' : 'Timed practice + detailed analysis' }}</p>
            </div>
          </div>
          <div class="ob-step">
            <span class="ob-icon">📚</span>
            <div>
              <strong>{{ themeStore.lang === 'zh' ? '词汇记忆' : 'Vocabulary' }}</strong>
              <p>{{ themeStore.lang === 'zh' ? '间隔重复 + 每日新词' : 'Spaced repetition + daily words' }}</p>
            </div>
          </div>
        </div>
        <div class="onboarding-actions">
          <button class="onboarding-btn" @click="openGoalFromOnboarding">
            {{ themeStore.lang === 'zh' ? '先设置目标' : 'Set Goal First' }}
          </button>
          <button class="onboarding-secondary" @click="startSpeakingFromOnboarding">
            {{ themeStore.lang === 'zh' ? '直接做口语' : 'Start Speaking' }}
          </button>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- Header -->
      <div class="dashboard-header">
        <div>
          <h1>{{ themeStore.lang === 'zh' ? '学习中心' : 'Dashboard' }}</h1>
          <p class="welcome">
            {{ authStore.user?.nickname
              ? (themeStore.lang === 'zh' ? `${authStore.user.nickname}，继续你的学习之旅` : `${authStore.user.nickname}, continue your journey`)
              : (themeStore.lang === 'zh' ? '继续你的学习之旅' : 'Continue your learning journey')
            }}
          </p>
        </div>
        <button class="goal-btn" @click="showGoalSettings = !showGoalSettings">
          {{ targetScore > 0 ? (themeStore.lang === 'zh' ? '目标: ' + targetScore + ' 分' : 'Target: ' + targetScore) : (themeStore.lang === 'zh' ? '设置目标' : 'Set Goal') }}
        </button>
      </div>

      <!-- Goal settings -->
      <div v-if="showGoalSettings" class="goal-settings">
        <div class="goal-row">
          <label>{{ themeStore.lang === 'zh' ? '目标 Band 分' : 'Target Band Score' }}</label>
          <select v-model.number="targetScore" @change="saveTargetScore" class="goal-select">
            <option :value="0">{{ themeStore.lang === 'zh' ? '未设置' : 'Not set' }}</option>
            <option v-for="s in [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="goal-row">
          <label>{{ themeStore.lang === 'zh' ? '考试日期' : 'Exam Date' }}</label>
          <input type="date" v-model="examDate" @change="saveExamDate" class="goal-input" />
        </div>
        <div v-if="daysUntilExam !== null" class="goal-countdown">
          <span class="countdown-num">{{ daysUntilExam }}</span>
          <span class="countdown-label">{{ themeStore.lang === 'zh' ? '天后考试' : 'days until exam' }}</span>
        </div>
        <div v-if="targetGap" class="goal-gap">
          <span :class="targetGap.close ? 'gap-ok' : 'gap-warn'">
            {{ themeStore.lang === 'zh'
              ? `当前 ${targetGap.current}，目标 ${targetGap.target}，差 ${targetGap.gap} 分`
              : `Current ${targetGap.current}, Target ${targetGap.target}, Gap ${targetGap.gap}`
            }}
          </span>
        </div>
      </div>

      <!-- Trial status banner -->
      <div v-if="authStore.isTrial" class="trial-banner">
        <div class="trial-info">
          <span class="trial-icon">⏳</span>
          <div>
            <strong>{{ themeStore.lang === 'zh' ? `试用剩余 ${authStore.trialDaysLeft} 天` : `${authStore.trialDaysLeft} days left in trial` }}</strong>
            <p>{{ themeStore.lang === 'zh' ? '激活码升级可解锁无限使用' : 'Activate with a code to unlock unlimited access' }}</p>
          </div>
        </div>
        <button class="trial-btn" @click="router.push('/login?mode=activate')">
          {{ themeStore.lang === 'zh' ? '激活' : 'Activate' }}
        </button>
      </div>
      <div v-else-if="authStore.isExpired" class="trial-banner expired">
        <div class="trial-info">
          <span class="trial-icon">🔒</span>
          <div>
            <strong>{{ themeStore.lang === 'zh' ? '试用已过期' : 'Trial Expired' }}</strong>
            <p>{{ themeStore.lang === 'zh' ? '请使用激活码解锁完整功能' : 'Use an activation code to unlock full access' }}</p>
          </div>
        </div>
        <button class="trial-btn" @click="router.push('/login?mode=activate')">
          {{ themeStore.lang === 'zh' ? '激活' : 'Activate' }}
        </button>
      </div>

      <div v-if="daysSincePractice !== null && daysSincePractice >= 2 && todayStats.total === 0" class="return-banner">
        <div>
          <strong>{{ themeStore.lang === 'zh' ? `${daysSincePractice} 天没练了，今天先做一小步` : `${daysSincePractice} days away. Restart with one small step.` }}</strong>
          <p>{{ themeStore.lang === 'zh' ? '不用补完全部计划，先完成主任务就算恢复节奏。' : 'No need to catch up everything. Complete the primary task and rebuild momentum.' }}</p>
        </div>
        <button @click="router.push(studyPlan.primary.path)">
          {{ themeStore.lang === 'zh' ? '恢复练习' : 'Resume' }}
        </button>
      </div>

      <!-- Start checklist -->
      <div v-if="shouldShowStartChecklist" class="start-checklist">
        <div class="start-checklist-head">
          <div>
            <span class="plan-kicker">{{ themeStore.lang === 'zh' ? '新手启动' : 'Getting Started' }}</span>
            <h2>{{ themeStore.lang === 'zh' ? '先把学习闭环搭起来' : 'Build the learning loop first' }}</h2>
          </div>
          <span class="plan-status">{{ onboardingChecklist.filter(item => item.done).length }}/{{ onboardingChecklist.length }}</span>
        </div>
        <div class="start-steps">
          <button
            v-for="item in onboardingChecklist"
            :key="item.key"
            class="start-step"
            :class="{ done: item.done }"
            @click="item.action"
          >
            <span class="start-dot">{{ item.done ? '✓' : '' }}</span>
            <span class="start-step-copy">
              <strong>{{ themeStore.lang === 'zh' ? item.titleZh : item.titleEn }}</strong>
              <small>{{ themeStore.lang === 'zh' ? item.detailZh : item.detailEn }}</small>
            </span>
            <span class="start-action">{{ item.done ? (themeStore.lang === 'zh' ? '已完成' : 'Done') : (themeStore.lang === 'zh' ? item.actionZh : item.actionEn) }}</span>
          </button>
        </div>
      </div>

      <!-- Today's progress -->
      <div class="today-card">
        <div class="today-header">
          <div>
            <h3>{{ themeStore.lang === 'zh' ? '今日进度' : "Today's Progress" }}</h3>
            <p class="today-sub">{{ themeStore.lang === 'zh' ? `目标 ${dailyGoal} 次练习` : `Goal: ${dailyGoal} practices` }}</p>
          </div>
          <div class="today-count">
            <span class="today-num">{{ todayStats.total }}</span>
            <span class="today-label">/ {{ dailyGoal }}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: Math.min(100, (todayStats.total / dailyGoal) * 100) + '%' }"></div>
        </div>
        <div class="today-breakdown">
          <span class="breakdown-item">🎤 {{ todayStats.speaking }}</span>
          <span class="breakdown-item">✍️ {{ todayStats.writing }}</span>
          <span class="breakdown-item">🎧 {{ todayStats.listening }}</span>
          <span class="breakdown-item">📖 {{ todayStats.reading }}</span>
          <span class="breakdown-item">📚 {{ todayStats.vocab }}</span>
        </div>
      </div>

      <!-- Study Plan -->
      <div class="study-plan-card">
        <div class="study-plan-header">
          <div>
            <span class="plan-kicker">{{ themeStore.lang === 'zh' ? '今日学习计划' : "Today's Study Plan" }}</span>
            <h2>{{ themeStore.lang === 'zh' ? '先抓最该推进的一步' : 'Start with the highest-leverage step' }}</h2>
          </div>
          <span class="plan-status">{{ todayStats.total }}/{{ dailyGoal }}</span>
        </div>

        <button class="primary-plan" :class="'tone-' + studyPlan.primary.tone" @click="router.push(studyPlan.primary.path)">
          <span class="primary-icon">{{ studyPlan.primary.icon }}</span>
          <span class="primary-body">
            <span class="primary-label">{{ themeStore.lang === 'zh' ? '主任务' : 'Primary' }}</span>
            <strong>{{ themeStore.lang === 'zh' ? studyPlan.primary.zh : studyPlan.primary.en }}</strong>
            <small>{{ themeStore.lang === 'zh' ? studyPlan.primary.reasonZh : studyPlan.primary.reasonEn }}</small>
          </span>
          <span class="primary-arrow">→</span>
        </button>

        <div class="plan-support">
          <button class="support-card" @click="router.push(studyPlan.review.path)">
            <span class="support-icon">{{ studyPlan.review.icon }}</span>
            <span>
              <strong>{{ themeStore.lang === 'zh' ? studyPlan.review.zh : studyPlan.review.en }}</strong>
              <small>{{ themeStore.lang === 'zh' ? studyPlan.review.reasonZh : studyPlan.review.reasonEn }}</small>
            </span>
          </button>
          <div class="support-card insight-card">
            <span class="support-icon">{{ studyPlan.insight.icon }}</span>
            <span>
              <strong>{{ themeStore.lang === 'zh' ? '弱点提示' : 'Focus Insight' }}</strong>
              <small>{{ themeStore.lang === 'zh' ? studyPlan.insight.zh : studyPlan.insight.en }}</small>
            </span>
          </div>
        </div>

        <div class="plan-chips">
          <button v-for="task in studyPlan.tasks" :key="task.zh" class="plan-chip" @click="router.push(task.path)">
            <span>{{ task.icon }}</span>
            {{ themeStore.lang === 'zh' ? task.zh : task.en }}
          </button>
        </div>

        <div v-if="dueReviewItemsPreview.length" class="review-strip">
          <span class="review-strip-label">{{ themeStore.lang === 'zh' ? '待复练' : 'Due Review' }}</span>
          <span v-for="item in dueReviewItemsPreview" :key="item.id" class="review-pill">
            {{ item.text }}
          </span>
        </div>

        <div class="action-queue">
          <div class="action-queue-head">
            <strong>{{ themeStore.lang === 'zh' ? '今日行动队列' : 'Daily Action Queue' }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '按顺序做，别纠结' : 'Follow the order, no overthinking' }}</span>
          </div>
          <button
            v-for="(task, index) in studyPlan.actionQueue"
            :key="task.labelEn + task.en"
            class="action-step"
            @click="task.path === '/dashboard' ? checkinStore.checkin() : router.push(task.path)"
          >
            <span class="action-order">{{ index + 1 }}</span>
            <span class="action-copy">
              <strong>{{ themeStore.lang === 'zh' ? task.labelZh : task.labelEn }} · {{ themeStore.lang === 'zh' ? task.zh : task.en }}</strong>
              <small>{{ themeStore.lang === 'zh' ? task.reasonZh : task.reasonEn }}</small>
            </span>
            <span class="action-min">{{ task.minutes }}m</span>
          </button>
        </div>
      </div>

      <div v-if="inputRecoveryPlan" class="input-recovery-card">
        <div class="input-recovery-main">
          <span class="input-recovery-icon">{{ inputRecoveryPlan.icon }}</span>
          <div>
            <span class="plan-kicker">{{ themeStore.lang === 'zh' ? '输入复盘' : 'Input Follow-up' }}</span>
            <h2>{{ inputRecoveryPlan.title }}</h2>
            <p>{{ themeStore.lang === 'zh' ? inputRecoveryPlan.issueZh : inputRecoveryPlan.issueEn }}</p>
          </div>
        </div>
        <div class="input-recovery-side">
          <strong>{{ inputRecoveryPlan.scoreLabel }}</strong>
          <button @click="router.push(inputRecoveryPlan.path)">
            {{ themeStore.lang === 'zh' ? '去复练' : 'Review' }}
          </button>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Left column -->
        <div class="dashboard-left">
          <!-- Streak + Heatmap -->
          <div class="card">
            <div class="card-header">
              <h3>{{ themeStore.lang === 'zh' ? '学习日历' : 'Study Calendar' }}</h3>
              <span class="streak-badge">
                🔥 {{ checkinStore.currentStreak }} {{ themeStore.lang === 'zh' ? '天连续' : 'day streak' }}
              </span>
            </div>
            <div class="heatmap">
              <div v-for="(day, i) in heatmapDays" :key="i" class="heat-cell" :class="'level-' + day.level" :title="day.date + ': ' + day.count + (themeStore.lang === 'zh' ? '次练习' : ' practices')">
                <span class="heat-day">{{ day.day }}</span>
              </div>
            </div>
            <div class="heatmap-legend">
              <span class="legend-label">{{ themeStore.lang === 'zh' ? '少' : 'Less' }}</span>
              <div class="legend-cell level-0"></div>
              <div class="legend-cell level-1"></div>
              <div class="legend-cell level-2"></div>
              <div class="legend-cell level-3"></div>
              <div class="legend-cell level-4"></div>
              <span class="legend-label">{{ themeStore.lang === 'zh' ? '多' : 'More' }}</span>
            </div>
          </div>

          <!-- Module stats -->
          <div class="card">
            <h3 class="card-title">{{ themeStore.lang === 'zh' ? '模块统计' : 'Module Stats' }}</h3>
            <div class="module-list">
              <div v-for="m in moduleStats" :key="m.labelEn" class="module-item">
                <span class="module-icon">{{ m.icon }}</span>
                <div class="module-info">
                  <span class="module-name">{{ themeStore.lang === 'zh' ? m.labelZh : m.labelEn }}</span>
                  <span class="module-count">{{ m.count }} {{ themeStore.lang === 'zh' ? '次' : 'sessions' }}</span>
                </div>
                <div v-if="m.score" class="module-score" :style="{ color: m.scoreSuffix ? getPercentScoreColor(parseFloat(m.score)) : getScoreColor(parseFloat(m.score)) }">
                  {{ m.score }}{{ m.scoreSuffix || '' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="dashboard-right">
          <!-- Score trends -->
          <div class="card">
            <h3 class="card-title">{{ themeStore.lang === 'zh' ? '分数趋势' : 'Score Trends' }}</h3>

            <div v-if="speakingScores.length > 0" class="trend-section">
              <div class="trend-header">
                <span class="trend-label">🎤 {{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</span>
                <span class="trend-avg" :style="{ color: getScoreColor(parseFloat(avgSpeakingScore)) }">{{ avgSpeakingScore }}</span>
              </div>
              <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
                <line v-if="targetScore > 0" x1="0" :y1="40 - (targetScore / 9) * 40" x2="200" :y2="40 - (targetScore / 9) * 40" stroke="var(--red)" stroke-width="1" stroke-dasharray="4 2" opacity="0.5" />
                <path :d="getSparklinePath(speakingScores)" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div v-if="writingScores.length > 0" class="trend-section">
              <div class="trend-header">
                <span class="trend-label">✍️ {{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</span>
                <span class="trend-avg" :style="{ color: getScoreColor(parseFloat(avgWritingScore)) }">{{ avgWritingScore }}</span>
              </div>
              <svg class="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
                <line v-if="targetScore > 0" x1="0" :y1="40 - (targetScore / 9) * 40" x2="200" :y2="40 - (targetScore / 9) * 40" stroke="var(--red)" stroke-width="1" stroke-dasharray="4 2" opacity="0.5" />
                <path :d="getSparklinePath(writingScores)" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <div v-if="targetScore > 0" class="target-legend">
              <span class="target-line-icon"></span>
              <span>{{ themeStore.lang === 'zh' ? '目标线' : 'Target line' }}: Band {{ targetScore }}</span>
            </div>

            <div v-if="speakingScores.length === 0 && writingScores.length === 0" class="empty-trend">
              <p>{{ themeStore.lang === 'zh' ? '完成练习后这里会显示分数趋势' : 'Score trends will appear after practice' }}</p>
            </div>
          </div>

          <!-- Check-in -->
          <div class="card">
            <div class="card-header">
              <h3>{{ themeStore.lang === 'zh' ? '每周打卡' : 'Weekly Check-in' }}</h3>
            </div>
            <div class="week-grid">
              <div v-for="day in weekDays" :key="day.date" class="day-item" :class="{ checked: day.isChecked, today: day.isToday }">
                <span class="day-label">{{ day.day }}</span>
                <div class="day-dot"><span v-if="day.isChecked" class="check-icon">✓</span></div>
              </div>
            </div>
            <button class="checkin-btn" @click="checkinStore.checkin()" :disabled="checkinStore.isChecked(today)">
              {{ checkinStore.isChecked(today) ? (themeStore.lang === 'zh' ? '已打卡 ✓' : 'Checked In ✓') : (themeStore.lang === 'zh' ? '打卡' : 'Check In') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Quick links -->
      <h2 class="section-title">{{ themeStore.lang === 'zh' ? '开始学习' : 'Start Learning' }}</h2>
      <div class="quick-links">
        <router-link v-for="link in [
          { path: '/speaking', icon: '🎤', labelZh: '口语练习', labelEn: 'Speaking Practice' },
          { path: '/listening', icon: '👂', labelZh: '听力练习', labelEn: 'Listening Practice' },
          { path: '/reading', icon: '📖', labelZh: '阅读练习', labelEn: 'Reading Practice' },
          { path: '/writing', icon: '✍️', labelZh: '写作练习', labelEn: 'Writing Practice' },
          { path: '/vocabulary', icon: '📚', labelZh: '词汇学习', labelEn: 'Vocabulary' }
        ]" :key="link.path" :to="link.path" class="quick-link">
          <span class="link-icon">{{ link.icon }}</span>
          <span class="link-label">{{ themeStore.lang === 'zh' ? link.labelZh : link.labelEn }}</span>
          <span class="link-arrow">→</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
  gap: var(--space-md);
}

.dashboard-header h1 {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  letter-spacing: 0;
}

.welcome {
  color: var(--text-secondary);
  margin-top: 4px;
}

.goal-btn {
  flex-shrink: 0;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Goal settings */
.goal-settings {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-xl);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
  align-items: center;
}

.goal-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-row label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
}

.goal-select, .goal-input {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.goal-countdown {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.countdown-num {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--red);
}

.countdown-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.goal-gap {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.gap-ok { color: var(--green); }
.gap-warn { color: var(--amber); }

.target-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.target-line-icon {
  width: 16px;
  height: 2px;
  background: var(--red);
  opacity: 0.5;
  border-top: 1px dashed var(--red);
}

/* Trial banner */
.trial-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--blue-soft);
  border: 1px solid var(--blue);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.trial-banner.expired {
  background: var(--red-soft);
  border-color: var(--red);
}

.trial-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.trial-icon { font-size: 1.3rem; }

.trial-info strong {
  font-size: var(--font-size-sm);
  display: block;
}

.trial-info p {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
}

.trial-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .trial-btn { background: var(--white); color: var(--black); }

.return-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-md);
  background: var(--yellow-soft);
  border: 1px solid var(--amber);
  border-radius: var(--radius-md);
}

.return-banner strong {
  font-size: var(--font-size-sm);
}

.return-banner p {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.return-banner button {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: var(--black);
  color: var(--white);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

[data-theme="dark"] .return-banner button {
  background: var(--white);
  color: var(--black);
}

/* Start checklist */
.start-checklist {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-md);
}

.start-checklist-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.start-checklist-head h2 {
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: 1.2;
}

.start-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.start-step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  text-align: left;
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.start-step:hover {
  border-color: var(--text-tertiary);
}

.start-step.done {
  background: var(--green-soft);
}

.start-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--green);
  font-weight: 900;
}

.start-step-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.start-step-copy strong {
  font-size: var(--font-size-sm);
}

.start-step-copy small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.start-action {
  grid-column: 2;
  color: var(--blue);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.start-step.done .start-action {
  color: var(--green);
}

/* Today card */
.today-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-md);
}

.today-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.today-header h3 {
  font-weight: 700;
  font-size: var(--font-size-base);
}

.today-sub {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.today-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.today-num {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--text-primary);
}

.today-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-md);
}

.progress-fill {
  height: 100%;
  background: var(--green);
  border-radius: 4px;
  transition: width var(--transition-base);
}

.today-breakdown {
  display: flex;
  gap: var(--space-lg);
}

.breakdown-item {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

/* Study plan */
.study-plan-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-xl);
}

.study-plan-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.plan-kicker {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: 700;
  margin-bottom: 4px;
}

.study-plan-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: 1.2;
}

.plan-status {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.primary-plan {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 16px;
  border-radius: var(--radius-md);
  text-align: left;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.primary-plan:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.tone-blue { background: var(--blue-soft); }
.tone-green { background: var(--green-soft); }
.tone-purple { background: var(--purple-soft); }
.tone-amber { background: var(--yellow-soft); }
.tone-neutral { background: var(--bg-tertiary); }

.primary-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}

[data-theme="dark"] .primary-icon {
  background: rgba(255, 255, 255, 0.1);
}

.primary-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.primary-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 700;
}

.primary-body strong {
  font-size: var(--font-size-base);
  color: var(--text-primary);
}

.primary-body small,
.support-card small {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.45;
}

.primary-arrow {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-weight: 800;
}

.plan-support {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.support-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  text-align: left;
}

button.support-card {
  transition: transform var(--transition-fast);
}

button.support-card:hover {
  transform: translateX(3px);
}

.support-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.support-card span:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.support-card strong {
  font-size: var(--font-size-sm);
}

.insight-card {
  border: 1px solid var(--border-color);
}

.plan-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: var(--space-md);
}

.plan-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  transition: all var(--transition-fast);
}

.plan-chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.review-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: var(--space-md);
  margin-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.review-strip-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: 800;
}

.review-pill {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  background: var(--yellow-soft);
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.action-queue {
  padding-top: var(--space-md);
  margin-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.action-queue-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: 10px;
}

.action-queue-head strong {
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.action-queue-head span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.action-step {
  width: 100%;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  text-align: left;
}

.action-step + .action-step {
  border-top: 1px solid var(--border-color);
}

.action-order {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 900;
}

.action-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-copy strong {
  font-size: var(--font-size-sm);
}

.action-copy small {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.action-min {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

.input-recovery-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.input-recovery-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.input-recovery-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--bg-tertiary);
  font-size: 1.25rem;
}

.input-recovery-main h2 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.input-recovery-main p {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.input-recovery-side {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-shrink: 0;
}

.input-recovery-side strong {
  font-size: var(--font-size-xl);
  font-weight: 900;
}

.input-recovery-side button {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: var(--black);
  color: var(--white);
  font-size: var(--font-size-xs);
  font-weight: 800;
}

[data-theme="dark"] .input-recovery-side button {
  background: var(--white);
  color: var(--black);
}

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.card-header h3 {
  font-weight: 700;
  font-size: var(--font-size-base);
}

.card-title {
  font-weight: 700;
  font-size: var(--font-size-base);
  margin-bottom: var(--space-md);
}

.streak-badge {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

/* Heatmap */
.heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: var(--space-md);
}

.heat-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.heat-day { opacity: 0.7; }

.level-0 { background: var(--bg-tertiary); color: var(--text-tertiary); }
.level-1 { background: #dcfce7; color: #166534; }
.level-2 { background: #86efac; color: #166534; }
.level-3 { background: #22c55e; color: white; }
.level-4 { background: #15803d; color: white; }

[data-theme="dark"] .level-0 { background: var(--bg-tertiary); }
[data-theme="dark"] .level-1 { background: #14532d; color: #86efac; }
[data-theme="dark"] .level-2 { background: #166534; color: #86efac; }
[data-theme="dark"] .level-3 { background: #15803d; color: white; }
[data-theme="dark"] .level-4 { background: #22c55e; color: white; }

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.legend-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Module stats */
.module-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.module-icon { font-size: 1.2rem; }

.module-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.module-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.module-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.module-score {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

/* Score trends */
.trend-section {
  margin-bottom: var(--space-md);
}

.trend-section:last-child { margin-bottom: 0; }

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trend-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.trend-avg {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.sparkline {
  width: 100%;
  height: 40px;
}

.empty-trend {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* Week grid */
.week-grid {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: var(--space-md);
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.day-label { font-size: var(--font-size-xs); color: var(--text-tertiary); font-weight: 600; }

.day-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
}

.day-item.checked .day-dot { background: var(--black); color: var(--white); }
[data-theme="dark"] .day-item.checked .day-dot { background: var(--white); color: var(--black); }
.day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--black); }
[data-theme="dark"] .day-item.today .day-dot { box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--white); }

.check-icon { font-weight: 700; }

.checkin-btn {
  width: 100%;
  padding: 10px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
}
[data-theme="dark"] .checkin-btn { background: var(--white); color: var(--black); }
.checkin-btn:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: default; }

/* Section title + quick links */
.section-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.quick-link:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.link-icon { font-size: 1.3rem; }
.link-label { flex: 1; font-weight: 600; font-size: var(--font-size-sm); }
.link-arrow { color: var(--text-tertiary); }

@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .quick-links { grid-template-columns: 1fr; }
  .start-steps { grid-template-columns: 1fr; }
  .plan-support { grid-template-columns: 1fr; }
  .return-banner { align-items: flex-start; flex-direction: column; }
  .return-banner button { width: 100%; }
  .input-recovery-card { align-items: flex-start; flex-direction: column; }
  .input-recovery-side { width: 100%; justify-content: space-between; }
  .study-plan-header,
  .start-checklist-head { flex-direction: column; }
  .action-queue-head { align-items: flex-start; flex-direction: column; gap: 2px; }
}

@media (max-width: 520px) {
  .dashboard-page {
    padding-top: calc(var(--header-height) + var(--space-md));
  }

  .dashboard-header {
    align-items: flex-start;
    margin-bottom: var(--space-md);
  }

  .dashboard-header h1 {
    font-size: var(--font-size-2xl);
  }

  .welcome {
    display: none;
  }

  .goal-btn {
    padding: 7px 12px;
    max-width: 132px;
    white-space: normal;
    line-height: 1.2;
  }

  .trial-banner,
  .return-banner,
  .start-checklist,
  .today-card,
  .study-plan-card,
  .input-recovery-card,
  .card {
    padding: var(--space-md);
    border-radius: var(--radius-md);
  }

  .start-checklist-head,
  .study-plan-header {
    margin-bottom: 10px;
  }

  .start-checklist-head h2,
  .study-plan-header h2 {
    font-size: var(--font-size-lg);
  }

  .start-steps {
    gap: 8px;
  }

  .start-step {
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    padding: 9px 10px;
  }

  .start-dot {
    width: 24px;
    height: 24px;
  }

  .start-step-copy {
    gap: 1px;
  }

  .start-step-copy small {
    display: none;
  }

  .start-action {
    grid-column: auto;
    white-space: nowrap;
  }

  .today-header {
    margin-bottom: 10px;
  }

  .today-breakdown {
    gap: 8px;
    flex-wrap: wrap;
  }

  .breakdown-item {
    min-width: calc(20% - 7px);
    font-size: var(--font-size-xs);
  }

  .primary-plan {
    padding: 12px;
    gap: 10px;
  }

  .primary-icon {
    width: 36px;
    height: 36px;
    font-size: 1.15rem;
  }

  .support-card {
    padding: 11px;
  }

  .plan-chips {
    display: none;
  }

  .action-step {
    grid-template-columns: 24px 1fr auto;
    gap: 8px;
    padding: 9px 0;
  }

  .action-order {
    width: 24px;
    height: 24px;
  }

  .action-copy small {
    display: none;
  }

  .dashboard-grid {
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .input-recovery-main {
    align-items: flex-start;
  }

  .input-recovery-icon {
    width: 36px;
    height: 36px;
  }

  .input-recovery-main h2 {
    font-size: var(--font-size-base);
  }

  .input-recovery-main p {
    font-size: var(--font-size-xs);
  }

  .quick-link {
    padding: 12px 14px;
  }
}

/* Onboarding */
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-xl);
}

.onboarding-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.onboarding-card h2 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  margin-bottom: 8px;
  text-align: center;
}

.onboarding-desc {
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-xl);
}

.onboarding-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: var(--space-xl);
}

.ob-step {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.ob-icon { font-size: 1.5rem; flex-shrink: 0; }
.ob-step strong { font-size: var(--font-size-sm); display: block; margin-bottom: 2px; }
.ob-step p { font-size: var(--font-size-xs); color: var(--text-secondary); margin: 0; }

.onboarding-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.onboarding-btn {
  width: 100%;
  padding: 14px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
}

[data-theme="dark"] .onboarding-btn {
  background: var(--white);
  color: var(--black);
}

.onboarding-secondary {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-weight: 700;
  font-size: var(--font-size-base);
}

.onboarding-secondary:hover {
  background: var(--bg-tertiary);
}

@media (max-width: 520px) {
  .onboarding-actions {
    grid-template-columns: 1fr;
  }
}
</style>
