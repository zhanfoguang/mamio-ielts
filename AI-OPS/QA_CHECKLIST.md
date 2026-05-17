# QA Checklist

Use this before considering a change ready for VPS deployment.

## Local Build

- `npm run build`
- `cd server && node --check index.js`
- `cd server && node index.js`
- `curl http://127.0.0.1:3000/api/health`

## Auth

- Register a test user locally.
- Login redirects to `/dashboard`.
- Protected routes redirect to `/login` without token.
- Admin page is unavailable to non-admin users.
- Expired/trial/paid/admin labels render correctly.

## Core Pages

- Dashboard loads stats without console errors.
- Speaking page loads topics and can save local/server history.
- Writing page loads prompts, drafts autosave, history renders correctly.
- Writing comparison does not render user HTML as DOM.
- Listening page plays TTS where browser supports it.
- Reading page can submit answers and save daily stats.
- Vocabulary page loads SRS data and can update reviews.
- Mock exam loads without blocking navigation.

## API

- `/api/health` returns `status: ok`.
- AI endpoints reject missing required fields.
- AI endpoints reject oversized input.
- Progress endpoints require auth.
- Admin endpoints require admin role.

## VPS Smoke Test

After push and deploy window:

- `curl -I http://47.88.87.116:8080`
- `curl http://47.88.87.116:8080/api/health`
- Open live site and confirm latest UI bundle is served.
- Check one authenticated page with a real or test account if available.

## Stop Criteria

Do not deploy if:

- Build fails.
- Backend cannot start.
- Any auth or admin route behaves incorrectly.
- User-controlled HTML can execute.
- A migration risks the live SQLite database without backup.

