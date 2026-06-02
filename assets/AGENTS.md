# ES+OTD 助手 — Agent 约定

## 必用技能（每次开发任务）

在写代码或改行为之前，按顺序考虑并 **Read 对应 SKILL.md**：

| 阶段 | 技能 | 路径 |
|------|------|------|
| 创意 / 新功能 / 改行为 | **brainstorming** | `.agents/skills/brainstorming/SKILL.md` |
| 写码 / 重构 / 修 bug | **karpathy-guidelines** | `.agents/skills/karpathy-guidelines/SKILL.md` |
| 工作流总览 | **superpowers** | `.agents/skills/superpowers/SKILL.md` |
| 浏览器 QA / 验收 | **gstack** | `.agents/skills/gstack-package/SKILL.md` → `gstack/qa`, `gstack/browse` |

- **brainstorming**：先探索需求、给出 2–3 种方案、设计获批后再实现（HARD-GATE）。
- **karpathy-guidelines**：最小改动、不臆测需求、可验证的成功标准。
- **superpowers**：含 `using-superpowers`、`writing-plans`、TDD、调试、完成前验证等子技能。
- **gstack**：无头 Chromium QA（`/qa`）、浏览截图（`/browse`）、发版（`/ship`）等 50+ 子技能；包目录 `.agents/skills/gstack/`，`~/.claude/skills/gstack` 已链接。

## 技能索引

- 项目全量：`.agents/SKILL-INDEX.md`
- 本地精选：`D:\AI\SKILL\skill-index.md` / `skill-index.json`

## 项目上下文

- 工作区：`d:\ES+OTD助手`
- 后端：`backend/`（Python / SAP OData）
- UI 演示：`ui-demo/`
