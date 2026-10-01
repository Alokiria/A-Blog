/**
 * Pixiv 排行榜取数（走公共反代）。
 *
 * ── 为什么是「公共反代」 ──────────────────────────────────────────
 * Pixiv 的 App API 不接受浏览器直连（CORS + 必须带 OAuth token），
 * 所以社区里常见的做法是调用别人搭好的公共反代，前端零后端即可展示榜单。
 * 本项目采用的就是这种形式，代价是：**这些反代随时可能挂掉或限流**。
 * 因此这里做了三件事：
 *   1. 多数据源依次降级（一个挂了自动换下一个）
 *   2. 429 / 5xx 自动退避重试
 *   3. 结果缓存进 localStorage，同一天内不重复请求
 * 如果你要长期稳定使用，建议自建反代后加到 `sources` 最前面。
 *
 * ── 浏览器请求的两个坑 ────────────────────────────────────────────
 * `navigator.sendBeacon` 无法带自定义头，所以这里统一用 fetch；
 * 另外**不要在浏览器里给跨域请求设置 Referer**（Referer 是禁止修改的头，
 * 写了会直接抛错，拿不到任何数据）。测试反代可用性请在 Node 里加 Referer。
 */

import type { PixivArtwork, PixivImage, PixivRankingConfig, PixivRankingSource } from '../types/pixiv'
import { isClient } from '@vueuse/core'

/** 支持的榜单模式（标题只影响展示，mode 直接透传给反代） */
export const RANK_MODES: { key: string, label: string, mode: string }[] = [
  { key: 'day', label: '日榜', mode: 'day' },
  { key: 'week', label: '周榜', mode: 'week' },
  { key: 'month', label: '月榜', mode: 'month' },
  { key: 'rookie', label: '新人', mode: 'week_rookie' },
  { key: 'original', label: '原创', mode: 'week_original' },
  { key: 'male', label: '男性向', mode: 'day_male' },
  { key: 'female', label: '女性向', mode: 'day_female' },
  { key: 'ai', label: 'AI', mode: 'day_ai' },
]

/**
 * 默认数据源。
 *
 * ⚠️ hibiapi 在**浏览器里必然失败**，原因不是限流也不是参数：
 *   它返回的 400 `Not Accepted` 是「请求带 Origin 头」触发的。
 *   浏览器发跨域请求一定会带 Origin，所以从网页里调它永远拿不到数据；
 *   而 Node / SSR 环境默认不发 Origin，所以本地脚本测试反而正常。
 *   （它的 CORS 预检 OPTIONS 返回 204 且头齐全，问题出在实际 GET 上，
 *    属于该服务自身的 bug。）
 *
 * 因此下面用 `prefer` 标记「浏览器里优先用哪个」：
 *   - mokeyjay：浏览器可用，但只提供日榜（没有 {page}，一页 50 条），
 *               且**无视 date 参数**、永远返回它缓存的那一天
 *   - hibiapi：仅 Node / 脚本可用；一旦自建了反代（自己控制 CORS），
 *              给它加上 prefer 即可让浏览器也优先走它
 */
export const DEFAULT_SOURCES: PixivRankingSource[] = [
  {
    // 浏览器里唯一可用的公开源
    label: 'mokeyjay',
    rankUrl: 'https://d.cocomi.eu.org/https://cloud.mokeyjay.com/pixiv/?r=api%2Fpixiv-json&_t={date}',
    // 只支持日榜
    prefer: ['day'],
  },
  {
    // 基于 Pixiv App API，返回完整 illust 结构（带翻译标签、meta_pages）
    // 但浏览器里会被 Origin 校验拒掉，只适合 Node 端
    label: 'hibiapi',
    rankUrl: 'https://hibiapi.cocomi.eu.org/api/pixiv/rank?mode={mode}&page={page}&date={date}',
  },
]

/**
 * 按当前榜单模式挑出数据源的尝试顺序。
 *
 * 有 `prefer` 且包含当前模式的源排在前面；没声明的按原顺序排在后面（作为降级）。
 * 例如日榜：mokeyjay 有 prefer:['day'] → 先试它；hibiapi 没声明 → 作为兜底。
 * 周榜：没有源 prefer 'week' → 保持原顺序。
 */
export function orderSourcesForMode(
  sources: PixivRankingSource[],
  mode: string,
): PixivRankingSource[] {
  const preferred = sources.filter(s => s.prefer?.includes(mode))
  if (!preferred.length)
    return sources
  return [...preferred, ...sources.filter(s => !s.prefer?.includes(mode))]
}

/** 默认图片代理链 */
export const DEFAULT_IMAGE_PROXIES = [
  'pximg.cocomi.eu.org',
  'i.pixiv.re',
]

export const DEFAULT_MAX_ITEMS = 120

export function resolveRankingConfig(raw?: PixivRankingConfig) {
  return {
    sources: raw?.sources?.length ? raw.sources : DEFAULT_SOURCES,
    modes: raw?.modes?.length ? raw.modes : RANK_MODES.map(m => m.key),
    maxItems: raw?.maxItems ?? DEFAULT_MAX_ITEMS,
    imageProxies: raw?.imageProxies?.length ? raw.imageProxies : DEFAULT_IMAGE_PROXIES,
  }
}

/* ---------------- 日期 ---------------- */

/**
 * 推算「应该看哪一天的榜单」。
 *
 * Pixiv 榜单在日本时间次日中午前后才更新，所以：
 *   18 点之前 → 前天，18 点之后 → 昨天
 * 这与参考站点 nanoka.top 的处理方式一致。
 */
export function computeRankDate(offsetDays?: number) {
  const d = new Date()
  const shift = offsetDays ?? (d.getHours() > 14 ? -1 : -2)
  d.setDate(d.getDate() + shift)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ---------------- 归一化 ---------------- */

function toIllustUrl(id: number | string) {
  return `https://www.pixiv.net/artworks/${id}`
}

function pushImage(list: PixivImage[], thumb?: string, large?: string, original?: string) {
  const t = (thumb || large || original || '').trim()
  if (!t)
    return
  list.push({
    thumb: t,
    large: (large || t).trim(),
    original: (original || large || t).trim(),
  })
}

/** hibiapi：Pixiv App API 原始结构 */
function normalizeAppApi(raw: any): PixivArtwork[] {
  return (raw?.illusts ?? []).map((it: any): PixivArtwork => {
    const pages: PixivImage[] = []

    if (Array.isArray(it.meta_pages) && it.meta_pages.length) {
      for (const p of it.meta_pages) {
        pushImage(
          pages,
          p?.image_urls?.medium ?? p?.image_urls?.large,
          p?.image_urls?.large,
          p?.image_urls?.original,
        )
      }
    }
    else {
      pushImage(
        pages,
        it?.image_urls?.medium ?? it?.image_urls?.large,
        it?.image_urls?.large,
        it?.meta_single_page?.original_image_url ?? it?.image_urls?.original,
      )
    }

    return {
      id: it.id,
      title: it.title ?? '',
      author: it.user?.name ?? '',
      authorId: it.user?.id != null ? String(it.user.id) : undefined,
      tags: (it.tags ?? []).map((t: any) => t?.translated_name || t?.name).filter(Boolean),
      pages,
      url: toIllustUrl(it.id),
      r18: it.x_restrict > 0 || it.sanity_level >= 6,
      bookmarkCount: it.total_bookmarks,
      viewCount: it.total_view,
    }
  }).filter((a: PixivArtwork) => a.pages.length > 0)
}

/** mokeyjay 的扁平结构（rank 提供条目与名次，source-json 仅用于兜底，可缺省） */
function normalizeMokeyjay(rankRaw: any, _sourceRaw?: any): PixivArtwork[] {
  const data: any[] = rankRaw?.data ?? []
  const illustUrls: string[] = rankRaw?.url ?? []

  return data.map((it, i): PixivArtwork => {
    const pages: PixivImage[] = []

    // 榜单接口给的是 mokeyjay 自己的图床（允许外链，可用性不错），优先用它
    if (it?.url)
      pushImage(pages, it.url, it.url, it.url)

    if (!pages.length)
      return null as unknown as PixivArtwork

    const id = it.id
    const detail = typeof illustUrls[i] === 'string'
      ? illustUrls[i].replace(/^artworks\//, '')
      : ''

    return {
      id,
      title: it.title ?? '',
      author: it.user_name ?? '',
      authorId: it.user_id != null ? String(it.user_id) : undefined,
      tags: Array.isArray(it.tags) ? it.tags : [],
      pages,
      url: toIllustUrl(detail || id),
      r18: false,
      rank: it.rank,
    }
  }).filter(Boolean)
}

/* ---------------- 请求 ---------------- */

export interface FetchResult {
  artworks: PixivArtwork[]
  sourceLabel: string
}

function fill(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * 带退避的 fetch：429 与 5xx 会重试（公共反代限流很常见）。
 * 注意：不要设置 Referer，浏览器会拒绝。
 */
async function fetchWithRetry(url: string, headers: Record<string, string> = {}, retries = 2): Promise<Response> {
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json', ...headers } })

      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`)
        if (attempt < retries) {
          // 公共反代限流一般几秒就恢复
          await sleep(1200 * (attempt + 1) + Math.floor(Math.random() * 400))
          continue
        }
      }

      return res
    }
    catch (e) {
      lastErr = e
      if (attempt < retries)
        await sleep(800 * (attempt + 1))
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

async function fetchJSON(url: string, headers?: Record<string, string>) {
  const res = await fetchWithRetry(url, headers)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json?.error)
    throw new Error(json.error.user_message || 'interface error')
  return json
}

/**
 * 按数据源顺序尝试，返回第一个成功的。
 *
 * 顺序由 `orderSourcesForMode` 决定：声明了 `prefer` 且包含当前模式的源优先，
 * 其余按原顺序作为降级。
 *
 * @param date 形如 `2026-09-29`
 */
export async function fetchRanking(
  sources: PixivRankingSource[],
  mode: string,
  page: number,
  date: string,
): Promise<FetchResult> {
  const errors: string[] = []

  for (const source of orderSourcesForMode(sources, mode)) {
    try {
      const rankUrl = fill(source.rankUrl, { mode, page, date })
      const rankRaw = await fetchJSON(rankUrl, source.headers)

      // 按返回结构判断，而不是按配置里有没有 sourceUrl：
      // Pixiv App API 是 { illusts: [...] }，mokeyjay 是 { data: [...], url: [...] }
      let artworks: PixivArtwork[]

      if (Array.isArray(rankRaw?.illusts)) {
        artworks = normalizeAppApi(rankRaw)
      }
      else if (Array.isArray(rankRaw?.data)) {
        const sourceRaw = source.sourceUrl
          ? await fetchJSON(fill(source.sourceUrl, { mode, page, date }), source.headers)
          : undefined
        artworks = normalizeMokeyjay(rankRaw, sourceRaw)
      }
      else {
        throw new Error('unrecognized response shape')
      }

      if (!artworks.length)
        throw new Error('empty result')

      return { artworks, sourceLabel: source.label }
    }
    catch (e) {
      errors.push(`${source.label}: ${e instanceof Error ? e.message : String(e)}`)
      // 换下一个源之前稍等一下，避免把挂了的那台继续打
      await sleep(300)
    }
  }

  // 没有任何源声明支持这个模式 → 浏览器里很可能只有 hibiapi 一家能用，
  // 而它带 Origin 就 400。这种「技术上没辙」的情况给出可操作的提示，
  // 而不是让用户对着一个 HTTP 400 发愁。
  const tried = orderSourcesForMode(sources, mode)
  if (isClient && !tried.some(s => s.prefer?.includes(mode))) {
    return Promise.reject(new Error(
      `${errors.join(' / ')}｜该榜单没有声明 prefer 的公开源，浏览器里通常只有 hibiapi 可用，`
      + `而它会拒绝带 Origin 的跨域请求。请自建反代后写入 themeConfig.pixiv.ranking.sources。`,
    ))
  }

  throw new Error(errors.join(' / ') || '所有数据源都不可用')
}

/* ---------------- 缓存 ---------------- */

const CACHE_PREFIX = 'pixiv-ranking-v2:'

interface CachePayload {
  date: string
  savedAt: number
  pages: Record<string, PixivArtwork[]>
  sources: Record<string, string>
}

function cacheKey(mode: string, date: string) {
  return `${CACHE_PREFIX}${mode}:${date}`
}

export function readCache(mode: string, date: string) {
  if (typeof localStorage === 'undefined')
    return null
  try {
    const raw = localStorage.getItem(cacheKey(mode, date))
    if (!raw)
      return null
    const parsed = JSON.parse(raw) as CachePayload
    if (parsed.date !== date || !parsed.pages)
      return null
    return parsed
  }
  catch {
    return null
  }
}

export function writeCache(mode: string, date: string, payload: CachePayload) {
  if (typeof localStorage === 'undefined')
    return
  try {
    localStorage.setItem(cacheKey(mode, date), JSON.stringify(payload))
  }
  catch {
    // 配额满就放弃缓存，不影响功能
    try {
      localStorage.removeItem(cacheKey(mode, date))
    }
    catch {}
  }
}
