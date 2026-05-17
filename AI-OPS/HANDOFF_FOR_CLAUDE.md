# Handoff For Claude

Date: 2026-05-17

## Current Goal

Mamio is being optimized from a collection of IELTS modules into an AI IELTS learning cockpit.

The product direction is:

- Dashboard tells the user what to do next.
- Speaking and Writing AI feedback produce structured weak points and next actions.
- Weak points become review items.
- Writing feedback leads into a focused rewrite loop.

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

### Dashboard Learning Cockpit

- Replaced the old one-line recommendation with a richer study plan card.
- Dashboard now shows:
  - primary task
  - review task
  - weak-area insight
  - quick task chips
  - due AI review item preview
- Dashboard can infer weak areas from old scoring details and read new structured AI fields if present.

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

Speaking and Writing pages now save AI `reviewItems` into this local review pool.

### Writing Rewrite Loop

Writing page now displays a `rewriteMission` card when AI feedback includes it.

Users can:

- see target section
- see rewrite checklist
- write a focused rewrite
- save the rewrite locally

Saved rewrite key pattern:

`mamio-writing-rewrite-<historyId or promptId>`

## Verification Completed

Passed:

- `npm run build`
- `cd server && node --check index.js && node --check routes/ai.js`
- Local Dashboard smoke test
- Local Writing page smoke test
- Local Dashboard mobile-width check earlier in the round

Local services were stopped afterward. Ports `3000` and `5173` were clear at handoff time.

## Not Fully Verified Yet

- Full Speaking microphone flow.
- Real DeepSeek AI scoring response using the new structured fields.
- Writing rewrite mission with a real AI response from DeepSeek.
- VPS deployment after these changes.

Do not assume these are production-ready until checked.

## Important Caution

The AI prompt changes request new JSON fields, but LLM output may still be malformed or omit fields.

Frontend code is mostly tolerant because it checks optional fields. Still, the next hardening step should improve backend parsing and schema normalization.

## Recommended Next Tasks

### 1. Add Review Items UI

Create a dedicated lightweight review panel or page.

Recommended first version:

- show due review items
- group by module: writing / speaking / general
- allow marking an item reviewed
- no backend table yet

Files likely involved:

- `src/services/reviewItems.js`
- `src/views/DashboardPage.vue`
- possibly new `src/views/ReviewPage.vue`
- `src/router/index.js`

### 2. Harden AI Response Normalization

Add backend helper functions that normalize AI output before returning to frontend.

Goals:

- ensure `reviewItems` is always an array
- ensure `weakestArea` and `nextAction` have safe defaults
- ensure `rewriteMission` has expected shape or is omitted
- avoid frontend receiving arbitrary malformed shape

Likely file:

- `server/routes/ai.js`

### 3. Improve Writing Rewrite Loop

Current rewrite loop only saves locally.

Next version:

- show saved rewrite attempts in history
- optionally send rewrite-only text to AI for targeted check
- compare original paragraph vs rewrite

### 4. Connect Weak Words Across Modules

Longer-term:

- from writing feedback: weak expressions and replacement phrases
- from speaking feedback: weak expressions and pronunciation words
- from reading/listening: missed keywords
- all flow into review items

### 5. Server-Side Review Items

Once local review UX feels useful, add a real `review_items` SQLite table.

Candidate schema:

- `id`
- `user_id`
- `module`
- `type`
- `text`
- `reason`
- `source`
- `due`
- `reviewed_at`
- `created_at`

Only do this after backing up the live SQLite database on VPS.

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

