---
name: xhs-auto-creator
description: "小红书自动创建图文编排器"
---

# 小红书自动创建图文编排器

## 描述
本技能用于调度用小红书图文生成的编排器。本技能不直接处理小红书图片生成，而是按顺序调用以下子技能：

## 工作流程
1. 第一步：调用 `baoyu-xhs-images` 技能，传入用户提供的提示词`prompt`和图片质量参数`--quality normal`参数。
2. 第二步：调用 `baoyu-compress-image` 技能，传入上一步生成的图片路径，对图片进行压缩，注意保持图片质量和格式不变，压缩比例为`--quality 80`参数。

## 依赖的子技能
- baoyu-xhs-images
- baoyu-compress-image