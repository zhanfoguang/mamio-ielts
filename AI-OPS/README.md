# Mamio AI Ops

这套目录是 Mamio 的轻量项目总管层。

它不替代代码，也不替代人做判断。它的作用是把每次开发从“想到哪做到哪”压成稳定流程：先判断价值，再写清楚规格，再开发，再审核，再验证线上。

## How To Use

每个新需求按这个顺序走：

1. 用 `PRODUCT_MANAGER.md` 判断这件事值不值得做，属于哪一级优先级。
2. 用 `FEATURE_SPEC_TEMPLATE.md` 写一份功能规格，明确目标、用户、验收标准和不做什么。
3. 开发时参考 `CODE_REVIEWER.md`，提前避开安全、数据、部署和体验风险。
4. 完成后按 `QA_CHECKLIST.md` 验证本地、构建、接口和 VPS 线上结果。
5. 对齐 `ROADMAP.md`，决定下一轮抓什么。

## Handoff

如果是 Claude 或其他 AI 接手，先读 `HANDOFF_FOR_CLAUDE.md`，再继续开发。

## Current Tooling Direction

- 产品经理层：借鉴 GitHub Spec Kit 和 PM Skills，但先用轻量文档落地。
- 审核层：后续优先接 Gito 作为 GitHub PR 审核门禁。
- 总管层：借鉴多角色编排项目的角色拆法，但暂时不引入重型自动编排。

## Operating Rule

任何功能都要先回答三件事：

1. 它解决哪个真实学习问题？
2. 它会让用户更愿意持续练，还是只是看起来功能更多？
3. 它上线后如何验证有效？
