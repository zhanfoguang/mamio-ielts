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
