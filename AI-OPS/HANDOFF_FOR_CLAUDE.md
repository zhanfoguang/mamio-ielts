# Handoff For Claude Code

Date: 2026-05-19
Repo: `https://github.com/zhanfoguang/mamio-ielts`
Local path: `/Users/zfg/mimio-clone`
VPS path: `/var/www/mimio`

## Read First

1. `CLAUDE.md` — project architecture, API, database, VPS paths, deployment commands.
2. `AI-OPS/OPTIMIZATION_TASKS.md` — detailed completed work and open task ledger.
3. `AI-OPS/ROADMAP.md` — product-stage roadmap.
4. `AI-OPS/PRODUCT_MANAGER.md` — use this lens before adding features.
5. `AI-OPS/CODE_REVIEWER.md` — review risks for Mamio.
6. `AI-OPS/CONTENT_UPDATE_BLUEPRINT.md` — content generation/review/publishing rules.

## Current State

Mamio is no longer just a set of IELTS practice pages. It is now a daily guided IELTS learning product:

- Dashboard gives a target-aware study plan, daily action queue, start checklist, stale-user prompt, input follow-up card, goal/exam countdown, heatmap, and module stats.
- Speaking and Writing AI feedback is normalized server-side and returns structured weak areas, next actions, review items, and writing rewrite missions.
- Review Center is server-backed through `review_items`, with local migration/fallback, priority labels, top-three cleanup, grouped filters, and empty-state pathways.
- Reading and Listening have larger static banks, completion reports, review-item extraction, local-to-server attempt migration, and API-first attempt history.
- Admin has usage statistics, API logs, content draft review, content-bank health checks, and invite-code management.
- Landing/login explain trial-to-activation more clearly.
- VPS auto-deploy and backup scripts exist; root cron is used for auto-deploy because PM2 is root-managed.

## Latest Commits To Know

These are on `main` and pushed:

- `f5065eb feat: surface input follow up on dashboard`
- `54f656b feat: migrate input practice history`
- `6be7f53 feat: persist input practice history`
- `5df0dbf docs: record guided study optimization plan`
- `7c07646 feat: clarify pricing activation path`
- `d04bfef feat: add guided daily study queue`

## VPS / Deployment Notes

Production VPS:

- Host: `47.88.87.116`
- App URL: `http://47.88.87.116:8080`
- Project dir: `/var/www/mimio`
- SQLite DB: `/var/www/mimio/server/mamio.db`
- Env file: `/var/www/mimio/server/.env`
- nginx config: `/etc/nginx/conf.d/mimio.conf`
- Backend port: `3000`
- nginx public port: `8080`
- PM2 process: `mamio-server`
- PM2 is managed by root.
- Auto-deploy log: `/var/www/mimio/deploy.log`

Important VPS incident already fixed:

- Old cron entries called `/var/www/mimio/auto-deploy.sh`, causing repeated `Permission denied`.
- The real script is `/var/www/mimio/deploy/auto-deploy.sh`.
- Repo ownership had caused `cannot open .git/FETCH_HEAD: Permission denied`; fixed with `sudo chown -R admin:admin /var/www/mimio`.
- Auto-deploy was reinstalled in root crontab because PM2 is root-managed.
- Manual test `sudo bash /var/www/mimio/deploy/auto-deploy.sh` returned "Already up to date".
- Later `tail -n 8 /var/www/mimio/deploy.log` showed clean 5-minute checks and no new old-path errors.

Known-good root cron entry:

```bash
*/5 * * * * /var/www/mimio/deploy/auto-deploy.sh >> /var/www/mimio/deploy.log 2>&1
```

Backup cron should also exist or be installed:

```bash
0 3 * * * /var/www/mimio/deploy/backup-db.sh >> /var/www/mimio/backup.log 2>&1
```

If auto-deploy acts suspicious, inspect both admin and root crontabs:

```bash
crontab -l
sudo crontab -l
sudo grep -R "/var/www/mimio/auto-deploy.sh" /etc/crontab /etc/cron.d /var/spool/cron /var/spool/cron/crontabs 2>/dev/null
```

Do not paste log output like `/bin/sh: 1: ...` into the shell; it is only log text.

## Verification Status

Last verified locally before handoff:

- `npm run build` passed.
- `npm run content:validate` passed.
- `node --check server/routes/progress.js && node --check server/db.js` passed.
- `git diff --check` passed.
- Git worktree was clean after pushing `f5065eb`.

Not fully verified:

- Real microphone + real DeepSeek Speaking scoring on production.
- Browser screenshot QA after latest Dashboard input follow-up card. The local Codex environment lacked Playwright.
- Weekly VPS content-draft cron is not confirmed installed; only install after production `DEEPSEEK_API_KEY` is confirmed valid.

## Important Current Data Model

Server-backed tables now include:

- `review_items`
- `api_logs`
- `content_draft_reviews`
- `reading_history`
- `listening_history`

Reading and Listening attempts are API-first with local fallback. Old localStorage attempts migrate on page load:

- Reading key: `mamio-reading-history`
- Listening key: `mamio-listening-history`

Review items also migrate from localStorage to server:

- Review key: `mamio-review-items`

## Open Product Direction

The next phase should make Mamio feel less like "tools" and more like a tutor that manages the user's week.

Primary product thesis:

> User opens Mamio, sees exactly what to do today, completes one focused attempt, receives a concrete weakness, and tomorrow's plan automatically reflects that weakness.

Do not chase raw feature count. Prioritize learning-loop memory, content quality, activation, and operational reliability.

## Recommended Next Optimization Plan

### Phase A — Content System Becomes Production-Grade

Goal: stop relying on static JS files as the long-term content source.

Tasks:

1. Add server tables for approved content: Done for reading/listening published content.
   - `reading_passages`
   - `reading_questions`
   - `listening_sections`
   - `listening_sentences`
   - optional `content_versions`
2. Add read-only public/content APIs: Done.
   - `GET /api/content/reading`
   - `GET /api/content/listening`
3. Keep static files as fallback during migration: Done.
4. Update `ReadingPage.vue` and `ListeningPage.vue` to load API content first, then fallback to `src/data/ielts/*`: Done.
5. Extend Admin content review so approved drafts can publish to DB instead of only merging into static files: Done.
6. Add rollback/disable metadata controls so bad generated content can be disabled: Done for DB-published additions.
7. Run:
   - `npm run content:validate`
   - `npm run build`
   - backend `node --check`

Acceptance:

- New approved reading/listening content can appear without editing static JS.
- Admin can distinguish draft, approved, published, rejected, and disabled content.
- No direct auto-publish from AI generation. Human approval stays required.

### Phase B — Attempt Detail Pages

Goal: history should be reviewable, not just counted.

Tasks:

1. Add Reading attempt detail route: Done.
   - route idea: `/reading/history/:id`
   - show passage title, score, time, question-type breakdown, wrong/unanswered list, explanation if available.
2. Add Listening attempt detail route: Done.
   - route idea: `/listening/history/:id`
   - show section, mode, score, missed words, transcript/dictation comparison.
3. Make Dashboard input follow-up card link to the relevant attempt when possible, not only to module root: Done.
4. Add "Review mistakes" CTA that sends missed items to Review if not already present: Detail pages now expose Review CTAs; original submit flows already create Review items.
5. Ensure local fallback records still render detail pages where possible.

Acceptance:

- A learner can click an old weak attempt and know exactly what went wrong.
- Dashboard follow-up feels specific, not generic.

### Phase C — Admin Retention Analytics

Goal: owner can see whether users are forming a habit and where they drop.

Tasks:

1. Extend `/auth/admin/stats` with: Done.
   - active users by practice attempts, not just AI calls.
   - 1-day, 3-day, 7-day retention proxies.
   - users with first practice but no second practice.
   - users with practice but no review completion.
2. Include reading/listening history in active-user metrics: Done.
3. Add Admin UI cards: Done.
   - New users who did first practice.
   - Users stuck before review loop.
   - Users with repeated low input scores.
4. Add an export-friendly table for follow-up: Done for repeated low input users.

Acceptance:

- Admin can identify activation drop-off without reading database manually.

### Phase D — New User Activation Path

Goal: first 10 minutes should produce one meaningful loop.

Tasks:

1. Add a guided first-session path:
   - set goal
   - choose first module
   - finish one attempt
   - see weakness
   - add/clear one review item
2. Make onboarding modal less feature-list-like and more action-oriented.
3. Add first-session completion signal on Dashboard.
4. Add trial activation messaging after the first successful AI feedback or first review loop, not only on pricing/login.

Acceptance:

- A brand-new user can reach a meaningful "I know what to do next" moment in one session.

### Phase E — QA And Ops Hardening

Goal: reduce hand-operated VPS fixes and catch regressions earlier.

Tasks:

1. Add a deploy health endpoint or enrich existing health check with:
   - commit hash
   - DB open status
   - env presence flags, without exposing secrets
2. Update `deploy/auto-deploy.sh` to log commit before/after and health result clearly.
3. Add a simple smoke script:
   - frontend build
   - content validation
   - backend syntax checks
   - maybe API health check if server is running
4. Document one-command VPS diagnosis in `CLAUDE.md` or a small deploy runbook.
5. Confirm backup cron and test that a `.gz` backup is created.

Acceptance:

- If deploy breaks, the next agent can diagnose from logs and one command set.

## Recommended Work Order For Claude Code

1. Start with `git status --branch --short`.
2. Read `CLAUDE.md`, `AI-OPS/OPTIMIZATION_TASKS.md`, this handoff, and relevant page/server files.
3. Do Phase A content DB migration in a small, reversible slice:
   - schema + read APIs + fallback frontend loading.
4. Build and syntax-check.
5. Commit and push.
6. Then do Phase B attempt detail pages.
7. Build and syntax-check again.
8. Commit and push.
9. Only after code is stable, handle VPS cron verification if the user is available to run commands.

## Coding Guardrails

- Do not revert unrelated user changes.
- Use existing Vue/Express patterns.
- Keep AI-generated content draft-only; never direct publish without admin approval.
- For server schema additions, make them `CREATE TABLE IF NOT EXISTS`.
- For practice data, keep localStorage fallback until production server history is proven stable.
- Run `npm run build` after frontend changes.
- Run `npm run content:validate` after content-bank changes.
- Run `node --check` for touched backend files.
