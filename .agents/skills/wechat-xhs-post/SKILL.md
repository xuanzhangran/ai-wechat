---
name: wechat-xhs-post
description: "微信公众号文章编排器，复用已有小红书图文素材生成公众号长文。"
---

# wechat-xhs-post: 小红书素材转公众号文章

## 描述
本技能将 `image-cards/` 目录下已生成好的小红书素材（summary.md + 压缩图片）自动编排成图文并茂的公众号文章并发布到草稿箱。

> **注意**：`image-cards/` 是本地项目目录，由其他流程（如 xhs-auto-creator）生成。使用本技能前请确保该目录下存在有效主题。

它不从头写稿或生图，而是**复用已有资产**：从小红书风格的 summary.md 中提取内容，扩展为公众号长文，搭配已压缩的图片（自动转 PNG 以兼容微信 API），走标准流水线（去 AI 味 → HTML → 发布）。

## 与 wechat-auto-creator 的区别

| 维度 | wechat-auto-creator | wechat-xhs-post (本技能) |
|------|-------------------|----------------------|
| 内容来源 | 用户一句话选题，从零写稿 | `image-cards/<topic>/summary.md` 已有素材 |
| 配图 | 从提示词生图 | 复用 `compress/*.webp` 已压缩图片 |
| 写稿 | 按风格文件生成初稿 | 小红书内容**扩展**为公众号长文 |
| 适用场景 | 全新选题 | 已有小红书图文素材，想做公众号版本 |

## 调用方式

```
/wechat-xhs-post <topic-slug>
/wechat-xhs-post <topic-slug> --publish
/wechat-xhs-post <topic-slug> --dry-run
/wechat-xhs-post --list
```

| 参数 | 说明 |
|------|------|
| `<topic-slug>` | `image-cards/` 下的目录名（必填） |
| `--publish` | 跳过确认直接发布到草稿箱 |
| `--dry-run` | 只生成文章不发布 |
| `--style <style>` | 公众号文章风格: `general`(通用科普) / `deep`(深度) / `light`(轻松) |
| `--title <title>` | 手动指定标题（默认从 `summary.md` 提取） |

## 前置依赖

本技能不包含图片生成或写稿，依赖以下项目中已有资源：

### 必需资源（image-cards/ 下已有）
```
image-cards/<topic>/
├── summary.md              ← 小红书正文（必选，没有则从其他素材自动写稿）
├── compress/*.webp         ← 已压缩图片（必选）
├── source.md               ← 参考素材（可选，辅助扩展深度）
├── analysis.md             ← 内容分析（可选）
└── outline.md              ← 卡片大纲（可选）
```

### 调用的子技能
- `baoyu-format-markdown` — Markdown 格式化
- `baoyu-markdown-to-html` — Markdown → 公众号兼容 HTML
- `baoyu-post-to-wechat` — 发布到草稿箱
- `baoyu-compress-image` — 图片压缩（compress/ 之外的原始图）
- `humanizer-zh` — 去除 AI 写作痕迹

## 工作流全景

```
image-cards/<topic>/
├── summary.md        ──→  Step 2: 读取素材
├── compress/*.webp   ──→  Step 4: 复制图片
│
├─ Step 1: 解析输入 → 确定 topic-slug，验证目录完整性
├─ Step 2: 读取素材 → 解析 summary.md + compress/ 图片清单
├─ Step 3: 扩写文章 → 小红书短文案 → 公众号长文
│   ├─ 输出到 00-草稿/{topic-slug}/article-raw.md
│   └─ 复制图片至 00-草稿/{topic-slug}/images/
├─ Step 4: 格式化 → baoyu-format-markdown
├─ Step 5: 去AI味 → humanizer-zh
├─ Step 6: 图片格式转换 → WebP 全部转 PNG
├─ Step 7: 转HTML → baoyu-markdown-to-html
├─ Step 8: 发布   → baoyu-post-to-wechat（到草稿箱）
└─ 完成报告
```

## 输出目录
所有产物放在 `00-草稿/{topic-slug}/` 目录下：
```
00-草稿/{topic-slug}/
├── article.md              ← 配图版终稿（WeChat 公众号长文，图片引用 .png）
├── article.html            ← 公众号兼容 HTML
└── images/                 ← 图片已全部转为 PNG（兼容微信 API）
```

## 详细工作流程

### Step 1: 解析输入

从用户消息提取 topic-slug：

| 来源 | 示例 |
|------|------|
| 位置参数 | `/wechat-xhs-post <topic-slug>` |
| `--publish` 标志 | `/wechat-xhs-post <topic-slug> --publish` |
| `--dry-run` 标志 | `/wechat-xhs-post <topic-slug> --dry-run` |
| `--style` | `/wechat-xhs-post <topic-slug> --style deep` |

**预检：image-cards/ 目录检查**
1. 检查 `image-cards/` 目录是否存在
2. 如果不存在 → **停止**，提示："`image-cards/` 目录不存在，请先通过其他流程（如 xhs-auto-creator）生成小红书素材"
3. 如果存在但为空（无子目录） → **停止**，提示："`image-cards/` 目录下没有可用主题，请先生成素材"
4. 列出 `image-cards/` 下所有子目录供用户参考

**有效性检查**：
1. 检查 `image-cards/<topic>/` 是否存在
2. 如果不存在 → **停止**，提示："主题 `<topic>` 在 `image-cards/` 中不存在。使用 `--list` 查看可用主题列表"
3. 检查 `summary.md` 是否存在（非必需但有最好）
4. 检查 `compress/` 目录是否有 webp 文件
5. 列出所有可用图片及其序号
6. 如果目录不完整：列出缺失产物，询问用户是否仍要继续

**自动补全/选择**：
- 若用户未提供 slug 或使用 `--list`，动态读取 `image-cards/` 下列出所有可选主题供用户选择
- 列出内容基于 `image-cards/` 实际目录，**不包含任何硬编码示例**

### Step 2: 读取素材

**读取内容来源**（优先级）：
1. `summary.md` — 主要素材，包含：标题备选、开头钩子、正文（3段式）、互动提问、话题标签、配图说明
2. `source.md` / `source-{topic}.md` — 补充素材，帮助扩展深度
3. `draft.md` — 草稿文件（如有）
4. `analysis.md` — 内容分析，帮助确定文章定位
5. `outline.md` — 卡片大纲，帮助理解文章结构

**读取图片清单**：
```
image-cards/<topic>/compress/
├── 01-cover-xxx.webp     ← 封面图
├── 02-content-xxx.webp   ← 文内图
├── 03-content-xxx.webp
└── ...
```

**分类图片**：
- 序号 `01` 或包含 `cover` → 封面图
- 其他 → 文内插图

记录每张图片的文件名、序号、路径，供后续扩写时内嵌引用。

### Step 3: 扩写文章

将小红书风格的短文案扩展为公众号长文。

#### 风格转换规则

| 维度 | 小红书风格（原文） | 公众号风格（转换后） |
|------|------------------|-------------------|
| 篇幅 | 300-800 字 | 1500-3000 字 |
| 结构 | 观点 → 证据 → 延伸（3段式） | 引言 → 展开 → 深度 → 总结 |
| 语言 | 短句、emoji、口语化、网络用语 | 通畅、有层次、适度口语但更正式 |
| 图片 | 6-7 张知识卡片 | 3-6 张插图穿插文中，1 张封面 |
| 结尾 | 评论区互动 | 总结升华 + 引导关注/互动 |

#### 扩写方法

1. **提取**：从 `summary.md` 提取标题（备选）、开头钩子、核心观点、论据
2. **扩展**：在保持原意基础上：
   - 开头钩子保持冲击力，可以稍加铺垫
   - 观点段展开：加入更多背景、类比、场景描写
   - 证据段深化：补充更详细的科学机制、研究数据
   - 延伸段丰富：加入更多维度的思考、实用建议
3. **融入图片**：在文中标记图片插入位置，使用 `![描述](images/01-xxx.webp)` 格式
4. **添加标题层级**：`#` 标题 → 适当用 `##` 和 `###` 分解段落
5. **结尾优化**：保留互动性，但更偏向"点个在看"、"分享给朋友"等公众号风格

#### 图片分配规则

| 图片序号 | 文中位置 | 作用 |
|---------|---------|------|
| `01-cover-*` | **封面图**（不嵌入正文，作为文章封面） | 视觉吸引 |
| `02-*` | 第一段后 | 配合观点展示 |
| `03-*` | 第二段后 | 配合证据/机制解释 |
| `04-*` | 第三段后 | 配合延伸/对比 |
| `05-*` | 倒数第二段后 | 总结/建议 |
| `06-*` | 结尾前 | 引导互动 |
| `07-*` | 备用 | 按需插入 |

**图片数量不足时**：有几张插几张，不必强求封面 + 多张文内图。至少需有一张封面图。

**图片数量过多时**：选择与内容最相关的 4-6 张，封面图 + 3-5 张文内插图。

#### 输出

- 文件：`00-草稿/{topic-slug}/article-raw.md`
- 封面图在 frontmatter 中指定：`cover: images/01-cover-xxx.webp`

### Step 4: 格式化

调用 `baoyu-format-markdown` 技能：

```bash
bun run .agents/skills/baoyu-format-markdown/scripts/main.ts \
  00-草稿/{topic-slug}/article-raw.md
```

输出：`article-raw-formatted.md`

执行者将格式化后的文件重命名为 `article.md`（覆盖同目录下的 `article.md`），后续步骤以 `article.md` 为输入。

```bash
mv 00-草稿/{topic-slug}/article-raw-formatted.md \
   00-草稿/{topic-slug}/article.md
```

### Step 5: 去 AI 味（必选）

加载 `/humanizer-zh` 技能处理 `article.md`：

1. 读取 `article.md` 全文
2. 逐段扫描 AI 模式：三段式法则、AI 词汇、破折号过度使用、夸大的象征意义、否定式排比等
3. 重写问题片段，保留核心信息和语气
4. 将处理结果写回 `article.md`

> 去 AI 味是**必选步骤**，所有公众号文章必须经过此处理。

### Step 6: 图片格式转换（WebP → PNG）

微信 API 不支持 WebP 格式的图片上传（封面图会报 `40113: unsupported file type`），此步骤将所有 WebP 图片转为 PNG：

**操作流程**：

```bash
# 批量转换 images/ 目录下所有 webp 为 png
for img in 00-草稿/{topic-slug}/images/*.webp; do
  bun run .agents/skills/baoyu-compress-image/scripts/main.ts \
    "$img" -f png --keep
done
```

**执行后**：
- `images/` 下同时存在 `.webp` 和 `.png` 文件（`--keep` 保留原文件）
- 扫描 `images/` 目录，建立新旧文件名映射

**更新文章中的图片引用**：

将 `article.md` 中的所有图片路径从 `.webp` 改为 `.png`：

```bash
# 替换 article.md 中所有图片引用从 .webp 改为 .png
# 覆盖三种情况：正文图片、frontmatter cover、frontmatter 引号包裹的值
sed -i '' 's/\.webp)/.png)/g' 00-草稿/{topic-slug}/article.md
sed -i '' 's/\.webp"/.png"/g' 00-草稿/{topic-slug}/article.md
sed -i '' 's/\.webp$/.png/' 00-草稿/{topic-slug}/article.md
```

> 使用 `sed` 或逐行编辑工具完成替换，确保 cover frontmatter 和正文中的图片引用都被更新。

### Step 7: 转 HTML

调用 `baoyu-markdown-to-html` 技能：

```bash
bun run .agents/skills/baoyu-markdown-to-html/scripts/main.ts \
  00-草稿/{topic-slug}/article.md \
  --theme modern \
  --keep-title
```

- 主题推荐 `modern`（公众号通用风格）
- `--keep-title` 保留文中标题
- 输出：`00-草稿/{topic-slug}/article.html`

### Step 8: 发布到公众号草稿箱

调用 `baoyu-post-to-wechat` 技能，使用文章发布（文章）流程：

- **默认行为**：停在发布按钮前等待确认
- **`--publish` 模式**：直接通过 API 提交
- 提交的文件：`00-草稿/{topic-slug}/article.html`

```bash
# API 方式（需配置 WECHAT_APP_ID + WECHAT_APP_SECRET）
bun run .agents/skills/baoyu-post-to-wechat/scripts/wechat-api.ts \
  00-草稿/{topic-slug}/article.html \
  --theme modern

# 浏览器方式（手动操作）
bun run .agents/skills/baoyu-post-to-wechat/scripts/wechat-article.ts \
  --markdown 00-草稿/{topic-slug}/article.md \
  --theme modern
```

**元数据配置**：
- 封面图：使用 `images/01-cover-xxx.png`（已从 WebP 转换）
- 标题：从 article.md frontmatter 或 summary.md 中提取
- 摘要：自动从文章前 120 字截取

### Step 9: 完成报告

```
✅ Image Cards → 公众号 完成！

Topic: <topic-slug>
素材来源: image-cards/<topic-slug>/
  ├─ summary.md ✓（3 段式内容）
  └─ compress/  ✓（N 张压缩图）

输出目录: 00-草稿/<topic-slug>/
  ├─ article.md        ← 公众号长文（含图片引用）
  ├─ article.html      ← 公众号兼容 HTML
  └─ images/           ← 共 N 张图片

发布状态: [已保存到草稿箱 / 已发布 / --dry-run 未发布]
```

## 话题自动补全

如果 `image-cards/<topic>/` 缺少 `summary.md`，但有其他素材（如 `source.md`、`draft.md`、`outline.md`、`analysis.md` 等），按以下策略处理：

1. 读取所有可用素材
2. 将素材内容 + 图片清单发给 AI 模型
3. 让 AI 根据素材自动写一篇公众号风格的文章
4. 在报告中标记为"AI 根据素材自动生成"

## 图片处理策略

### 总体流程

所有图片最终统一为 PNG 格式（微信 API 不支持 WebP）：

```
image-cards/<topic>/compress/*.webp
    ↓ Step 3: 复制到 00-草稿/images/
00-草稿/<topic>/images/*.webp
    ↓ Step 6: 批量转 PNG + 更新文章引用
00-草稿/<topic>/images/*.png  ← 最终发布用的图片
```

### 已有 compress/*.webp 的情况（最常见）
1. 复制到 `00-草稿/{topic-slug}/images/`
2. Step 6 中统一转换为 PNG，并更新 `article.md` 中的图片引用路径

### 仅原始 PNG/JPG 的情况（无需转换）
- 直接复制到 `00-草稿/{topic-slug}/images/`
- 已在 PNG 格式，跳过 Step 6 的格式转换

### 图片文件名映射表

在 Step 2 读取图片后，建立文件名映射：

| 序号 | 源文件 | 目标文件 | 在文中用途 |
|-----|--------|---------|----------|
| 1 | compress/01-cover-xxx.webp | images/01-cover-xxx.webp | 封面图 |
| 2 | compress/02-content-xxx.webp | images/02-content-xxx.webp | 文内图 |
| ... | ... | ... | ... |

映射表写入 `00-草稿/{topic-slug}/images/README.md`，方便追踪。

## 扩写 AI 指令模板（给 AI 模型）

在 Step 3 中，当需要将 summary.md 扩展为公众号长文时，使用以下指令模板：

```
请将以下小红书风格的科普内容，转换为一篇微信公众号风格的长文。

要求：
1. 篇幅：1500-2500 字
2. 结构：有吸引力的开头 → 展开阐述（2-3 个小标题）→ 总结升华
3. 语言：通畅自然的中文，去掉过度口语化表达、去掉 emoji、去掉网络梗
4. 互动：结尾改为"点亮在看"、"分享给朋友"等公众号风格
5. 图片：在合适位置用 `![描述](images/02-xxx.webp)` 标记图片插入点
6. 标题：保留原文主标题或选择一个转化后的版本
7. 封面：在 frontmatter 中指定 `cover: images/01-cover-xxx.webp`

原始小红书内容（summary.md）：
[插入 summary.md 内容]

可用图片清单：
[插入图片映射表需要的信息]
```

## 快速开始示例

```bash
# 列出所有可用主题
/wechat-xhs-post --list

# 选择一个 topic 处理
/wechat-xhs-post <topic-slug>

# 带风格 + 自动发布
/wechat-xhs-post <topic-slug> --style deep --publish

# 仅生成不发布
/wechat-xhs-post <topic-slug> --dry-run
```

## 主题快速选择（--list 模式的输出）

当用户不带参数或使用 `--list` 时，**动态扫描** `image-cards/` 目录，列出所有实际存在的主题子目录：

```
可用主题（共 N 个）：

1. <topic-slug-1>     — 读取 summary.md 第一行或目录名
2. <topic-slug-2>     — 读取 summary.md 第一行或目录名
3. ...
N. <topic-slug-N>     — 读取 summary.md 第一行或目录名

输入编号或 topic-slug 选择，或直接输入：/wechat-xhs-post <topic-slug>
```

> 列表内容完全基于 `image-cards/` 实际目录结构，**不使用任何预设或硬编码示例**。如果列表为空，说明 `image-cards/` 下没有可用主题，提示用户先通过其他流程生成素材。

## 注意事项
- `summary.md` 是**首选内容源**，如果不存在会尝试用其他素材自动写稿
- 图片仅从 `compress/` 复制，不会重新生成
- 所有图片最终转为 PNG 格式（微信 API 不支持 WebP），`article.md` 中的图片引用会自动更新
- 如果 `compress/` 为空但存在原始 PNG/JPG，直接复制使用，无需额外转换
- 去 AI 味（humanizer-zh）是**必选步骤**，所有文章必须经过此处理
- 扩写后的文章建议快速通读一遍，调整图片位置
- `--dry-run` 模式在 Step 8（发布）前停止
- 发布默认停在确认前（除非指定 `--publish`）
- 本技能不修改 `image-cards/` 下的原始文件，所有产物在 `00-草稿/` 中
