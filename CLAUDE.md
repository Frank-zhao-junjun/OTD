# CLAUDE.md — 编码行为契约

> 基于 Karpathy 4 条核心军规 + OTD 项目 4 条扩展。完整项目上下文见 [AGENTS.md](./AGENTS.md)。

## 核心 4 条（Karpathy）

1. **先想再写** — 列出假设与不确定点；SAP 字段/OData 版本/鉴权边界不清楚时先问，禁止猜接口或字段名。
2. **极简优先** — 只写解决当前需求的最少代码；不加推测性抽象、配置项或未请求的「顺手优化」。
3. **手术式修改** — 只动任务要求的文件与逻辑；匹配现有命名与风格；不顺手重构相邻代码。
4. **目标驱动** — 改前先定义成功标准（如「加载更多不丢数据」「API 失败返回 503 且前端可见」）；验证通过再停。

## OTD 扩展 4 条

5. **先读再写** — 改函数/hook/API 前读调用方与同类页面；列表页优先复用 `useDebouncedValue`、`useFilterPageFetch`、Fiori 组件。
6. **约定优于创新** — V2 用 `$format=json` + `d.results`；V4 用 Accept header + `value`；分页用 top/skip；UI 遵循 Fiori 3（见 DESIGN.md）。
7. **失败必须可见** — API route 的 catch 禁止假成功（`success: true`）；前端展示错误态；禁止静默吞错。
8. **测试验行为** — 测试须覆盖真实场景（分页追加、debounce、鉴权拦截），禁止只断言元素存在的假绿测试。

## 本项目高频禁区

| 禁止 | 正确做法 |
|------|----------|
| 服务端 HTTP 自调用 `localhost` | 用 `src/lib/sap-direct-fetch.ts` 直连 SAP |
| `useCallback` 漏依赖（如 `page`） | 加载更多/state 变更时检查依赖数组 |
| 搜索后 `setData` 覆盖已追加数据 | append 模式与首次加载分开处理 |
| 提交 `.env.local`、凭证、JWT_SECRET | 只改 `.env.local.example` |
| 用 npm/yarn | 仅用 `pnpm`；Windows 开发用 `pnpm dev:win` |
| middleware 误拦或漏拦 API | 仅 `/api/auth/*` 公开；业务 API 需 JWT |

## 改完自检（提交前）

- [ ] `pnpm validate` 或至少 `pnpm ts-check` 通过
- [ ] 涉及列表页：首屏 + 加载更多 + 搜索 debounce 手动过一遍
- [ ] 涉及 API：Mock 与真实 SAP 路径/响应格式均考虑过
- [ ] 改动范围与任务一致，无无关文件

## 长任务约定

多文件/跨模块改动：每完成一步简短汇报「已完成 / 已验证 / 待做」；同一 bug 连续两次修复失败则换思路或停下来说明阻塞点，禁止空转调试。
