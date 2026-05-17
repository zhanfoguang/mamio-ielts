# Dashboard Next Action Recommendations

## Title

Dashboard 下一步学习推荐

## Core Judgment

Mamio 已经覆盖听说读写词汇，但首页目前更像统计页。这个功能要把 Dashboard 推成学习指挥台：用户打开后先知道今天最该做什么，而不是自己从模块列表里猜。

## User Problem

雅思自学用户容易卡在两个问题：

- 不知道今天先练哪个模块
- 练完一次后不知道下一步怎么补弱点

## Target User

Band 5.5-6.5 的 IELTS 自学用户，已经愿意用 AI 评分，但需要更明确的每日练习路径。

## Current Behavior

Dashboard 展示今日次数、热力图、模块统计、分数趋势和一条简单推荐。

推荐逻辑较粗：

- 首次使用推荐口语
- 低分时推荐对应模块
- 词汇量低时推荐词汇

## Proposed Behavior

Dashboard 显示一个“今日学习计划”：

- 1 个主任务
- 1 个复习任务
- 1 个弱点提示
- 2-3 个小任务

第一版使用本地规则引擎，不新增数据库。

## Scope

Included:

- 从现有 speaking/writing/listening/reading/vocab/daily stats 生成推荐
- 显示主任务、复习任务、弱点提示和任务 chips
- 点击主任务跳转对应模块
- 中英文文案
- 移动端不溢出

Excluded:

- 不新增 `review_items` 表
- 不改 AI prompt
- 不做个性化目标分数配置
- 不做付费转化

## User Flow

1. 用户登录后进入 Dashboard。
2. 系统根据练习历史和今日进度生成今日学习计划。
3. 用户点击主任务进入对应模块开始练习。
4. 练习后回到 Dashboard，计划根据新数据更新。

## Data Model / API Impact

Tables: none

Endpoints: existing `/api/progress/dashboard`

LocalStorage:

- `mamio-vocab-srs`
- `mamio-vocab-daily`
- existing module histories

## AI Impact

Prompts: none

Expected JSON: none

Quota behavior: none

Failure behavior: if API fails, recommendation uses localStorage fallback.

## UI States

- Loading: existing Dashboard load behavior
- Empty: first-time user receives starter plan
- Error: localStorage fallback
- Success: personalized plan
- Quota used: not handled in v1
- Expired account: not handled in v1

## Acceptance Criteria

- New user sees a starter plan with Speaking Part 1 as primary action.
- If writing is under-practiced relative to speaking, Dashboard recommends writing.
- If due vocab reviews exist, Dashboard surfaces a review task.
- If speaking or writing average is below 6.0, Dashboard highlights the weak area.
- Build passes.

## QA Plan

- Run `npm run build`.
- Open local Dashboard.
- Verify first-user state.
- Verify plan renders without console errors.
- Verify main recommendation click navigates to a module.

## Rollout / Deployment

No database migration. No VPS-specific change needed until product code is ready to deploy.

## Risks

- Rule-based recommendations may feel generic until AI feedback is structured.
- Existing localStorage history shapes are inconsistent.
- Vocab due count is approximate because server SRS data is not yet connected to Dashboard.

## Open Questions

- Should users set target band and exam date?
- Should paid/trial users get different daily goals?

