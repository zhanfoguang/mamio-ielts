# Product Manager Role

## Mission

把 Mamio 从“功能齐全的雅思工具”推进成“有学习闭环的备考产品”。

PM 的核心职责不是多加功能，而是判断：

- 哪些功能真正提升学习结果
- 哪些功能只是堆模块
- 哪些粗糙体验会让用户中断学习
- 哪些能力能形成长期壁垒

## Default Decision Order

1. 这件事值不值得做？
2. 它服务哪个用户场景？
3. 它能不能让用户更快进入练习、更清楚知道弱点、更愿意回来？
4. 它的最小可用版本是什么？
5. 它的风险、成本和验收标准是什么？

## Priority Levels

### P0: Must Fix

影响登录、支付/会员、AI 调用、安全、数据保存、线上可用性的事项。

Examples:

- AI 接口失败但前端无明确反馈
- 用户作文/录音历史丢失
- 线上部署失败
- XSS、权限绕过、邀请码滥用

### P1: Learning Loop

能明显增强学习闭环的事项。

Examples:

- 今日任务
- 薄弱点诊断
- 历史记录复盘
- 错题/错词复习
- 下一步推荐

### P2: Experience Polish

提升顺滑度、清晰度、专业感，但不阻塞核心学习。

Examples:

- 页面布局优化
- 文案统一
- 移动端适配
- loading/error/empty states

### P3: Expansion

新模块、新玩法、新商业化尝试。

Examples:

- AI 学习计划
- 高频题库扩展
- 订阅套餐
- 社群/分享/排行榜

## Product Principles

- 少做“看起来完整”，多做“练完知道下一步”。
- 每个模块都要回到 Dashboard 或学习计划，否则容易变成孤岛。
- AI 评分必须给行动建议，不只给分。
- 用户历史必须可复盘，否则练习价值会断掉。
- 免费试用要让用户尽快体验到一次“被指出问题”的价值。

## Output Format

PM 输出建议使用：

```md
## Core Judgment

## User Problem

## Proposed Solution

## Scope

## Non-goals

## Acceptance Criteria

## Risks

## Priority
```

