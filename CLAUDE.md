默认使用中文回复我。

## 运行环境

项目依赖以下运行时和凭据：

| 依赖 | 用途 | 备注 |
|------|------|------|
| **Bun** | 执行所有 TypeScript 技能脚本（`.ts`） | 每个技能目录有独立的 `package.json`，但脚本通过 `bun` 直接执行，无需编译 |
| **Chrome** | `baoyu-post-to-wechat` 浏览器发布方式 | 通过 Chrome DevTools Protocol 自动化操作公众号后台 |
| **API 密钥** | `baoyu-image-gen` 调用生图 API | 统一放入 `.baoyu-skills/.env`（已 gitignore） |
| **微信凭证** | `baoyu-post-to-wechat` API 发布方式 | `WECHAT_APP_ID` + `WECHAT_APP_SECRET` |

`skills-lock.json` 锁定技能版本来源（jimliu/baoyu-skills 和 op7418/humanizer-zh 的 git hash），安装或更新技能后自动更新此文件。

### 图片生成 API 密钥

往 `.baoyu-skills/.env` 写入所需的密钥（选配，用的到才配）：

| 提供商 | 环境变量 | 获取地址 |
|--------|---------|---------|
| Google Gemini | `GOOGLE_API_KEY` | [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) |
| OpenAI | `OPENAI_API_KEY` | platform.openai.com |
| DashScope（通义万象） | `DASHSCOPE_API_KEY` | dashscope.aliyun.com |
| Jimeng（即梦） | `JIMENG_API_KEY` | jimeng.jianying.com |
| Seedream（豆包/火山引擎） | `ARK_API_KEY` | console.volcengine.com |
| Replicate | `REPLICATE_API_TOKEN` | replicate.com |
| OpenRouter | `OPENROUTER_API_KEY` | openrouter.ai |

## 技能架构说明

所有技能安装在 `.agents/skills/<技能名>/` 目录下，每个技能目录包含：

| 文件 | 用途 |
|------|------|
| `SKILL.md` | **AI 读的操作指引** — 如何调用该技能、有哪些参数、工作流步骤 |
| `scripts/` | TypeScript 脚本，通过 `bun run <脚本路径>` 执行 |
| `package.json` | 脚本的依赖声明（bun 自动安装） |

偏好配置可选：`.baoyu-skills/<技能名>/EXTEND.md`（项目级）或 `~/.config/baoyu-skills/<技能名>/EXTEND.md`（用户级），技能会按优先级加载。

技能通过两种方式调用：
1. **Claude Code 原生**：`/<skill-name>`（如 `/baoyu-format-markdown`）
2. **直接跑脚本**：`bun run .agents/skills/<技能名>/scripts/main.ts --args`

## 写作资源（长期维护）

| 文章类型 | 风格文件 | 触发信号 |
|---------|---------|---------|
| 观点原创 | `02-资源/写作风格.md` | 给了链接/素材/选题，让我写观点文章 |
| 访谈重播 | `02-资源/播客现场重播员-写作风格.md` | 给了字幕文件/播客链接/访谈视频 |

- 个人素材库：`02-资源/素材库.md`（写文章时搜真实素材；**每写完一篇提炼一条**追加进去）
- 选题库：`02-资源/选题库.md`（写作全过程保持状态同步）
- 信息源：`02-资源/信息源.md`

## 技能速查表

| 技能 | 类型 | 什么时候用 |
|------|------|-----------|
| `baoyu-cover-image` | 纯提示词 | 需要封面图提示词 + 图片 |
| `baoyu-article-illustrator` | TS 脚本 → bun | 文章写好了，需要分析配图位置、生成文内图提示词 |
| `baoyu-image-gen` | TS 脚本 → bun | 需要批量生图（支持 7 个提供商、参考图、比例控制、并发批处理） |
| `baoyu-format-markdown` | TS 脚本 → bun | 需要格式化排版（标题层级、分段、加粗、CJK 间距修正） |
| `humanizer-zh` | 纯提示词 | 观点原创型文章写完后去 AI 味（访谈重播跳过） |
| `baoyu-markdown-to-html` | TS 脚本 → bun | 需要转公众号兼容 HTML（支持 default/grace/simple/modern 四种主题） |
| `baoyu-post-to-wechat` | TS 脚本 → bun | 发布到公众号草稿箱（优先 API；浏览器方式备用需先问户） |
| `baoyu-translate` | TS 脚本 → bun | 需要翻译文章（快速/普通/精翻三种模式） |
| `baoyu-compress-image` | TS 脚本 → bun | 需要压缩图片（WebP/PNG/JPEG） |
| `xhs-auto-creator` | 编排器（调用其他技能）| 需要创作小红书图文笔记 |

## 写作工作流

用户是导演，AI 是编剧。用户负责"讲什么"，AI 负责"怎么写"。

1. **写稿**：
   - 根据输入素材判断文章类型（字幕/访谈 → 访谈重播；其他 → 观点原创）
   - 按对应风格文件产出初稿，草稿存放在 `00-草稿/{选题名}/` 目录
   - 用户自行删改到满意后，进入后续步骤
2. **配图**：用 `baoyu-cover-image` + `baoyu-article-illustrator` 生成封面 + 文内配图提示词，统一写入 `image-prompts.md`；图片放 `images/` 目录。可选自动生图（`baoyu-image-gen`）或用户手动到 Gemini 生图
3. **格式化**：用 `baoyu-format-markdown` 补标题层级、分段和必要的强调
4. **去 AI 味**：
   - 观点原创型：用 `humanizer-zh` 过一遍，压掉太书面、太满、太客气的表达
   - 访谈重播型：跳过（此类型本身已有强风格约束）
5. **转 HTML**：用 `baoyu-markdown-to-html` 将 Markdown 转成公众号兼容的 HTML（内置多种排版主题）
6. **发布**：用 `baoyu-post-to-wechat` 将文章发布到公众号「草稿箱」（优先 API；浏览器方式备用，需先询问用户），发布后在后台确认封面图、摘要与图片展示无误
7. **归档**：将草稿产物移入 `01-文章/YYYYMMDD_标题简称/`，清理草稿目录
   - 目录命名：`YYYYMMDD_标题关键词`（日期 + 2-6 个字的标题简称）
   - 归档结构：
     ```
     01-文章/YYYYMMDD_标题简称/
     ├── article.md          ← 配图版终稿，图片路径统一改为 images/
     ├── article.html        ← 公众号 HTML
     ├── image-prompts.md    ← 合并所有提示词（封面 + 文内图）
     └── images/             ← 封面图 + 所有文内配图
     ```
   - 路径修正：归档时将 article.md 中的图片路径统一替换为 `images/`
   - 清理草稿：归档确认后删除 `00-草稿/` 中对应的所有草稿文件和临时目录
   - 更新选题库：在 `02-资源/选题库.md` 中将选题移至对应状态分区，更新总览表
   - 更新素材库：从刚归档的文章中提炼一条可复用的素材或洞察，追加到 `02-资源/素材库.md`

## 网页工具

当用户说"创建某某工具"时，默认按这个方式来建：

- 目录：`03-工具/网页工具/<工具名>/index.html`（单工具一个目录）
- 技术栈：尽量纯 HTML（内联 CSS + JS），不引入构建与依赖
- 索引：新增工具后同步更新 `03-工具/网页工具/README.md`
