# Mamio IELTS

AI-powered IELTS preparation platform. Practice Speaking, Listening, Reading, Writing, and Vocabulary with AI scoring.

**Live:** http://47.88.87.116:8080

## Project Governance

Mamio uses a lightweight AI Ops layer in `AI-OPS/` for product planning, review, QA, and roadmap control.

- Start with `AI-OPS/README.md`
- Use `AI-OPS/FEATURE_SPEC_TEMPLATE.md` before larger features
- Use `AI-OPS/QA_CHECKLIST.md` before deployment

## Features

### Speaking
- Part 1/2/3 topic browser with 35+ real IELTS questions
- Browser-based speech recognition (Web Speech API)
- AI conversation mode (multi-turn dialogue)
- Part 2 countdown timer (1min prep + 2min speaking)
- AI scoring on 4 dimensions: Fluency, Lexical, Grammar, Pronunciation

### Listening
- TTS audio playback with word-by-word highlighting
- Dictation practice with speech recognition
- Word comparison and accuracy scoring
- Auto-play mode for continuous listening
- Completion reports, missed-word review items, and server-backed attempt history

### Reading
- 16 IELTS reading passages with multiple question types
- True/False/Not Given, Matching, Short Answer, Multiple Choice
- Timer, detailed answer analysis, score tracking
- Practice reports, wrong-answer review items, and server-backed attempt history

### Writing
- Task 1 (data描述) and Task 2 (议论文) with real IELTS prompts
- 22 prompts total
- Countdown timer (20min / 40min)
- AI grading on 4 dimensions with model essays

### Vocabulary
- 21 topics with 210 high-frequency IELTS words
- Flashcard flip animation with phonetics, meanings, examples
- SM-2 spaced repetition system (SRS)
- Quiz mode: multiple choice, spelling, translation
- AI-generated additional words per topic

### Dashboard
- Daily activity heatmap (5 modules)
- Learning streak tracking
- Module-level progress stats
- First-time onboarding guide
- Target-aware daily action queue, start checklist, stale-user prompt, and input follow-up card

### Mock Exam
- Full mock exam flow combining multiple modules

### Admin Panel
- User management
- Invite code generation and tracking
- Usage stats, API logs, content draft review, and content-bank health checks

## Tech Stack

- **Frontend:** Vue 3, Vite, Pinia, Vue Router
- **Backend:** Express.js, better-sqlite3, JWT auth
- **AI:** DeepSeek API
- **Speech:** Web Speech API + MediaRecorder API
- **Deploy:** PM2 + nginx + auto-deploy (cron)

## Development

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
cp .env.example .env   # add your DEEPSEEK_API_KEY, JWT_SECRET, ADMIN_PASSWORD
npm install
node index.js

# Full local smoke check
npm run smoke
```

## Deployment

Push to GitHub. VPS auto-deploys every 5 minutes via cron.

Auto-deploy cron on VPS:
```bash
*/5 * * * * /var/www/mimio/deploy/auto-deploy.sh >> /var/www/mimio/deploy.log 2>&1
```
Install it in root crontab if PM2 is managed by root.

Manual deploy:
```bash
ssh root@47.88.87.116
cd /var/www/mimio
bash deploy/auto-deploy.sh
```

## Project Structure

```
mamio-ielts/
├── src/
│   ├── views/              # Page components (11 pages)
│   ├── components/         # Reusable UI (landing, layout, learning, ui)
│   ├── composables/        # Vue composables (speech recognition)
│   ├── data/ielts/         # Static content banks
│   ├── services/           # API clients (ai, progress)
│   ├── stores/             # Pinia stores (auth, theme, checkin, learning)
│   ├── i18n/               # Internationalization (zh/en)
│   └── router/             # Route config with auth guards
├── server/
│   ├── index.js            # Express entry
│   ├── db.js               # SQLite schema + queries
│   ├── routes/             # API routes (auth, ai, progress)
│   ├── middleware/          # JWT auth middleware
│   └── mail.js             # SMTP email
├── deploy/                 # Deployment configs
└── CLAUDE.md               # Full project context
```

## License

MIT
