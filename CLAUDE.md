# Mamio IELTS — Project Context

## What is this?
AI-powered IELTS preparation web app. Speaking, Listening, Reading, Writing, Vocabulary practice with AI scoring via DeepSeek API.

**Live:** http://47.88.87.116:8080
**Repo:** https://github.com/zhanfoguang/mamio-ielts

## AI Ops / Project Governance

Before planning non-trivial work, read `AI-OPS/README.md`.

- `AI-OPS/PRODUCT_MANAGER.md` — product judgment, priorities, PRD output shape
- `AI-OPS/CODE_REVIEWER.md` — Mamio-specific review risks and output format
- `AI-OPS/QA_CHECKLIST.md` — local, API, and VPS smoke-test checklist
- `AI-OPS/FEATURE_SPEC_TEMPLATE.md` — template for feature specs before implementation
- `AI-OPS/ROADMAP.md` — staged roadmap from stability to learning loop to productization

Operating rule: do not add features just because they are possible. First decide whether the change improves the learning loop, reliability, or productization.

## Tech Stack
- **Frontend:** Vue 3 + Vite + Pinia + Vue Router
- **Backend:** Express.js + better-sqlite3
- **AI:** DeepSeek API (chat completions)
- **Speech:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Auth:** JWT (7-day expiry) + bcryptjs
- **Deploy:** VPS (Alibaba Cloud) + PM2 + nginx (port 8080) + auto-deploy via cron

## Architecture

```
Frontend (Vite, port 5173 dev)          Backend (Express, port 3000)
┌─────────────────────────┐             ┌──────────────────────────┐
│ src/views/*.vue         │──axios────▶│ server/routes/ai.js      │
│ src/services/ai.js      │            │ server/routes/auth.js    │
│ src/services/progress.js│            │ server/routes/progress.js│
│ src/stores/auth.js      │            │ server/db.js (SQLite)    │
│ src/stores/theme.js     │            │ server/middleware/auth.js │
└─────────────────────────┘             └──────────────────────────┘
```

## Key Files

### Frontend
- `src/views/SpeakingPage.vue` — Speaking practice (Part 1/2/3), AI scoring, conversation mode
- `src/views/ListeningPage.vue` — TTS audio playback, dictation practice, word comparison
- `src/views/ReadingPage.vue` — Reading passages with TFNG/matching/short-answer/multiple-choice
- `src/views/WritingPage.vue` — Task 1 & 2 essays, AI grading, model essays
- `src/views/VocabPage.vue` — Flashcards, SM-2 SRS, quiz mode, AI word generation
- `src/views/DashboardPage.vue` — Progress dashboard, heatmap, module stats
- `src/views/MockExamPage.vue` — Full mock exam flow
- `src/views/AdminPage.vue` — Admin panel (user management, invite codes)
- `src/views/LoginPage.vue` — Login/register
- `src/views/LandingPage.vue` — Marketing landing page
- `src/components/landing/PricingSection.vue` — Pricing plans and activation guide
- `src/services/ai.js` — AI API calls (speaking, writing, vocab, listening)
- `src/services/progress.js` — Progress API calls (history, SRS, daily stats)
- `src/services/api.js` — Axios instance with JWT interceptor
- `src/stores/auth.js` — Auth state (user, token, login/logout)
- `src/stores/theme.js` — Dark/light theme + language (zh/en)
- `src/composables/useSpeechRecognition.js` — Web Speech API wrapper
- `src/data/ielts/` — Static content (speaking topics, reading passages, writing prompts, vocab, listening sections)
- `src/router/index.js` — Route definitions with auth guards

### Backend
- `server/index.js` — Express entry, CORS, route mounting
- `server/db.js` — SQLite schema, prepared statements, admin auto-creation
- `server/routes/ai.js` — DeepSeek API integration (speaking/writing/vocab/listening scoring)
- `server/routes/auth.js` — Register, login, JWT, forgot password, admin endpoints
- `server/routes/progress.js` — Speaking/writing/reading/listening history, vocab SRS, daily stats, dashboard aggregate
- `server/middleware/auth.js` — JWT verification middleware
- `server/mail.js` — SMTP email for password reset

### Deploy
- `deploy/ecosystem.config.cjs` — PM2 config (reads .env and injects as env vars)
- `deploy/deploy.sh` — Manual deploy script (rsync to VPS)
- `deploy/auto-deploy.sh` — VPS cron deploy script (GitHub pull, build, PM2 restart, health check)
- `deploy/nginx.conf` — nginx config template
- `deploy/setup-vps.sh` — VPS initial setup script
- `deploy/backup-db.sh` — Daily SQLite backup script (gzip, 7-day retention)

### VPS Paths (Alibaba Cloud, 47.88.87.116)
- **项目目录:** `/var/www/mimio/`
- **前端构建产物:** `/var/www/mimio/dist/` (nginx 直接 serve)
- **后端入口:** `/var/www/mimio/server/index.js`
- **数据库:** `/var/www/mimio/server/mamio.db` (SQLite)
- **环境变量:** `/var/www/mimio/server/.env`
- **PM2 配置:** `/var/www/mimio/deploy/ecosystem.config.cjs`
- **自动部署脚本:** `/var/www/mimio/deploy/auto-deploy.sh` (cron 每 5 分钟)
- **部署日志:** `/var/www/mimio/deploy.log`
- **nginx 配置:** `/etc/nginx/conf.d/mimio.conf`
- **nginx 监听端口:** 8080
- **后端端口:** 3000 (nginx 反代 → /api)
- **PM2 进程名:** `mamio-server` (以 root 运行)
- **PM2 路径:** `/root/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2` (需 sudo)
- **PM2 快捷方式:** `alias pm2="sudo /root/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2"` (已加到 admin 的 .bashrc)

### 部署流程
1. 本地 `git push origin main`
2. VPS cron 每 5 分钟执行 `deploy/auto-deploy.sh`
3. 脚本执行: `git fetch` → 比较 commit → `git pull --ff-only` → `npm ci` → `npm run build` → `pm2 restart` → local health check
4. nginx 自动 serve 新的 `dist/` 产物

### VPS 手动部署命令（admin 用户）
```bash
cd /var/www/mimio && sudo git pull && sudo npm install && sudo npm run build && sudo /root/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2 restart mamio-server
```

### VPS 自动部署安装/修复命令
```bash
cd /var/www/mimio
git pull --ff-only origin main
chmod +x deploy/auto-deploy.sh
sudo bash -lc '(crontab -l 2>/dev/null | grep -v "deploy/auto-deploy.sh"; echo "*/5 * * * * /var/www/mimio/deploy/auto-deploy.sh >> /var/www/mimio/deploy.log 2>&1") | crontab -'
tail -n 80 /var/www/mimio/deploy.log
```

### VPS git safe.directory 问题
如果遇到 `dubious ownership` 错误，先跑：
```bash
sudo git config --global --add safe.directory /var/www/mimio
```

## Database Schema (SQLite)
- `users` — email, password_hash, nickname, role (trial/paid/expired/admin), ai_calls_today, trial_start, expires_at
- `invite_codes` — code, duration_days, used_by, used_at
- `reset_codes` — email, code, expires_at, used
- `speaking_history` — user_id, mode, part, topic, question, answer, score, details (JSON), exchanges
- `writing_history` — user_id, task_type, task, essay, score, details (JSON)
- `reading_history` — user_id, passage, score, correct, total, time, details (JSON)
- `listening_history` — user_id, section, section_number, mode, score, correct, total, details (JSON)
- `vocab_progress` — user_id, word, ease, interval, reps, due, last_review (SM-2 fields)
- `daily_stats` — user_id, date, speaking, writing, listening, reading, vocab counts
- `review_items` — user_id, module, type, text, reason, source, reviewed_at, created_at
- `api_logs` — user_id, endpoint, method, status, latency_ms, created_at (auto-pruned after 30 days)

## User Roles
- `trial` — 10 AI calls/day, 3-day window, auto-expires
- `paid` — Unlimited, activated via invite code, has expiry date
- `expired` — Locked out
- `admin` — Unlimited, can manage users and generate invite codes

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | No | Create account (auto trial) |
| POST | /login | No | Login, returns JWT |
| GET | /me | Yes | Current user info |
| POST | /activate | Yes | Activate invite code |
| POST | /forgot-password | No | Send reset code via email |
| POST | /verify-reset-code | No | Verify reset code |
| POST | /reset-password | No | Reset password |
| GET | /admin/users | Admin | List all users |
| POST | /admin/codes | Admin | Generate invite codes |
| GET | /admin/codes | Admin | List all codes |
| GET | /admin/stats | Admin | Usage stats (roles, active users, AI calls, conversion) |
| GET | /admin/logs | Admin | Recent API logs + daily stats |

### AI (`/api/ai`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /speaking | Yes+quota | Score speaking response |
| POST | /speaking-conversation | Yes+quota | Multi-turn speaking follow-up + final scoring |
| POST | /writing | Yes+quota | Grade essay |
| POST | /vocab | Yes+quota | Generate vocabulary |
| POST | /listening | Yes+quota | Generate listening material |

### Progress (`/api/progress`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /speaking | Yes | Speaking history (last 50) |
| POST | /speaking | Yes | Add speaking record |
| GET | /writing | Yes | Writing history (last 50) |
| POST | /writing | Yes | Add writing record |
| GET | /reading | Yes | Reading history (last 50) |
| POST | /reading | Yes | Add reading record |
| GET | /listening | Yes | Listening history (last 50) |
| POST | /listening | Yes | Add listening record |
| GET | /vocab | Yes | All SRS data |
| POST | /vocab | Yes | Upsert SRS data |
| GET | /daily-stats?date= | Yes | Get daily stats |
| POST | /daily-stats/increment | Yes | Increment module count |
| GET | /review-items | Yes | All review items |
| GET | /review-items/due | Yes | Unreviewed items |
| POST | /review-items | Yes | Add review items (array) |
| PATCH | /review-items/:id/review | Yes | Mark item reviewed |
| DELETE | /review-items/:id | Yes | Delete review item |
| POST | /review-items/migrate | Yes | Migrate localStorage items |
| GET | /dashboard | Yes | Aggregate dashboard data |

## Development

### 本地路径
- **项目根目录:** `/Users/zfg/mimio-clone/`
- **前端源码:** `/Users/zfg/mimio-clone/src/`
- **后端源码:** `/Users/zfg/mimio-clone/server/`
- **前端入口:** `/Users/zfg/mimio-clone/src/main.js`
- **后端入口:** `/Users/zfg/mimio-clone/server/index.js`
- **本地 .env:** `/Users/zfg/mimio-clone/server/.env`
- **本地数据库:** `/Users/zfg/mimio-clone/server/mamio.db`
- **构建产物:** `/Users/zfg/mimio-clone/dist/`

```bash
# Frontend
npm install && npm run dev    # localhost:5173

# Backend
cd server
cp .env.example .env          # fill in DEEPSEEK_API_KEY, JWT_SECRET, ADMIN_PASSWORD
npm install && node index.js  # localhost:3000
```

## Environment Variables (server/.env)
- `JWT_SECRET` — Required, no fallback
- `ADMIN_PASSWORD` — Required, no fallback
- `DEEPSEEK_API_KEY` — Required for AI features
- `DEEPSEEK_BASE_URL` — Default: https://api.deepseek.com
- `ADMIN_EMAIL` — Default: admin@mamio.com
- `CORS_ORIGIN` — Default: http://localhost:5173
- `SMTP_HOST/PORT/USER/PASS` — Optional, for password reset emails

## Known Issues / Tech Debt
- No refresh token mechanism (JWT valid for 7 days)
- Some old components in `src/components/` may be unused (PhonemeDemo, VideoPlayer, etc.)
- `src/data/flashcards.js`, `src/data/phonemes.js`, `src/data/sentences.js` may be legacy
- i18n is partial — some pages hardcoded in Chinese

## Current Product Optimization Track

Mamio is now moving from "module collection" to "daily guided study product".

Recent direction:
- Dashboard has a start checklist and a daily action queue.
- Review items are prioritized by source/module and expose a top-three weak-spot cleanup action.
- Login and pricing flows explain the trial-to-activation path more clearly.
- Reading/listening practice produces reports, review items, API-first server history, and one-time local history migration.
- Dashboard now surfaces a reading/listening input follow-up card when recent attempts expose weak accuracy or dictation work.
- Mobile Dashboard density is tighter on small screens after adding the checklist/action queue.
- Content generation is draft-only, with admin review and dry-run merge safeguards.

Next recommended work:
1. Move approved content from static data files into server-side content tables.
2. Add a small admin publishing flow for approved content instead of local script-only merge.
3. Add attempt detail pages for reading/listening history so users can review old mistakes.
4. Add richer weekly retention analytics in Admin using server-side reading/listening attempts.
5. Install weekly VPS content-draft cron only after production `DEEPSEEK_API_KEY` is confirmed valid.
