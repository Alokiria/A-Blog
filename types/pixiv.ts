/**
 * Pixiv 数据类型定义（排行榜专用）。
 *
 * 归一化后的 `PixivArtwork` 把不同反代返回的结构统一成一种，
 * 这样渲染瀑布流 / 灯箱的代码只写一份。
 */

/** 一张图（一个作品可能是多页，每页一条） */
export interface PixivImage {
  /** 缩略图（列表展示，体积小） */
  thumb: string
  /** 大图（灯箱展示） */
  large: string
  /** 原图 */
  original: string
}

export interface PixivArtwork {
  /** 作品 id */
  id: number | string
  /** 作品标题 */
  title: string
  /** 作者名 */
  author: string
  /** 作者 Pixiv id（用于拼作者主页链接） */
  authorId?: string
  /** 标签 */
  tags?: string[]
  /** 本作品的所有页；至少一项 */
  pages: PixivImage[]
  /** 作品页地址，省略时按 id 自动生成 */
  url?: string
  /** 是否 R18 */
  r18?: boolean
  /** 榜单名次 */
  rank?: number
  /** 收藏数 */
  bookmarkCount?: number
  /** 浏览数 */
  viewCount?: number
}

/**
 * 一个数据源。
 *
 * `hibiapi` 直接返回 Pixiv App API 的原始结构（`{ illusts: [...] }`）；
 * `mokeyjay` 返回一套自定义的扁平结构（`{ data: [...], url: [...] }`）。
 * 两者的区分靠**运行时字段判断**，不靠配置，见 `fetchRanking`。
 */
export interface PixivRankingSource {
  /** 给用户看的数据源名 */
  label: string
  /** 形如 `.../api/pixiv/rank?mode={mode}&page={page}&date={date}`，占位符会被替换 */
  rankUrl: string
  /** 形如 `.../api/pixiv/source-json?_t={date}`，仅部分源需要 */
  sourceUrl?: string
  /** 请求头。注意：浏览器里不要设置 Referer（禁止修改的头），会直接抛错 */
  headers?: Record<string, string>
}

export interface PixivRankingConfig {
  /** 数据源列表，按顺序降级 */
  sources?: PixivRankingSource[]
  /** 展示的榜单模式，默认 日榜/周榜/月榜/新人/原创/男性向/女性向/AI */
  modes?: string[]
  /** 单次加载条数上限，防止点太多把公共反代点挂 */
  maxItems?: number
  /** 图片反防盗链代理链，按顺序尝试 */
  imageProxies?: string[]
}
