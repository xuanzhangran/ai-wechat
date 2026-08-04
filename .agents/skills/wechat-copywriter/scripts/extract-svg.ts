#!/usr/bin/env bun
/**
 * extract-svg.ts
 *
 * 从 HTML 中提取内嵌 SVG 元素，替换 CSS 变量，转为 PNG。
 * 用于处理网页中内嵌的架构图、流程图等 SVG 图片。
 *
 * 用法:
 *   bun run extract-svg.ts <html_file> <output_dir> [--prefix arch]
 *
 * 输出:
 *   - <output_dir>/<prefix>-<n>.png  — 转换后的 PNG 文件
 *   - JSON 摘要输出到 stdout
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";

// ── CSS 变量提取 ──────────────────────────────────────────────

/**
 * 从 HTML 中提取 CSS 变量定义
 * 支持 <style> 标签内和内联 style 属性中的变量
 */
function extractCSSVariables(html: string): Record<string, string> {
  const vars: Record<string, string> = {};

  // 匹配 --xxx: yyy; 格式的 CSS 变量定义
  // 支持 <style> 块和内联样式
  const varPattern = /--([a-zA-Z][\w-]*):\s*([^;}{]+)/g;
  let match: RegExpExecArray | null;

  while ((match = varPattern.exec(html)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2].trim();
    // 后出现的变量覆盖先出现的（CSS 层叠规则）
    vars[name] = value;
  }

  return vars;
}

/**
 * 将 CSS 变量替换为实际值
 * 处理 var(--xxx) 和 var(--xxx, fallback) 两种形式
 */
function replaceCSSVariables(svg: string, vars: Record<string, string>): string {
  // 替换 var(--xxx, fallback) — 优先用变量值，变量不存在时用 fallback
  let result = svg.replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g,
    (_, varName, fallback) => {
      return vars[varName] || (fallback || "").trim() || "inherit";
    }
  );

  // 替换残余的 var(--xxx) 无 fallback 情况
  result = result.replace(
    /var\(\s*(--[\w-]+)\s*\)/g,
    (_, varName) => {
      return vars[varName] || "inherit";
    }
  );

  return result;
}

// ── SVG 处理 ──────────────────────────────────────────────────

/**
 * 从 HTML 中提取所有内嵌 SVG 块
 */
function extractSVGs(html: string): string[] {
  const svgPattern = /<svg[\s\S]*?<\/svg>/g;
  const svgs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = svgPattern.exec(html)) !== null) {
    svgs.push(match[0]);
  }

  return svgs;
}

/**
 * 为 SVG 添加白色背景和中文字体支持
 */
function prepareSVGForRender(svg: string): string {
  // 提取 viewBox 获取尺寸（支持负数与浮点数）
  const vbMatch = svg.match(
    /viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/
  );
  if (vbMatch) {
    const [, x, y, w, h] = vbMatch;
    const rootOpen = svg.match(/^<svg[^>]*>/);
    if (rootOpen) {
      let tag = rootOpen[0];
      // 将 width="100%"（或缺失尺寸）替换为显式像素，保证 librsvg 正确渲染
      if (/width="/.test(tag)) {
        tag = tag.replace(/width="[^"]*"/, `width="${w}" height="${h}"`);
      } else {
        tag = tag.replace(/>$/, ` width="${w}" height="${h}">`);
      }
      // 添加中文字体：合并进已有 style，否则追加
      const fontFamily =
        "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      if (!svg.includes("font-family")) {
        if (/style="/.test(tag)) {
          tag = tag.replace(
            /style="([^"]*)"/,
            (_m, existing: string) =>
              `style="${existing}${existing && !existing.endsWith(";") ? ";" : ""}font-family:${fontFamily};"`
          );
        } else {
          tag = tag.replace(/>$/, ` style="font-family: ${fontFamily};"`);
        }
      }
      // 一次性替换根开标签，并插入白色背景矩形
      svg = svg.replace(
        /^<svg[^>]*>/,
        `${tag}><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>`
      );
    }
  }

  return svg;
}

// ── 主流程 ────────────────────────────────────────────────────

interface ExtractResult {
  totalSVGs: number;
  converted: number;
  skipped: number;
  files: Array<{ name: string; width: number; height: number; sizeKB: number }>;
  errors: string[];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("用法: bun run extract-svg.ts <html_file> <output_dir> [--prefix arch]");
    process.exit(1);
  }

  const htmlPath = args[0];
  const outputDir = args[1];
  const prefix = args.includes("--prefix")
    ? args[args.indexOf("--prefix") + 1]
    : "arch";

  // 读取 HTML
  if (!existsSync(htmlPath)) {
    console.error(`文件不存在: ${htmlPath}`);
    process.exit(1);
  }

  const html = readFileSync(htmlPath, "utf8");

  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 提取 CSS 变量
  const cssVars = extractCSSVariables(html);
  const varCount = Object.keys(cssVars).length;

  // 提取 SVG
  const svgs = extractSVGs(html);

  if (svgs.length === 0) {
    const result: ExtractResult = {
      totalSVGs: 0,
      converted: 0,
      skipped: 0,
      files: [],
      errors: [],
    };
    console.log(JSON.stringify(result));
    return;
  }

  // 动态导入 sharp
  let sharp: any;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("需要安装 sharp: bun add sharp");
    process.exit(1);
  }

  const result: ExtractResult = {
    totalSVGs: svgs.length,
    converted: 0,
    skipped: 0,
    files: [],
    errors: [],
  };

  for (let i = 0; i < svgs.length; i++) {
    let svg = svgs[i];

    // 检查是否包含有意义的内容（排除纯装饰性 SVG）
    const textContent = svg.replace(/<[^>]+>/g, "").trim();
    if (textContent.length < 2) {
      result.skipped++;
      continue;
    }

    // 替换 CSS 变量
    svg = replaceCSSVariables(svg, cssVars);

    // 准备渲染
    svg = prepareSVGForRender(svg);

    // 移除 XML 声明（sharp 不需要）
    svg = svg.replace(/<\?xml[^?]*\?>\s*/, "");

    // 获取 viewBox 尺寸
    const vbMatch = svg.match(
      /viewBox="[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)"/
    );
    const width = vbMatch ? Math.round(parseFloat(vbMatch[1])) : 680;
    const height = vbMatch ? Math.round(parseFloat(vbMatch[2])) : 400;

    const outName = `${prefix}-${i + 1}.png`;
    const outPath = join(outputDir, outName);

    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outPath);

      const { size } = await import("fs").then((fs) =>
        fs.statSync(outPath)
      );

      result.converted++;
      result.files.push({
        name: outName,
        width,
        height,
        sizeKB: Math.round(size / 1024 * 10) / 10,
      });
    } catch (err: any) {
      result.errors.push(`SVG ${i + 1}: ${err.message}`);
    }
  }

  console.log(JSON.stringify(result));
}

main();
