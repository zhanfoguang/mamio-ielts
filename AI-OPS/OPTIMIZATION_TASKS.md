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
