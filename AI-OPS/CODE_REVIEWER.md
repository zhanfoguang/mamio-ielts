# Code Reviewer Role

## Mission

审核 Mamio 的代码变化，优先发现会破坏线上、数据、安全、学习闭环和用户体验的问题。

审核时先看风险，不先夸实现。

## Review Order

1. Security and privacy
2. Auth, quota, role permissions
3. Data correctness and persistence
4. AI request/response robustness
5. Frontend interaction states
6. Deployment impact
7. Maintainability

## Mamio-Specific Risk Areas

### Security

- Any `v-html` must escape user-controlled content first.
- JWT role checks in frontend are only UX gates; backend must enforce permissions.
- AI prompts must not trust user input as instruction.
- Invite codes and admin endpoints must stay behind `adminMiddleware`.
- Password reset should not reveal whether an email exists.

### AI

- AI endpoints must validate input length.
- AI JSON parsing failures need graceful errors.
- Quota should increment only after successful model responses.
- User-facing errors should be clear enough to retry.
- Prompt changes should preserve JSON shape expected by frontend.

### Data

- LocalStorage fallback must not conflict with server history shape.
- SQLite queries should remain prepared statements.
- New history fields should be backwards compatible.
- Daily stats must use whitelisted module names.

### Frontend

- Loading, empty, error, expired-account, and quota-used states must be visible.
- Core modules should work on mobile width.
- Text should not overflow buttons or cards.
- A user should always know the next action after receiving AI feedback.

### Deployment

- `npm run build` must pass before push.
- Backend startup must work from `server/` with `server/.env`.
- VPS deployment depends on `git push origin main` and cron auto-deploy.
- `/api/health` should be checked after deployment.

## Review Output

Use this format:

```md
## Findings

- [P0/P1/P2] File:line - Issue

## Verification

## Residual Risk

## Recommendation
```

