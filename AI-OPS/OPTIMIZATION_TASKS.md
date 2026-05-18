# Mamio Optimization Tasks

This is the active execution list for turning Mamio from a module collection into an IELTS learning cockpit.

## Phase 1: Dashboard Learning Cockpit

- [x] Add Dashboard next-action feature spec.
- [x] Replace one-line recommendation with a study plan card.
- [x] Read weak areas from AI feedback history.
- [x] Show concrete weak-area evidence on Dashboard.

## Phase 2: Structured AI Feedback

- [x] Speaking AI returns `weakestArea`, `nextAction`, `reviewItems`, and `suggestedPractice`.
- [x] Writing AI returns `weakestArea`, `nextAction`, `reviewItems`, `rewriteMission`, and `suggestedPractice`.
- [x] Frontend saves structured feedback in history details without breaking old records.

## Phase 3: Review Items

- [x] Create a local-first review item service.
- [x] Extract review items from speaking and writing feedback.
- [x] Surface due review items on Dashboard.
- [ ] Keep future path open for a server `review_items` table.

## Phase 4: Writing Rewrite Loop

- [x] Show a rewrite mission after AI grading.
- [x] Let user rewrite one focused paragraph or answer section.
- [x] Save rewrite attempts locally.

## Phase 5: QA And Deployment Readiness

- [x] Run build and backend syntax checks.
- [x] Browser-test Dashboard and Writing smoke paths.
- [ ] Browser-test Speaking after a real microphone/AI scoring pass.
- [ ] Decide which changes are product-code-ready for GitHub/VPS deployment.

## Phase 6: Review Items UI

- [x] Create ReviewPage.vue with due/all/reviewed filters.
- [x] Group review items by module with mark-reviewed and delete actions.
- [x] Add /review route and nav link in header.

## Phase 7: AI Response Normalization

- [x] Add normalizeSpeakingResult and normalizeWritingResult in server/routes/ai.js.
- [x] Clamp scores to 1-9 range.
- [x] Ensure reviewItems is always an array.
- [x] Truncate long strings to safe lengths.

## Phase 8: Writing Rewrite Loop Enhancement

- [x] Show saved rewrite attempts in history panel.
- [x] Add "Check with AI" button for targeted rewrite scoring.
- [x] Display rewrite assessment result.

## Phase 9: Cross-Module Weak Word Connection

- [x] Speaking pronunciationWords saved as review items.
- [x] Reading wrong answers saved as review items.
- [x] Listening unrecognized dictation words saved as review items.

## Phase 10: AI Retry & Fallback

- [x] callDeepSeek retries once on parse failure with lower temperature (0.3).
- [x] Speaking endpoint returns normalized empty result on parse failure.
- [x] Writing endpoint returns normalized empty result on parse failure.
- [x] Speaking-conversation returns safe followup on parse failure.
- [x] Vocab endpoint returns empty words array on parse failure.
- [x] Listening endpoint returns empty transcript/questions on parse failure.

## Phase 11: Speaking Mock Enhancement

- [x] Part 2 proper IELTS timer: 1min prep (no recording) + 2min speaking (auto-record).
- [x] Score trend tracking: mock scores saved and displayed as bar chart on results page.
- [x] Transcript replay: recorded audio playback alongside transcript in results.

## Phase 12: Dashboard Target Score & Exam Date

- [x] Users can set target band score and exam date via Dashboard settings.
- [x] Days-until-exam countdown displayed.
- [x] Score gap visualization (current vs target).
- [x] Target reference line on score trend sparklines.
- [x] Study plan becomes target-aware: exam urgency and gap drive recommendations.

## Phase 13: SQLite Backup + Server-Side Review Items

- [x] Add `review_items` table in `server/db.js` with indexes.
- [x] Add `reviewItemQueries` prepared statements (CRUD + stats).
- [x] Add review_items API endpoints in `server/routes/progress.js` (GET, POST, PATCH, DELETE, migrate).
- [x] Update `src/services/reviewItems.js` to use API-first with localStorage fallback.
- [x] Update `src/views/ReviewPage.vue` to use async API calls.
- [x] Update `src/views/DashboardPage.vue` to use sync stats + migration on mount.
- [x] Create `deploy/backup-db.sh` for daily VPS SQLite backup.
- [ ] Add backup cron to VPS (manual step — user needs to run on VPS).

## Phase 14: Productization — Admin Usage & Trial Flow

- [x] Add admin stats API endpoint (`GET /auth/admin/stats`): role counts, active users (7d/30d), AI calls today, top users, trial conversion rate, expiring soon list.
- [x] Add Usage tab to AdminPage with overview cards, role breakdown bars, top users table, expiring soon list.
- [x] Add trial countdown banner on Dashboard for trial/expired users with activate CTA.

## Phase 15: Operational Logging

- [x] Add `api_logs` table in `server/db.js` with indexes and 30-day auto-prune.
- [x] Add `logQueries` prepared statements (add, getByUser, getRecent, prune, statsByDay).
- [x] Add `logApiCall()` helper in `server/routes/ai.js`.
- [x] Add logging to all 5 AI endpoints (speaking-conversation, speaking, writing, vocab, listening).
- [x] Add admin logs API endpoint (`GET /auth/admin/logs`): recent 200 logs + daily stats for 7 days.
- [x] Add API Logs tab to AdminPage with daily call chart and recent logs table.

## Phase 16: Landing Page Improvement

- [x] Add pricing section with trial/monthly/yearly plans.
- [x] Add activation code explanation with 3-step guide.
- [x] Create `src/components/landing/PricingSection.vue` with i18n support.

## Phase 17: Content Supply System

- [x] Expand the first static reading/listening banks beyond demo size.
- [x] Expand formal content again to 16 reading passages and 12 listening scenes, with all four listening sections now having 3 scenes each.
- [x] Add `AI-OPS/CONTENT_UPDATE_BLUEPRINT.md` for safe content sourcing and publishing.
- [x] Add `npm run content:seed` to fetch public topic seeds into `AI-OPS/content-drafts/`.
- [x] Add `npm run content:generate` to create AI-generated draft content from seeds.
- [x] Add `npm run content:validate` to catch schema and bank-size regressions.
- [x] Add admin review UI for approving generated content.
- [x] Add admin-side draft quality flags: schema, duplicate titles, weak listening durations, and merge readiness.
- [x] Add admin content-bank health dashboard for reading level coverage, question types, listening sections, and structural gaps.
- [x] Persist admin draft review status back into generated JSON files.
- [x] Add `npm run content:merge-approved` to merge approved, unmerged drafts into reading/listening banks with duplicate protection.
- [ ] Move approved content from static files into server-side content tables.
- [ ] Add weekly VPS cron for draft generation only, never direct publishing.

## Phase 18: Practice Feedback Loop

- [x] Add reading practice report with Band estimate, unanswered count, wrong count, target time, question-type breakdown, and next-step recommendation.
- [x] Add listening completion report with Band estimate, missed words, unanswered count, Section context, and next-step recommendation.
- [x] Save listening completion scores into local history.
- [x] Surface reading/listening average accuracy in Dashboard module stats and study-plan priority.
- [x] Send all reading wrong/unanswered item types into Review, including matching and multiple choice.
- [x] Send listening completion wrong/unanswered blanks into Review.
