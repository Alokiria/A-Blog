/**
 * 把 SSG 产物（dist）里的文件名 / 目录名从百分号编码还原成原始中文。
 *
 * ── 为什么需要这一步 ──────────────────────────────────────────────────
 *
 * vite-ssg 是直接拿「路由 path」当输出文件名的，而路由 path 是百分号编码过的
 * （浏览器地址栏、`location.pathname`、vue-router 的匹配都用这一套），
 * 所以 dist 里落盘的是：
 *
 *   dist/posts/Godot%E5%A4%A7%E5%AD%A6%E4%B9%A0/%E4%B8%80%E4%BA%9BGodot%E6%8F%92%E4%BB%B6%E6%8E%A8%E8%8D%90.html
 *
 * 但托管平台（Vercel / Cloudflare Pages / GitHub Pages 等）在找文件之前会先把
 * 请求路径**解一次码**：浏览器把 `/posts/Godot大学习/一些…` 发成
 * `/posts/Godot%E5%A4%A7%E5%AD%A6%E4%B9%A0/%E4%B8%80…`，平台解码后拿
 * `Godot大学习/一些….html` 去找文件 —— 和上面那个带 `%` 的名字对不上，于是
 * 文章页直接 404（全靠 SPA 在 404 页壳里渲染，看着像能打开）。
 *
 * 所以构建末尾把 dist 里的名字解码回原始中文：
 *
 *   dist/posts/Godot大学习/一些Godot插件推荐.html
 *
 * 解码后「浏览器请求 → 平台解码 → 磁盘文件名」三者就对上了，文章页能真正 200。
 * 页面里的链接、sitemap、RSS 仍然保持百分号编码的形式不变（那是 URL 的正确写法）。
 *
 * 只处理**非 ASCII 字符**的转义（`%E4…` / `%C3…` 这种），
 * 因此 `%20`、`%2F` 之类 ASCII 转义不会被误改，重复执行也是幂等的。
 */
import { existsSync, readdirSync, renameSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'

const distDir = join(process.cwd(), 'dist')

/** 匹配「非 ASCII 字符」的转义：%XX 里 XX 的首字节 >= 0x80（即 8~F 打头） */
const MULTIBYTE_ESCAPE_RE = /%[89A-F][0-9A-F]/i

if (!existsSync(distDir)) {
  console.warn('[decode-dist-paths] 没有 dist 目录，跳过')
  process.exit(0)
}

/** 反复解码，直到名字里不再有非 ASCII 转义（最多 3 轮，防止有人手滑编了两层） */
function decodeName(name) {
  let current = name
  for (let round = 0; round < 3 && MULTIBYTE_ESCAPE_RE.test(current); round++) {
    let next
    try {
      next = decodeURI(current)
    }
    catch {
      break
    }
    if (next === current)
      break
    current = next
  }
  return current
}

const renamed = []
const skipped = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    // 先递归子项，最后再改自己的名字（目录改名会把整棵子树一起带走）
    if (statSync(full).isDirectory())
      walk(full)

    const decoded = decodeName(entry)
    if (decoded === entry)
      continue

    const target = join(dir, decoded)
    if (existsSync(target)) {
      skipped.push(`${relative(distDir, target)}`)
      continue
    }
    renameSync(full, target)
    renamed.push(`${relative(distDir, full)} → ${decoded}`)
  }
}

walk(distDir)

for (const item of renamed)
  console.log(`[decode-dist-paths] ${item}`)
for (const item of skipped)
  console.warn(`[decode-dist-paths] 目标已存在，跳过：${item}`)
console.log(`[decode-dist-paths] 共还原 ${renamed.length} 个文件名/目录名${skipped.length ? `，跳过 ${skipped.length} 个` : ''}`)
