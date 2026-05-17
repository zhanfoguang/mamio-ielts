# Handoff For Claude

Date: 2026-05-17 (updated)

## Current Goal

Mamio has been transformed from a collection of IELTS modules into an AI IELTS learning cockpit. Phases 1-12 of the optimization plan are complete.

The product now has:

- Dashboard with target-aware study plan and next-action recommendations.
- Structured AI feedback with weakestArea, nextAction, reviewItems, rewriteMission.
- Cross-module review items (speaking, writing, listening, reading).
- Writing rewrite loop with targeted AI re-scoring.
- Speaking Mock with proper IELTS Part 2 timer and score trends.
- AI retry/fallback for all endpoints.
- Dashboard target score and exam date with countdown.

Do not rush VPS deployment. Continue designing, coding, and testing locally first. Push to GitHub/VPS only when the user explicitly wants the product code deployed.

## Files To Read First

1. `CLAUDE.md`
2. `AI-OPS/README.md`
3. `AI-OPS/OPTIMIZATION_TASKS.md`
4. `AI-OPS/ROADMAP.md`
5. `AI-OPS/specs/dashboard-next-action.md`

## Completed In This Round

### AI Ops / Project Governance

Added `AI-OPS/` as the local project governance layer:

- `PRODUCT_MANAGER.md`
- `CODE_REVIEWER.md`
- `QA_CHECKLIST.md`
- `FEATURE_SPEC_TEMPLATE.md`
- `ROADMAP.md`
- `OPTIMIZATION_TASKS.md`
- `specs/dashboard-next-action.md`

Also linked `AI-OPS/` from `CLAUDE.md` and `README.md`.

### Stability Fixes

- `server/index.js`: changed route imports to dynamic imports after `dotenv.config(...)`, so `server/.env` is loaded before `db.js` requires `ADMIN_PASSWORD`.
- `src/views/WritingPage.vue`: escaped user text before `v-html` in essay comparison to prevent user-controlled HTML from rendering.
- `src/views/WritingPage.vue`: normalized writing history entries so backend `task_type` and local `taskType` shapes both render correctly.
- Security audit: removed hardcoded secrets, added rate limiting, input validation, crypto.randomInt for reset codes.

### Dashboard Learning Cockpit

- Replaced the old one-line recommendation with a richer study plan card.
- Dashboard now shows:
  - primary task
  - review task
  - weak-area insight
  - quick task chips
  - due AI review item preview
- Dashboard can infer weak areas from old scoring details and read new structured AI fields if present.
- Dashboard target score and exam date with countdown and goal-aware recommendations.

### Structured AI Feedback

Updated `server/routes/ai.js` prompts so Speaking and Writing responses keep old fields but also request:

- `weakestArea`
- `nextAction`
- `suggestedPractice`
- `reviewItems`

Writing also requests:

- `rewriteMission`

### Local Review Items

Added `src/services/reviewItems.js`.

For now this is localStorage-first:

- storage key: `mamio-review-items`
- `addReviewItemsFromFeedback(...)`
- `getReviewItemStats(...)`

All modules now save review items:
- Speaking: AI reviewItems + pronunciationWords
- Writing: AI reviewItems
- Listening: unrecognized dictation words
- Reading: wrong answers

### Review Items UI

Created `src/views/ReviewPage.vue` with:
- Due/all/reviewed filters
- Grouped by module (speaking, writing, listening, reading, vocabulary, general)
- Mark-reviewed and delete actions
- Route at `/review` with nav link in header

### AI Response Normalization

Added in `server/routes/ai.js`:
- `normalizeSpeakingResult()` and `normalizeWritingResult()`
- Scores clamped to 1-9 range
- `reviewItems` always returns as array
- Long strings truncated to safe lengths

### AI Retry & Fallback

- `callDeepSeek()` retries once on parse failure with lower temperature (0.3)
- All 5 AI endpoints return safe fallback responses on malformed JSON instead of 500 errors

### Writing Rewrite Loop

Writing page now displays a `rewriteMission` card when AI feedback includes it.

Users can:

- see target section
- see rewrite checklist
- write a focused rewrite
- save the rewrite locally
- see saved rewrite attempts in history panel
- click "Check with AI" for targeted rewrite scoring
- see rewrite assessment result (score, improvements, remaining issues)

Saved rewrite key pattern:

`mamio-writing-rewrite-<historyId or promptId>`

### Speaking Mock Enhancement

`src/views/MockExamPage.vue` now has:
- Part 2 proper IELTS timer: 1min preparation (no recording) + 2min speaking (auto-starts recording)
- Score trend tracking: mock scores saved to `mamio-mock-scores` and displayed as bar chart on results
- Transcript replay: recorded audio URLs saved per part, replayable alongside transcripts

### Dashboard Target Score & Exam Date

`src/views/DashboardPage.vue` now includes:
- Target band score selector (5-9) and exam date picker
- Days-until-exam countdown
- Score gap visualization (current vs target)
- Dashed target reference line on score trend sparklines
- Study plan adapts: exam-sprint mode when <= 14 days, gap-driven recommendations

## Verification Completed

Passed:

- `npm run build` — all 12 phases compile clean
- `cd server && node --check index.js && node --check routes/ai.js`
- Local Dashboard smoke test
- Local Writing page smoke test
- Local Dashboard mobile-width check
- AI retry/fallback tested with malformed responses
- Review items cross-module flow verified

Local services were stopped afterward. Ports `3000` and `5173` were clear at handoff time.

## Not Fully Verified Yet

- Full Speaking microphone flow with real DeepSeek scoring.
- VPS deployment after these changes.
- Server-side review_items table (pending SQLite backup first).

Do not assume these are production-ready until checked.

## Important Notes

1. AI responses are now normalized on the backend (clamped scores, arrays, truncated strings), with retry on parse failure and safe fallbacks on permanent failure.
2. All review items are currently localStorage-only (`mamio-review-items`). Server-side table planned after SQLite backup workflow is established.
3. Mock exam scores tracked separately in `mamio-mock-scores` localStorage key.

## Completed Tasks (from previous handoff)

1. ~~Add Review Items UI~~ — Done: `src/views/ReviewPage.vue`
2. ~~Harden AI Response Normalization~~ — Done: `normalizeSpeakingResult`, `normalizeWritingResult`, `clampScore`, `normalizeReviewItems`
3. ~~Improve Writing Rewrite Loop~~ — Done: rewrite history, "Check with AI" button, assessment display
4. ~~Connect Weak Words Across Modules~~ — Done: speaking, writing, listening, reading all save review items
5. ~~Speaking Mock Enhancement~~ — Done: Part 2 timer, score trends, transcript replay
6. ~~Dashboard Target Score~~ — Done: target band, exam date, goal-aware study plan

## Recommended Next Tasks

### 1. SQLite Backup + Server-Side Review Items

First: add a daily cron job to back up the VPS SQLite database.
Then: create `review_items` table and migrate localStorage review items to server.

Candidate schema:

- `id`, `user_id`, `module`, `type`, `text`, `reason`, `source`, `due`, `reviewed_at`, `created_at`

Files involved:
- `server/db.js` — new table + prepared statements
- `server/routes/progress.js` — new CRUD endpoints
- `src/services/reviewItems.js` — switch to API-first with localStorage fallback

### 2. Productization — Admin Usage Dashboard

Admin page should show:
- Active users (last 7 days, last 30 days)
- AI calls per user per day
- Trial conversion rate (trial → paid)
- Expiring soon list

Files involved:
- `server/routes/auth.js` — new admin stats endpoint
- `src/views/AdminPage.vue` — usage dashboard UI

### 3. Operational Logging

Add basic request logging for AI endpoints:
- User ID, endpoint, timestamp, response status, latency
- Store in SQLite `api_logs` table (auto-prune after 30 days)

Files involved:
- `server/db.js` — new `api_logs` table
- `server/routes/ai.js` — log after each call
- `server/routes/auth.js` — admin endpoint to query logs

### 4. Trial-to-Paid Flow Cleanup

- Improve pricing/activation explanation on landing page
- Add trial countdown on Dashboard when user is trial
- Show clear messaging when trial expires

Files involved:
- `src/views/LandingPage.vue`
- `src/views/DashboardPage.vue`
- `src/views/LoginPage.vue`

## Product Direction After This

Mamio should compete as a learning cockpit, not a test-bank clone.

The strongest path:

1. Dashboard decides the next action.
2. AI feedback creates weak points.
3. Weak points become review items.
4. Review items feed the next session.
5. Writing and Speaking have focused second attempts, not just one-off scoring.

Avoid optimizing for raw feature count. Optimize for the user feeling:

> I know exactly what to practice next, and the app remembers my weak points.

