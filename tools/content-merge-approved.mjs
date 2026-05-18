#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { readingPassages } from '../src/data/ielts/reading.js'
import { listeningSections } from '../src/data/ielts/listening.js'

const root = process.cwd()
const draftDir = path.join(root, 'AI-OPS', 'content-drafts')
const readingPath = path.join(root, 'src', 'data', 'ielts', 'reading.js')
const listeningPath = path.join(root, 'src', 'data', 'ielts', 'listening.js')
const allowedReadingTypes = new Set(['true-false-ng', 'matching', 'matching-headings', 'short-answer', 'multiple-choice'])
const allowedLevels = new Set(['easy', 'medium', 'hard'])
const isDryRun = process.argv.includes('--dry-run')

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function countReadingItems(question) {
  if (question.type === 'true-false-ng') return question.statements?.length || 0
  if (question.type === 'multiple-choice') return question.items?.length || 0
  if (question.type === 'short-answer') return question.items?.length || 0
  if (question.type === 'matching') return question.items?.length || 0
  if (question.type === 'matching-headings') return question.answers?.length || 0
  return 0
}

function isApprovedDraft(payload) {
  return payload?.status === 'approved' || payload?.review?.status === 'approved'
}

function normaliseReadingDraft(item, index) {
  const title = String(item?.title || '').trim()
  const level = String(item?.level || '').trim()
  const passage = String(item?.passage || '').trim()
  const questions = Array.isArray(item?.questions) ? item.questions : []
  const errors = []

  if (!title) errors.push('missing title')
  if (!allowedLevels.has(level)) errors.push(`unsupported level: ${level || '(empty)'}`)
  if (passage.length < 500) errors.push('passage is too short')
  if (questions.length < 3) errors.push('needs at least 3 question groups')

  const normalisedQuestions = questions.map((question, questionIndex) => {
    if (!allowedReadingTypes.has(question?.type)) {
      errors.push(`unsupported question type: ${question?.type || '(empty)'}`)
    }
    if (countReadingItems(question) === 0) {
      errors.push(`question group ${questionIndex + 1} has no scorable items`)
    }
    return {
      ...question,
      id: question.id || `q${questionIndex + 1}`
    }
  })

  if (errors.length) {
    return { ok: false, title: title || `reading draft #${index + 1}`, errors }
  }

  return {
    ok: true,
    item: {
      title,
      level,
      passage,
      questions: normalisedQuestions
    }
  }
}

function normaliseListeningDraft(item, index) {
  const title = String(item?.title || '').trim()
  const description = String(item?.description || '').trim()
  const section = Number(item?.section)
  const sentences = Array.isArray(item?.sentences) ? item.sentences : []
  const errors = []

  if (!title) errors.push('missing title')
  if (!Number.isInteger(section) || section < 1 || section > 4) errors.push(`unsupported section: ${item?.section || '(empty)'}`)
  if (!description) errors.push('missing description')
  if (sentences.length < 5) errors.push('needs at least 5 sentences')

  const normalisedSentences = sentences.map((sentence, sentenceIndex) => {
    const en = String(sentence?.en || '').trim()
    const cn = String(sentence?.cn || '').trim()
    const duration = Number(sentence?.duration)
    if (!en || !cn) errors.push(`sentence ${sentenceIndex + 1} is missing en/cn text`)
    if (!Number.isFinite(duration) || duration < 2500) errors.push(`sentence ${sentenceIndex + 1} has invalid duration`)
    return { en, cn, duration: Math.round(duration) }
  })

  if (errors.length) {
    return { ok: false, title: title || `listening draft #${index + 1}`, errors }
  }

  return {
    ok: true,
    item: {
      section,
      title,
      description,
      sentences: normalisedSentences
    }
  }
}

function withSequentialIds(items, startId) {
  return items.map((item, index) => ({ id: startId + index, ...item }))
}

async function writeDataModule(filePath, exportName, value) {
  const body = JSON.stringify(value, null, 2).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:')
  await fs.writeFile(filePath, `export const ${exportName} = ${body}\n`)
}

async function readDrafts() {
  let fileNames = []
  try {
    fileNames = await fs.readdir(draftDir)
  } catch {
    return []
  }

  const drafts = []
  for (const fileName of fileNames.filter(name => name.startsWith('generated-content-') && name.endsWith('.json'))) {
    const fullPath = path.join(draftDir, fileName)
    try {
      const payload = JSON.parse(await fs.readFile(fullPath, 'utf8'))
      drafts.push({ fileName, fullPath, payload })
    } catch (err) {
      drafts.push({ fileName, fullPath, error: err.message, payload: null })
    }
  }
  return drafts.sort((a, b) => a.fileName.localeCompare(b.fileName))
}

async function main() {
  const drafts = await readDrafts()
  const approvedDrafts = drafts.filter(draft => draft.payload && isApprovedDraft(draft.payload) && !draft.payload.mergedAt)
  const existingReadingTitles = new Set(readingPassages.map(item => normalizeTitle(item.title)))
  const existingListeningTitles = new Set(listeningSections.map(item => normalizeTitle(item.title)))
  const readingToAdd = []
  const listeningToAdd = []
  const skipped = []

  for (const draft of approvedDrafts) {
    for (const [index, item] of (draft.payload.readingPassages || []).entries()) {
      const result = normaliseReadingDraft(item, index)
      if (!result.ok) {
        skipped.push({ fileName: draft.fileName, type: 'reading', title: result.title, reason: result.errors.join('; ') })
        continue
      }
      const titleKey = normalizeTitle(result.item.title)
      if (existingReadingTitles.has(titleKey)) {
        skipped.push({ fileName: draft.fileName, type: 'reading', title: result.item.title, reason: 'duplicate title' })
        continue
      }
      existingReadingTitles.add(titleKey)
      readingToAdd.push({ fileName: draft.fileName, ...result.item })
    }

    for (const [index, item] of (draft.payload.listeningSections || []).entries()) {
      const result = normaliseListeningDraft(item, index)
      if (!result.ok) {
        skipped.push({ fileName: draft.fileName, type: 'listening', title: result.title, reason: result.errors.join('; ') })
        continue
      }
      const titleKey = normalizeTitle(result.item.title)
      if (existingListeningTitles.has(titleKey)) {
        skipped.push({ fileName: draft.fileName, type: 'listening', title: result.item.title, reason: 'duplicate title' })
        continue
      }
      existingListeningTitles.add(titleKey)
      listeningToAdd.push({ fileName: draft.fileName, ...result.item })
    }
  }

  if (!readingToAdd.length && !listeningToAdd.length) {
    console.log(JSON.stringify({
      approvedDraftFiles: approvedDrafts.length,
      addedReading: 0,
      addedListening: 0,
      skipped
    }, null, 2))
    return
  }

  const nextReadingId = Math.max(0, ...readingPassages.map(item => item.id || 0)) + 1
  const nextListeningId = Math.max(0, ...listeningSections.map(item => item.id || 0)) + 1
  const newReading = withSequentialIds(readingToAdd.map(({ fileName, ...item }) => item), nextReadingId)
  const newListening = withSequentialIds(listeningToAdd.map(({ fileName, ...item }) => item), nextListeningId)

  if (!isDryRun) {
    await writeDataModule(readingPath, 'readingPassages', [...readingPassages, ...newReading])
    await writeDataModule(listeningPath, 'listeningSections', [...listeningSections, ...newListening])
  }

  const mergedAt = new Date().toISOString()
  const mergedFiles = new Set([...readingToAdd, ...listeningToAdd].map(item => item.fileName))
  if (!isDryRun) {
    for (const draft of approvedDrafts.filter(item => mergedFiles.has(item.fileName))) {
      const mergedSummary = {
        readingTitles: readingToAdd.filter(item => item.fileName === draft.fileName).map(item => item.title),
        listeningTitles: listeningToAdd.filter(item => item.fileName === draft.fileName).map(item => item.title)
      }
      await fs.writeFile(draft.fullPath, `${JSON.stringify({ ...draft.payload, mergedAt, mergedSummary }, null, 2)}\n`)
    }
  }

  console.log(JSON.stringify({
    dryRun: isDryRun,
    approvedDraftFiles: approvedDrafts.length,
    addedReading: newReading.length,
    addedListening: newListening.length,
    skipped
  }, null, 2))
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
