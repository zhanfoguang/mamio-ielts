#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const root = process.cwd()
const draftDir = path.join(root, 'AI-OPS', 'content-drafts')
const userAgent = 'MamioIELTS/1.0 (content seed discovery; no article redistribution)'
const execFileAsync = promisify(execFile)
const blockedSeedTerms = [
  'murder',
  'film',
  'song',
  'singer',
  'actress',
  'wrestler',
  'mma',
  'contest',
  'album',
  'television',
  'footballer',
  'politician',
  'golfer',
  'golf',
  'ufc',
  'boxing',
  'election',
  'senate',
  'lockdown'
]

const academicSeedTerms = [
  'climate',
  'environment',
  'urban',
  'city',
  'energy',
  'health',
  'disease',
  'epidemic',
  'science',
  'technology',
  'research',
  'education',
  'university',
  'history',
  'historic',
  'museum',
  'culture',
  'temple',
  'roman',
  'agriculture',
  'transport',
  'economy',
  'public',
  'library',
  'memory',
  'language',
  'battery',
  'food',
  'community'
]

const fallbackAcademicSeeds = [
  {
    title: 'Urban heat adaptation',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'Cities are experimenting with shade corridors, cool roofs, reflective pavements, and urban forests to reduce heat exposure during longer and more intense summers.'
  },
  {
    title: 'Food waste reduction systems',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'Supermarkets, restaurants, and households are using data tracking, donation networks, and clearer date labels to reduce avoidable food waste.'
  },
  {
    title: 'Remote work and regional towns',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'The spread of remote work has changed housing demand, transport needs, and local business patterns in smaller towns outside major cities.'
  },
  {
    title: 'Battery recycling supply chains',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'As electric vehicles become more common, governments and manufacturers are developing systems to recover lithium, nickel, and cobalt from used batteries.'
  },
  {
    title: 'Public libraries as community infrastructure',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'Modern libraries increasingly provide digital access, study spaces, language classes, and social support alongside traditional book lending.'
  },
  {
    title: 'Citizen science and environmental monitoring',
    type: 'fallback_academic',
    source: 'Mamio editorial seed list',
    licenseNote: 'Self-authored topic seed for original IELTS-style material.',
    url: '',
    extract: 'Citizen science projects allow volunteers to collect data on birds, air quality, water pollution, and seasonal changes at a scale researchers cannot reach alone.'
  }
]

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function wikimediaDateParts(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0')
  }
}

function uniqBy(items, keyFn) {
  const seen = new Set()
  return items.filter(item => {
    const key = keyFn(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeSeed(item, type) {
  const title = String(item?.title || item?.normalizedtitle || '').trim()
  const extract = String(item?.extract || item?.description || '').replace(/\s+/g, ' ').trim()
  if (!title || extract.length < 60) return null
  return {
    title,
    type,
    source: 'Wikimedia featured feed',
    licenseNote: 'Use as topic inspiration only; generate original IELTS-style material instead of copying text.',
    url: item.content_urls?.desktop?.page || item.content_urls?.mobile?.page || item?.url || '',
    extract: extract.slice(0, 700)
  }
}

function isUsefulForIelts(seed) {
  const text = `${seed.title} ${seed.extract}`.toLowerCase()
  if (blockedSeedTerms.some(term => text.includes(term))) return false
  if (seed.type === 'fallback_academic') return true
  return academicSeedTerms.some(term => text.includes(term))
}

async function fetchWikimediaSeeds(date = new Date()) {
  const { year, month, day } = wikimediaDateParts(date)
  const urls = [
    `https://en.wikipedia.org/api/rest_v1/feed/featured/${year}/${month}/${day}`,
    `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`
  ]
  let res = null
  let lastError = null
  for (const url of urls) {
    try {
      res = await fetch(url, { headers: { 'User-Agent': userAgent } })
      if (res.ok) break
      lastError = new Error(`${url} returned ${res.status}`)
    } catch (err) {
      lastError = err
    }
  }
  let data = null
  if (res?.ok) {
    data = await res.json()
  } else {
    data = await fetchJsonWithCurl(urls)
  }
  const raw = [
    normalizeSeed(data.tfa, 'featured_article'),
    ...(data.mostread?.articles || []).slice(0, 12).map(item => normalizeSeed(item, 'most_read')),
    ...(data.news || []).flatMap(news => (news.links || []).slice(0, 2).map(item => normalizeSeed(item, 'news_link')))
  ].filter(Boolean)
  const usefulSeeds = uniqBy(raw, item => item.title.toLowerCase()).filter(isUsefulForIelts)
  return uniqBy([...usefulSeeds, ...fallbackAcademicSeeds], item => item.title.toLowerCase()).slice(0, 18)
}

async function fetchJsonWithCurl(urls) {
  let lastError = null
  for (const url of urls) {
    try {
      const { stdout } = await execFileAsync('curl', [
        '-L',
        '--fail',
        '--silent',
        '--show-error',
        '--max-time',
        '20',
        '-H',
        `User-Agent: ${userAgent}`,
        url
      ], { maxBuffer: 5 * 1024 * 1024 })
      return JSON.parse(stdout)
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`Wikimedia fetch failed: ${lastError?.message || 'unknown error'}`)
}

function buildGenerationPrompt(seeds) {
  return `You are creating ORIGINAL IELTS practice content for Mamio IELTS.

Important rules:
- Do not copy source text.
- Use the source seeds only for broad topic inspiration.
- Produce original passages, questions, answers, and explanations.
- Keep content suitable for IELTS Academic learners.
- Return strict JSON only.

Generate:
1) two reading passages:
   - one medium, one hard
   - 4 paragraphs each
   - each has three question groups: true-false-ng, multiple-choice, short-answer
2) two listening scenes:
   - one section 2, one section 4
   - each has 6-8 sentence objects with en, cn, duration

Seed topics:
${seeds.map((seed, i) => `${i + 1}. ${seed.title}: ${seed.extract}`).join('\n')}

JSON shape:
{
  "readingPassages": [
    {
      "title": "...",
      "level": "medium|hard",
      "passage": "Paragraph A...\\n\\nParagraph B...",
      "questions": []
    }
  ],
  "listeningSections": [
    {
      "section": 2,
      "title": "...",
      "description": "...",
      "sentences": [
        {"en": "...", "cn": "...", "duration": 5000}
      ]
    }
  ]
}`
}

async function callDeepSeek(prompt) {
  await loadServerEnv()
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required for --generate')
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Return strict JSON only. Create original IELTS-style learning content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 6000
    })
  })
  if (!res.ok) throw new Error(`DeepSeek generation failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  return JSON.parse((match ? match[1] : text).trim())
}

async function loadServerEnv() {
  const envPath = path.join(root, 'server', '.env')
  try {
    const text = await fs.readFile(envPath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const [key, ...valueParts] = trimmed.split('=')
      if (!process.env[key]) {
        process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // Optional: CI or VPS can provide env vars directly.
  }
}

async function main() {
  const shouldGenerate = process.argv.includes('--generate')
  await fs.mkdir(draftDir, { recursive: true })
  const seeds = await fetchWikimediaSeeds()
  const dateKey = localDateKey()
  const seedPath = path.join(draftDir, `content-seeds-${dateKey}.json`)
  await fs.writeFile(seedPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), seeds }, null, 2)}\n`)

  if (!shouldGenerate) {
    console.log(`Saved ${seeds.length} seeds to ${seedPath}`)
    console.log('Run npm run content:generate to create AI draft content.')
    return
  }

  const draft = await callDeepSeek(buildGenerationPrompt(seeds))
  const draftPath = path.join(draftDir, `generated-content-${dateKey}.json`)
  await fs.writeFile(draftPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceSeedFile: path.relative(root, seedPath),
    status: 'draft-needs-review',
    ...draft
  }, null, 2)}\n`)
  console.log(`Saved generated draft to ${draftPath}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
