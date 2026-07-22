# AGENTS.md

微信公众号 AI 写作工作流项目。用户是导演，AI 是编剧。

## 核心指令

**必须先读 `CLAUDE.md`** — 包含完整写作工作流、技能速查表、目录规范。本文件仅补充 CLAUDE.md 未覆盖的 OpenCode 特定事项。

## 目录结构

| 目录 | 用途 |
|------|------|
| `00-草稿/` | 正在写的文章，每个选题一个子目录 |
| `01-文章/` | 已发布归档，命名 `YYYYMMDD_标题简称/` |
| `02-资源/` | 写作风格文件、素材库、选题库、信息源 |
| `03-工具/` | 自建网页工具 |
| `.agents/skills/` | 已安装的技能（10 个） |

## 技能系统

技能安装在 `.agents/skills/<name>/`，每个含 `SKILL.md`（操作指引）+ `scripts/`（TypeScript，用 `bun run` 执行）。

调用方式：
- `/<skill-name>` 原生调用
- `bun run .agents/skills/<name>/scripts/main.ts --args` 直接执行

已安装技能：`baoyu-article-illustrator`, `baoyu-compress-image`, `baoyu-cover-image`, `baoyu-format-markdown`, `baoyu-image-gen`, `baoyu-markdown-to-html`, `baoyu-post-to-wechat`, `baoyu-translate`, `humanizer-zh`, `xhs-auto-creator`

技能版本锁定在 `skills-lock.json`。

## 环境配置

- API 密钥放在 `.baoyu-skills/.env`（已 gitignore）
- 需要的密钥：`GOOGLE_API_KEY`（Gemini 生图）、`OPENAI_API_KEY`、`DASHSCOPE_API_KEY`、`JIMENG_API_KEY`、`ARK_API_KEY`、`REPLICATE_API_TOKEN`、`OPENROUTER_API_KEY`
- 微信发布需要：`WECHAT_APP_ID` + `WECHAT_APP_SECRET`

## 注意事项

- 无构建系统、无测试、无 lint — 这是内容工作流项目，不是代码项目
- 写作风格文件在 `02-资源/写作风格.md`（观点原创）和 `02-资源/播客现场重播员-写作风格.md`（访谈重播）
- 归档时需将 article.md 中图片路径统一替换为 `images/`
- `humanizer-zh` 仅用于观点原创型文章，访谈重播型跳过
