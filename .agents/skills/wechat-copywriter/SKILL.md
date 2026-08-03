---
name: wechat-copywriter
description: |
  公众号仿写技能 - 从博客链接到可发布的公众号图文。
  自动抓取博客内容和图片，补充官网权威资料，融合两者按指定风格重写原创文章。
  支持9种文风：生动科普、技术干货、深度分析、纪实叙事、治愈温柔、观点鲜明、轻松有趣、口语唠嗑、玩梗沙雕。
  可选自动发布到公众号草稿箱，支持交互式确认。
  当用户提到"仿写"、"参考这篇博客"、"改写成公众号"、"copywrite + URL"、"抓取链接写文章"时使用。
metadata:
  author: sisyphus
  version: "1.0.0"
  dependencies:
    - baoyu-url-to-markdown
    - baoyu-markdown-to-html
    - baoyu-post-to-wechat
    - humanizer-zh
    - baoyu-compress-image
    - baoyu-cover-image
    - baoyu-image-gen
---

# 公众号仿写技能 (wechat-copywriter)

从博客链接到可发布的公众号图文，一键完成抓取、补充、重写、排版。

## 工作流全景

```
用户输入: "仿写 https://xxx.blog"
  │
  ├─ Step 0: 参数解析 → 提取 URL、交互式选择风格、确定输出目录
  ├─ Step 1: 抓取博客 → baoyu-url-to-markdown (内容 + 图片)
  ├─ Step 2: 识别关键概念 → 提取核心术语、产品名、技术点
  ├─ Step 3: 补充资料 → 搜索官网、交叉校验、补充权威信息
  ├─ Step 4: 重写文章 → 融合两源内容，按指定风格创作
  ├─ Step 5: 图片排版 → 封面图生成 + 引用原图 + 补充配图
  ├─ Step 6: 输出成品 → Markdown + 公众号兼容 HTML
  └─ Step 7: 发布草稿 → baoyu-post-to-wechat（API 优先）→ 确认发布
```

## 参数说明

| 调用方式 | 示例 |
|---------|------|
| 基础调用 | `/wechat-copywriter https://xxx.blog` |
| 指定风格 | `/wechat-copywriter https://xxx.blog --style 生动科普` |
| 指定目录 | `/wechat-copywriter https://xxx.blog --output ./my-draft/` |
| 直接发布 | `/wechat-copywriter https://xxx.blog --publish` |
| 仅生成 | `/wechat-copywriter https://xxx.blog --dry-run` |
| 全参数 | `/wechat-copywriter https://xxx.blog --style 技术干货 --output ./draft/ --no-images --publish` |

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<url>` | 博客链接（必填） | - |
| `--style <风格>` | 指定文风 | `生动科普` |
| `--output <目录>` | 输出目录 | `00-草稿/{YYYYMMDD_标题简称}/` |
| `--no-images` | 不下载图片 | `false` |
| `--no-humanize` | 跳过去 AI 味 | `false` |
| `--publish` | 跳过确认直接发布到草稿箱 | `false` |
| `--dry-run` | 仅生成不发布 | `false` |

## Step 0: 参数解析与风格选择

### 0.1 解析用户输入

从用户消息中提取以下信息：

| 输入来源 | 提取方式 |
|---------|---------|
| `--style <风格>` | 取 `--style` 后面的风格名称 |
| `--output <目录>` | 取 `--output` 后面的目录路径 |
| `--publish` | 标记为直接发布模式 |
| `--dry-run` | 标记为仅生成模式 |
| 位置参数 | 提取 URL（第一个 http/https 开头的字符串） |

### 0.2 交互式风格选择

**当用户未指定 `--style` 参数时**，必须交互式询问用户选择风格：

使用 `AskUserQuestion` 工具询问用户：

```
请选择文章风格：
```

选项列表（按推荐顺序）：

| 序号 | 风格 | 说明 |
|------|------|------|
| 1 | 生动科普（推荐） | 活泼形象，故事化开头，适合技术概念解释 |
| 2 | 技术干货 | 专业精炼，问题→方案→步骤，适合教程 |
| 3 | 深度分析 | 理性客观，现象→原因→趋势，适合行业分析 |
| 4 | 纪实叙事 | 温暖真实，时间线推进，适合人物故事 |
| 5 | 治愈温柔 | 柔和共情，场景→感受→治愈，适合情感类 |
| 6 | 观点鲜明 | 锐利直接，观点→论据→呼吁，适合评论 |
| 7 | 轻松有趣 | 幽默轻松，段子→知识点，适合娱乐科普 |
| 8 | 口语唠嗑 | 随意亲切，闲聊→吐槽→分享，适合日常分享 |
| 9 | 玩梗沙雕 | 搞笑玩梗，梗→知识→梗，适合年轻受众 |

**默认选择**：第 1 项「生动科普」

**实现逻辑**：
```python
if "--style" not in user_input:
    style = ask_user_question(
        header="文章风格",
        question="请选择文章风格：",
        options=[
            {"label": "生动科普（推荐）", "description": "活泼形象，故事化开头，适合技术概念解释"},
            {"label": "技术干货", "description": "专业精炼，问题→方案→步骤，适合教程"},
            {"label": "深度分析", "description": "理性客观，现象→原因→趋势，适合行业分析"},
            {"label": "纪实叙事", "description": "温暖真实，时间线推进，适合人物故事"},
            {"label": "治愈温柔", "description": "柔和共情，场景→感受→治愈，适合情感类"},
            {"label": "观点鲜明", "description": "锐利直接，观点→论据→呼吁，适合评论"},
            {"label": "轻松有趣", "description": "幽默轻松，段子→知识点，适合娱乐科普"},
            {"label": "口语唠嗑", "description": "随意亲切，闲聊→吐槽→分享，适合日常分享"},
            {"label": "玩梗沙雕", "description": "搞笑玩梗，梗→知识→梗，适合年轻受众"}
        ],
        default="生动科普（推荐）"
    )
else:
    style = extract_style_from_input(user_input)
```

### 0.3 生成输出目录名称

根据抓取的博客内容生成目录名称：

**命名规则**：`{YYYYMMDD_标题简称}`
- `YYYYMMDD`：当天日期，如 `20260802`
- `标题简称`：从博客标题提取 2-6 个关键词（中文）

**生成逻辑**：
1. 抓取博客后，获取页面标题
2. 从标题中提取核心关键词（2-6 个字）
3. 组合为目录名：`20260802_DeepSeek安装配置`

**示例**：
| 博客标题 | 生成的目录名 |
|---------|-------------|
| Codex Deepseek 配置 — 通过 CC Switch 中转 | `20260802_DeepSeek安装配置` |
| React 18 新特性详解 | `20260802_React18新特性` |
| 如何用 Python 爬取网页数据 | `20260802_Python爬取网页` |

### 0.4 参数解析完成

解析完成后，输出确认信息：

```
📋 参数解析完成

URL: https://xxx.blog
风格: 生动科普
输出目录: 00-草稿/20260802_DeepSeek安装配置/
发布模式: 询问确认

开始执行...
```

## Step 1: 抓取博客

使用 `baoyu-url-to-markdown` 抓取博客内容和图片：

```bash
# 解析 baoyu-url-to-markdown 的路径
BAOYU_FETCH=".agents/skills/baoyu-url-to-markdown/scripts/baoyu-fetch"

# 抓取内容 + 下载图片
$BAOYU_FETCH <url> --output 00-草稿/{YYYYMMDD_标题简称}/original/article.md --download-media
```

**输出**：
- `00-草稿/{YYYYMMDD_标题简称}/original/article.md` — 博客 Markdown 内容
- `00-草稿/{YYYYMMDD_标题简称}/original/images/` — 下载的图片目录

**质量检查**：抓取后检查内容完整性，如发现内容缺失或质量差，尝试使用 `--wait-for interaction` 模式重试。

## Step 2: 识别关键概念

从抓取的博客内容中提取：

1. **核心概念**：文章讨论的主要技术/产品/理论
2. **产品名称**：涉及的具体产品、工具、服务
3. **技术术语**：专业术语、缩写、新概念
4. **数据引用**：文章中引用的数据、统计、研究

**输出格式**（写入 `00-草稿/{YYYYMMDD_标题简称}/concepts.md`）：

```markdown
# 关键概念提取

## 核心概念
- [概念1]：简要说明
- [概念2]：简要说明

## 涉及产品
- [产品名]：官网 URL（如果能识别）

## 技术术语
- [术语1]：解释
- [术语2]：解释

## 需要补充的信息
- [ ] 关于 XX 的官方定义
- [ ] 关于 YY 的最新数据
```

## Step 3: 补充资料

针对 Step 2 识别的关键概念，自动搜索补充资料：

1. **搜索官网**：找到相关产品的官方网站
2. **交叉校验**：对比博客内容与官方描述，标记差异
3. **补充权威信息**：从官网提取官方定义、特性说明、数据

**搜索策略**：
- 产品名 + "official site"
- 概念名 + "definition" / "是什么"
- 技术术语 + "documentation"

**输出**：写入 `00-草稿/{YYYYMMDD_标题简称}/sources.md`

```markdown
# 参考资料来源

## 博客原文
- 来源：[博客标题](原始URL)
- 抓取时间：YYYY-MM-DD

## 补充资料
### [概念1]
- 官网：https://xxx.com
- 官方定义：...
- 与博客对比：[一致/有差异] - 差异说明

### [概念2]
- 官网：https://yyy.com
- 官方定义：...
```

## Step 4: 重写文章

融合博客内容和官网资料，按指定风格重写原创文章。

### 4.1 读取风格规范

根据 `--style` 参数，读取对应的风格规范文件：

| 风格 | 规范文件 |
|------|---------|
| 生动科普 | `references/styles/sheng-dong-ke-pu.md` |
| 技术干货 | `references/styles/ji-shu-gan-huo.md` |
| 深度分析 | `references/styles/shen-du-fen-xi.md` |
| 纪实叙事 | `references/styles/ji-shi-xu-shi.md` |
| 治愈温柔 | `references/styles/zhi-yu-wen-rou.md` |
| 观点鲜明 | `references/styles/guan-dian-xian-ming.md` |
| 轻松有趣 | `references/styles/qing-song-you-qu.md` |
| 口语唠嗑 | `references/styles/kou-yu-lao-ka.md` |
| 玩梗沙雕 | `references/styles/wan-geng-sha-diao.md` |

### 4.2 融合重写

**融合原则**：
- **主线逻辑**：保持博客的核心论点和逻辑框架
- **信息增强**：用官网权威信息补充/修正博客内容
- **原创表达**：用完全不同的表达方式重写，避免照搬原文句式
- **风格一致**：全文保持指定风格的语气和结构

**重写检查清单**：
- [ ] 核心观点是否保留
- [ ] 信息是否准确（与官网一致）
- [ ] 是否有原创表达（非照搬原文）
- [ ] 风格是否统一
- [ ] 图片引用是否正确

### 4.3 去 AI 味（可选）

如果未指定 `--no-humanize`，调用 `humanizer-zh` 处理：

```bash
# 使用 humanizer-zh 去除 AI 写作痕迹
# 读取 article.md，去除夸大象征意义、三段式法则、AI 词汇等
```

**注意**：纪实叙事、口语唠嗑、玩梗沙雕风格可能不需要去 AI 味，因为它们本身就偏口语化。

### 4.4 配图提示词（可选）

如需 AI 重新生成配图（而非使用原图），生成配图提示词到 `image-prompts.md`。

## Step 5: 图片排版

### 5.1 封面图生成（必须）

每篇文章都需要封面图。调用 `baoyu-cover-image` 技能，根据文章标题和核心观点生成封面图：

1. 分析文章标题和核心观点，确定封面图主题
2. 调用 `baoyu-cover-image` 生成封面（默认参数）：
   - `--type hero` — 视觉冲击力强
   - `--aspect 16:9` — 公众号封面比例
   - `--text title-only` — 标题文字叠加
   - `--lang zh` — 中文标题
   - `--quality normal` — 无需高清，节省生成时间
   - `--quick` — 跳过确认，使用自动选择
3. 封面图保存为 `00-草稿/{YYYYMMDD_标题简称}/images/cover.png`
4. 在 `article.md` frontmatter 中添加 `cover: images/cover.png`

```bash
# 生成封面图（由 baoyu-cover-image 内部调用 baoyu-image-gen 生图）
# 保存到 images/cover.png
```

### 5.2 封面图压缩（必须）

封面图生成后，**必须**调用 `baoyu-compress-image` 压缩，确保公众号上传不超限：

```bash
bun run .agents/skills/baoyu-compress-image/scripts/main.ts \
  00-草稿/{YYYYMMDD_标题简称}/images/cover.png
```

- 压缩后默认输出 WebP 格式（体积更小，公众号兼容）
- 如需保留 PNG 格式，追加 `-f png --keep`

### 5.3 引用原图

将 Step 1 下载的博客原图复制到 `images/` 目录，在 `article.md` 中引用：

```markdown
![图片描述](images/filename.jpg)
```

**图片来源优先级**：
1. 博客原图（Step 1 下载的 `original/images/`）— 默认使用
2. 补充生成的配图（Step 5.4 生成）— 原图不足时补充

### 5.4 文内配图补充（可选）

当原博客图片数量不足（少于 2 张）或缺少关键段落配图时，调用 AI 补充生成：

**触发条件**：
- 原博客图片 < 2 张
- 文章有 3 个以上主要段落但仅有 1 张配图

**执行流程**：
1. 调用 `baoyu-article-illustrator` 分析文章结构，识别需要配图的位置
2. 确定每张图的 Type × Style × Palette 三维度
3. 调用 `baoyu-image-gen` 批量生成补充配图（Provider 优先级：openai → dashscope → google）
4. 图片保存到 `images/` 目录，更新 `article.md` 中的图片引用

**要求**：
- 补充配图风格应与封面图保持一致（可用封面图作为 `--ref` 锚定风格）
- 文内配图使用 `--quality normal`，比例 `--ar 16:9` 或 `--ar 1:1`
- 至少生成 1 张补充配图

### 5.5 图片压缩（可选）

如需压缩文内图片（单张 > 500KB），调用 `baoyu-compress-image`：

```bash
bun run .agents/skills/baoyu-compress-image/scripts/main.ts \
  00-草稿/{YYYYMMDD_标题简称}/images/filename.jpg
```

## Step 6: 输出成品

### 6.1 转换 HTML

调用 `baoyu-markdown-to-html` 生成公众号兼容 HTML：

```bash
bun run .agents/skills/baoyu-markdown-to-html/scripts/main.ts \
  00-草稿/{YYYYMMDD_标题简称}/article.md \
  --theme modern \
  --keep-title
```

### 6.2 最终输出

**目录命名规则**：`{YYYYMMDD_标题简称}`
- `YYYYMMDD`：当天日期，如 `20260802`
- `标题简称`：从文章标题提取 2-6 个关键词，如 `Claude使用技巧`

示例：`20260802_Claude使用技巧`

```
00-草稿/{YYYYMMDD_标题简称}/
├── article.md              # Markdown 源文件
├── article.html            # 公众号兼容 HTML
├── images/                 # 图片目录
│   ├── cover.png           # 封面图（baoyu-cover-image 生成）
│   ├── image1.jpg          # 博客原图
│   └── image2.png          # 补充配图（如有）
├── original/               # 原始抓取内容（可删除）
│   ├── article.md
│   └── images/
├── sources.md              # 参考资料来源
└── concepts.md             # 关键概念提取
```

## Step 7: 发布到公众号草稿箱

### 7.1 发布前确认

在发布前，**必须**交互式询问用户是否确认发布：

```
文章已生成完毕！

标题：{文章标题}
风格：{指定风格}
目录：00-草稿/{YYYYMMDD_标题简称}/

是否发布到微信公众号草稿箱？
```

使用 `AskUserQuestion` 工具询问用户：
- **确认发布**：继续执行发布流程
- **修改文章**：返回 Step 4 修改文章内容
- **取消发布**：结束流程，保留本地文件

### 7.2 执行发布

用户确认后，**优先使用 API 方式**发布到公众号草稿箱。

**API 方式优先**：检测 `.baoyu-skills/.env` 中是否存在 `WECHAT_APP_ID` + `WECHAT_APP_SECRET`，有则直接走 API：

```bash
# API 方式（首选 — 无需打开浏览器，静默发布）
bun run .agents/skills/baoyu-post-to-wechat/scripts/wechat-api.ts \
  00-草稿/{YYYYMMDD_标题简称}/article.html \
  --theme modern
```

**浏览器备用**：API 不可用时（缺少凭证或 API 调用失败），告知用户，经同意后走浏览器方式：

```bash
# 浏览器方式（需手动操作，自动打开公众号后台）
bun run .agents/skills/baoyu-post-to-wechat/scripts/wechat-article.ts \
  --markdown 00-草稿/{YYYYMMDD_标题简称}/article.md \
  --theme modern
```

**自动发布模式**（`--publish`）：直接调用 API 发布，不打断确认。API 不可用时报错停止，不回退浏览器方式（避免意外打开浏览器）。

### 7.3 发布结果反馈

发布完成后，向用户反馈结果：

**成功**：
```
✅ 已成功发布到公众号草稿箱！

文章标题：{标题}
media_id: {media_id}

请登录微信公众号后台查看并发布。
```

**失败**：
```
❌ 发布失败：{错误原因}

可能的解决方案：
1. 检查 WECHAT_APP_ID 和 WECHAT_APP_SECRET 是否配置正确
2. 确认公众号是否有发布权限
3. 尝试使用浏览器方式发布

是否重试？
```

### 7.4 可选参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--publish` | 跳过确认直接发布（API 模式） | `false` |
| `--dry-run` | 仅生成不发布 | `false` |

示例：
```bash
# 直接发布（跳过确认）
/wechat-copywriter https://xxx.blog --publish

# 仅生成不发布
/wechat-copywriter https://xxx.blog --dry-run
```

## 风格速查

| 风格 | 语气 | 结构 | 适用场景 |
|------|------|------|---------|
| 生动科普 | 活泼、形象 | 故事化开头→原理讲解→实际应用→总结 | 技术概念解释、新事物介绍 |
| 技术干货 | 专业、精炼 | 问题→方案→步骤→代码→总结 | 教程、技术方案、工具介绍 |
| 深度分析 | 理性、客观 | 现象→原因→影响→趋势→建议 | 行业分析、趋势解读 |
| 纪实叙事 | 温暖、真实 | 时间线→人物→事件→感悟 | 人物故事、公司历史、事件回顾 |
| 治愈温柔 | 柔和、共情 | 场景→感受→思考→治愈→希望 | 情感类、心理类、生活感悟 |
| 观点鲜明 | 锐利、直接 | 观点→论据→反驳→强化→呼吁 | 评论、观点表达、争议话题 |
| 轻松有趣 | 幽默、轻松 | 段子→知识点→段子→总结 | 娱乐科普、轻松话题 |
| 口语唠嗑 | 随意、亲切 | 闲聊→吐槽→分享→总结 | 日常分享、个人体验 |
| 玩梗沙雕 | 搞笑、玩梗 | 梗→知识→梗→总结 | 年轻受众、网络热点 |

## 依赖技能调用顺序

```
0. [参数解析] 提取URL、交互式选择风格  → 确定输入参数
1. baoyu-url-to-markdown     → 抓取内容
2. [手动] 提取关键概念       → 分析内容
3. [WebSearch] 补充资料      → 搜索官网
4. [手动] 融合重写           → 创作文章
5. humanizer-zh              → 去 AI 味（可选）
6. baoyu-cover-image         → 生成封面图
7. baoyu-compress-image      → 压缩封面图
8. baoyu-image-gen           → 补充配图（可选）
9. baoyu-compress-image      → 压缩文内图（可选）
10. baoyu-markdown-to-html   → 转 HTML
11. baoyu-post-to-wechat     → 发布到草稿箱
```

## 注意事项

- 本技能是**编排器**，调度已有子技能完成工作流
- 每个步骤的输出是下一个步骤的输入
- 用户可在步骤之间介入（如修改重写内容、调整风格）
- **封面图**：每篇文章必须生成封面图（baoyu-cover-image），保存到 `images/cover.png`
- **文内配图**：默认复用博客原图；原图不足时可调用 baoyu-image-gen 补充生成
- 风格规范在 `references/styles/` 目录下，可按需扩展
- **风格选择**：未指定 `--style` 时必须交互式询问，默认选择「生动科普」
- **发布前必须确认**：Step 7 会交互式询问用户是否确认发布，除非指定 `--publish` 参数
- **发布方式**：API 优先（有 `WECHAT_APP_ID` + `WECHAT_APP_SECRET` 时走 API），API 不可用时提示用户切换浏览器方式
- **自动发布模式**（`--publish`）：直接调用 API 发布，不打断确认；API 不可用时报错停止，不回退浏览器方式
- **草稿箱**：发布到公众号草稿箱，用户需登录后台手动发布
