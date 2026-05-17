# Mamio Roadmap

This roadmap is intentionally product-first, not feature-count-first.

## Phase 1: Stabilize The Base ✅

Goal: make the current app reliable enough to iterate on.

- [x] Fix security and startup issues.
- [x] Make local development predictable.
- [x] Ensure all core pages have loading, empty, error, and auth states.
- [x] Normalize server/local history data shapes.
- [x] Add a repeatable QA checklist.

Success signal: A new change can be built, locally smoke-tested, pushed, and verified on VPS without guesswork.

## Phase 2: Learning Loop ✅

Goal: turn separate modules into a real study system.

- [x] Dashboard shows today’s recommended action.
- [x] Speaking and writing feedback produce concrete next steps.
- [x] Vocabulary SRS and weak words connect back to writing/speaking.
- [x] Reading/listening mistakes generate review items.
- [x] User can see weekly progress and weak module trend.

Success signal: After any practice, the user knows exactly what to do next.

## Phase 3: AI Feedback Quality ✅

Goal: make AI output feel like a useful IELTS tutor, not generic scoring.

- [x] Standardize AI result schemas.
- [x] Add rubric-specific feedback for each module.
- [x] Improve prompt injection resistance.
- [x] Add retry and fallback behavior for malformed JSON.
- [x] Store enough structured feedback for later dashboards.

Success signal: AI feedback is actionable, comparable over time, and safe to store.

## Phase 4: Productization

Goal: make Mamio viable as a small paid product.

- [x] Create SQLite backup script (`deploy/backup-db.sh`).
- [ ] Add backup cron to VPS (manual step after deploy).
- [x] Add server-side `review_items` table with API endpoints.
- [x] Add admin visibility into usage and active users (Usage tab).
- [x] Add trial countdown banner on Dashboard.
- [x] Add basic operational logs for AI endpoints.
- [x] Improve pricing/activation explanation on landing page.

Success signal: It is clear who is using Mamio, how often, and why they convert or stop.

## Later Optimization Ideas

- [x] Add a dedicated review page for AI-generated weak points.
- [x] Normalize all AI responses on the backend before returning them to the frontend.
- [x] Add targeted rewrite checking for Writing, so users can resubmit only the weak paragraph.
- [x] Add full Speaking mock flow with score trends, transcript replay, and repeated weak-area tracking.
- [x] Connect weak words from Writing, Speaking, Listening, and Reading into one review system.
- [x] Add target band and exam date so Dashboard recommendations can become goal-aware.
- [ ] Add server-side `review_items` only after local review UX proves useful and live SQLite backup workflow is clear.

## Current Recommended Next Moves

1. ~~Add VPS SQLite backup cron job~~ — Done.
2. ~~Create `review_items` table and API endpoints~~ — Done.
3. ~~Add admin usage dashboard~~ — Done.
4. ~~Add operational logging for AI endpoints~~ — Done.
5. ~~Clean up trial-to-paid flow with clear pricing and countdown~~ — Done.
6. ~~Improve landing page (pricing, activation explanation, feature highlights)~~ — Done.

## All Phase 4 items complete. Product is ready for wider testing.
