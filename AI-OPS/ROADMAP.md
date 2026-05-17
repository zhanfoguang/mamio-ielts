# Mamio Roadmap

This roadmap is intentionally product-first, not feature-count-first.

## Phase 1: Stabilize The Base

Goal: make the current app reliable enough to iterate on.

- Fix security and startup issues.
- Make local development predictable.
- Ensure all core pages have loading, empty, error, and auth states.
- Normalize server/local history data shapes.
- Add a repeatable QA checklist.

Success signal:

- A new change can be built, locally smoke-tested, pushed, and verified on VPS without guesswork.

## Phase 2: Learning Loop

Goal: turn separate modules into a real study system.

- Dashboard shows today’s recommended action.
- Speaking and writing feedback produce concrete next steps.
- Vocabulary SRS and weak words connect back to writing/speaking.
- Reading/listening mistakes generate review items.
- User can see weekly progress and weak module trend.

Success signal:

- After any practice, the user knows exactly what to do next.

## Phase 3: AI Feedback Quality

Goal: make AI output feel like a useful IELTS tutor, not generic scoring.

- Standardize AI result schemas.
- Add rubric-specific feedback for each module.
- Improve prompt injection resistance.
- Add retry and fallback behavior for malformed JSON.
- Store enough structured feedback for later dashboards.

Success signal:

- AI feedback is actionable, comparable over time, and safe to store.

## Phase 4: Productization

Goal: make Mamio viable as a small paid product.

- Clean trial-to-paid activation flow.
- Improve pricing/activation explanation.
- Add admin visibility into usage and active users.
- Add basic operational logs.
- Add backup process for live SQLite database.

Success signal:

- It is clear who is using Mamio, how often, and why they convert or stop.

## Current Recommended Next Moves

1. Finish and deploy current stability fixes.
2. Add Gito or similar PR review workflow once GitHub secrets are ready.
3. Pick one learning-loop feature, probably Dashboard next-action recommendations.
4. Write its feature spec before implementation.

## Later Optimization Ideas

- Add a dedicated review page for AI-generated weak points.
- Normalize all AI responses on the backend before returning them to the frontend.
- Add targeted rewrite checking for Writing, so users can resubmit only the weak paragraph.
- Add full Speaking mock flow with score trends, transcript replay, and repeated weak-area tracking.
- Connect weak words from Writing, Speaking, Listening, and Reading into one review system.
- Add target band and exam date so Dashboard recommendations can become goal-aware.
- Add server-side `review_items` only after local review UX proves useful and live SQLite backup workflow is clear.
