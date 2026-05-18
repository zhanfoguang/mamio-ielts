#!/usr/bin/env node
import { readingPassages } from '../src/data/ielts/reading.js'
import { listeningSections } from '../src/data/ielts/listening.js'
import { speakingTopics } from '../src/data/ielts/speaking.js'
import { writingTasks } from '../src/data/ielts/writing.js'
import { vocabTopics } from '../src/data/ielts/vocabulary.js'

const allowedReadingTypes = new Set(['true-false-ng', 'matching', 'matching-headings', 'short-answer', 'multiple-choice'])
const errors = []

function fail(message) {
  errors.push(message)
}

function countReadingQuestionItems(question) {
  if (question.type === 'true-false-ng') return question.statements?.length || 0
  if (question.type === 'multiple-choice') return question.items?.length || 0
  if (question.type === 'short-answer') return question.items?.length || 0
  if (question.type === 'matching') return question.items?.length || 0
  if (question.type === 'matching-headings') return question.answers?.length || 0
  return 0
}

for (const passage of readingPassages) {
  if (!passage.id || !passage.title || !passage.level || !passage.passage) fail(`Reading passage ${passage.id || '(missing id)'} is missing required fields`)
  if (!Array.isArray(passage.questions) || passage.questions.length < 3) fail(`Reading passage "${passage.title}" needs at least 3 question groups`)
  for (const question of passage.questions || []) {
    if (!allowedReadingTypes.has(question.type)) fail(`Reading passage "${passage.title}" has unsupported type: ${question.type}`)
    if (countReadingQuestionItems(question) === 0) fail(`Reading passage "${passage.title}" has empty question group: ${question.id}`)
    if ((question.type === 'matching' || question.type === 'matching-headings') && !Array.isArray(question.answers)) fail(`Reading passage "${passage.title}" matching question missing answers`)
  }
}

for (const section of listeningSections) {
  if (!section.id || !section.section || !section.title) fail(`Listening section ${section.id || '(missing id)'} is missing required fields`)
  if (!Array.isArray(section.sentences) || section.sentences.length < 5) fail(`Listening section "${section.title}" needs at least 5 sentences`)
  for (const sentence of section.sentences || []) {
    if (!sentence.en || !sentence.cn || !sentence.duration) fail(`Listening section "${section.title}" has incomplete sentence`)
  }
}

const readingByLevel = readingPassages.reduce((acc, passage) => {
  acc[passage.level] = (acc[passage.level] || 0) + 1
  return acc
}, {})

const listeningBySection = listeningSections.reduce((acc, item) => {
  acc[item.section] = (acc[item.section] || 0) + 1
  return acc
}, {})

const totals = {
  readingPassages: readingPassages.length,
  readingQuestionGroups: readingPassages.reduce((sum, passage) => sum + passage.questions.length, 0),
  listeningSections: listeningSections.length,
  listeningSentences: listeningSections.reduce((sum, section) => sum + section.sentences.length, 0),
  speakingTopics: (speakingTopics.part1?.length || 0) + (speakingTopics.part2?.length || 0) + (speakingTopics.part3?.length || 0),
  writingPrompts: (writingTasks.task1?.length || 0) + (writingTasks.task2?.length || 0),
  vocabWords: vocabTopics.reduce((sum, topic) => sum + topic.words.length, 0),
  readingByLevel,
  listeningBySection
}

if (readingPassages.length < 16) fail('Reading bank below current minimum: 16 passages')
if (listeningSections.length < 12) fail('Listening bank below current minimum: 12 scenes')
if ((writingTasks.task1?.length || 0) < 4 || (writingTasks.task2?.length || 0) < 4) fail('Writing bank needs at least 4 prompts per task type')
if ((speakingTopics.part1?.length || 0) < 5 || (speakingTopics.part2?.length || 0) < 5 || (speakingTopics.part3?.length || 0) < 5) fail('Speaking bank needs at least 5 topics per part')

console.log(JSON.stringify(totals, null, 2))

if (errors.length) {
  console.error('\nContent validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('\nContent validation passed.')
