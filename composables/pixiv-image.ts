/**
 * Pixiv 图片反防盗链工具。
 *
 * Pixiv 的图床 `i.pximg.net` 会检查 Referer，浏览器直连必然 403。
 * 公共做法是换一个允许外链的代理域名，但这类免费代理经常挂，
 * 所以这里是「代理链」策略：同一个路径在所有候选域名上都生成一份 URL，
 * `<img>` 加载失败就换下一个，并把「哪个域名能通」记在 localStorage 里，
 * 下次直接用它，避免每次都从第一个开始试。
 */

const STORAGE_KEY = 'pixiv-image-proxy-v1'

/** 记下每个域名成功/失败的次数，优先用历史成功率高的 */
interface ProxyStat {
  ok: number
  fail: number
}

type ProxyStats = Record<string, ProxyStat>

function loadStats(): ProxyStats {
  if (typeof localStorage === 'undefined')
    return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as ProxyStats
  }
  catch {
    return {}
  }
}

let stats: ProxyStats = loadStats()

function persist() {
  if (typeof localStorage === 'undefined')
    return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }
  catch {
    // 隐私模式 / 配额满，忽略
  }
}

export function reportProxyResult(domain: string, ok: boolean) {
  const s = stats[domain] ?? (stats[domain] = { ok: 0, fail: 0 })
  if (ok)
    s.ok++
  else
    s.fail++
  persist()
}

/**
 * 代理评分：只用来「降低已知坏域名的优先级」，不改变候选链本身的配置顺序。
 * -  1：有历史数据且成功率 >= 50%
 * -  0：还没测过（保持配置顺序，让它有机会被试到）
 * - -1：有历史数据且成功率 < 50%
 */
function proxyScore(domain: string) {
  const s = stats[domain]
  if (!s)
    return 0
  const total = s.ok + s.fail
  if (total === 0)
    return 0
  return s.ok / total >= 0.5 ? 1 : -1
}

/** 把 URL 的 host 换成另一个 host，保留路径与查询 */
function hostOf(url: string) {
  return url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? ''
}

/**
 * 为一个图片 URL 生成候选链。
 *
 * 只有 Pixiv 图床（`i.pximg.net` 等）才需要换域名绕防盗链；
 * 其他图床（例如 mokeyjay 自己的 pixiv.mokeyjay.com，域名里带 pixiv 但不是 pximg）
 * 直接原样使用，否则会把好用的地址换成必然 404 的代理地址。
 *
 * 另外这里**刻意保留完整的尺寸前缀**（`c/540x540_70/...`）：
 * 去掉它等于把缩略图升级成原图，列表会被几 MB 的大图拖垮。
 *
 * @param url 图片地址
 * @param proxies 配置的代理域名列表
 * @param illustId 作品 id，用于 `i.loli.best/{id}` 这种「按 id 取原图」的兜底（原图，谨慎用）
 */
export function buildImageCandidates(
  url: string,
  proxies: string[],
  illustId?: number | string,
): string[] {
  if (!url)
    return []

  const cleaned = url.trim()
  const currentHost = hostOf(cleaned)

  // 只有 pximg 图床需要代理替换
  const isPximg = /pximg/i.test(currentHost)

  if (!isPximg) {
    // 非 pximg：原样用（这类图床通常允许外链）
    return [cleaned]
  }

  // 保留完整路径（含 c/540x540_70 这样的尺寸前缀）
  const path = cleaned.replace(/^https?:\/\/[^/]+\//i, '')

  const candidates: string[] = []

  // 1) 配置的代理链
  for (const host of proxies) {
    const clean = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    candidates.push(`https://${clean}/${path}`)
  }

  // 2) 按 id 取原图的兜底服务（返回原图，体积大，列表里应关闭）
  if (illustId != null)
    candidates.push(`https://i.loli.best/${illustId}`)

  // 3) 原地址放最后（万一本地网络能直连）
  candidates.push(cleaned)

  // 去重；把已知失败的域名往后放，其余保持候选链的原始顺序
  const unique = [...new Set(candidates)]
  return unique
    .map((u, i) => ({ u, i, score: proxyScore(hostOf(u)) }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map(x => x.u)
}
