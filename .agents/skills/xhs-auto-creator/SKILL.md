---
name: xhs-auto-creator
description: "小红书自动创建图文编排器"
---

# 小红书自动创建图文编排器

## 描述
本技能用于调度用小红书图文生成的编排器。本技能不直接处理小红书图片生成，而是按顺序调用以下子技能：

## 输出目录
所有生成产物统一放在项目根目录的 `image-cards/{topic-slug}/` 下。

## 工作流程
1. 第一步：调用 `baoyu-xhs-images` 技能，传入用户提供的提示词`prompt`和图片质量参数`--quality normal`参数，产出目录为 `image-cards/{topic-slug}/`。
2. 第二步：调用 `baoyu-compress-image` 技能，传入上一步生成的图片路径，对所有图片进行压缩，尽量保持图片质量和格式不变（注意：如果第一步生成的图片是png格式，则将图片压缩成webp格式，如果是其他图片格式，则保持压格式不变），压缩比例为`--quality 80`参数，然后将压缩后的图片保存到 `image-cards/{topic-slug}/compress/` 目录下，并返回图片路径。
3. 第三步：调用 `xiaohongshu-ops` 技能，传入上一步压缩图片的路径，将压缩后的图片发布到小红书。

## 依赖的子技能
- baoyu-xhs-images
- baoyu-compress-image
- xiaohongshu-ops
