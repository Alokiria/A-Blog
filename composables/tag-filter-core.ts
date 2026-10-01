/**
 * 标签筛选的纯逻辑（不依赖 vue，可直接单测）。
 *
 * vue 相关的响应式包装在 composables/tag-filter.ts 里，这里只放算法。
 */

export type TagMatchMode = 'any' | 'all'

export interface TaggedLike {
  tags?: string[]
}

/**
 * 判断一项是否命中已选标签。
 *
 * - `any`：命中**任意一个**已选标签即可
 * - `all`：必须**同时包含所有**已选标签
 *
 * 未选任何标签时一律视为命中。
 */
export function matchTags(
  own: string[] | undefined,
  selected: string[],
  mode: TagMatchMode = 'any',
): boolean {
  if (!selected.length)
    return true
  const list = own ?? []
  return mode === 'all'
    ? selected.every(t => list.includes(t))
    : selected.some(t => list.includes(t))
}

/** 统计标签出现次数，按次数降序（次数相同按名称），最多取 maxTags 个 */
export function countTags<T>(
  items: T[],
  getTags: (item: T) => string[] | undefined,
  maxTags = 24,
): [string, number][] {
  const counter = new Map<string, number>()
  for (const item of items) {
    for (const t of getTags(item) ?? [])
      counter.set(t, (counter.get(t) ?? 0) + 1)
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || compareTagName(a[0], b[0]))
    .slice(0, maxTags)
}

/**
 * 标签名的兜底排序。
 *
 * 刻意**不用 localeCompare**：它的结果依赖运行环境的区域设置
 * （中文区域会把汉字排在拉丁字母前，英文区域相反），
 * 导致同一个数据集在不同机器 / CI 上标签顺序不一样。
 * 这里用与区域无关的码位比较，保证顺序稳定可复现。
 * 主排序是出现次数，这个只用于次数相同的兜底，所以可读性影响很小。
 */
function compareTagName(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export interface FilterOptions<T> {
  items: T[]
  getTags: (item: T) => string[] | undefined
  getSearchText: (item: T) => string[]
  selected?: string[]
  mode?: TagMatchMode
  keyword?: string
}

/** 标签 + 关键词的组合筛选 */
export function filterItems<T>(options: FilterOptions<T>): T[] {
  const {
    items,
    getTags,
    getSearchText,
    selected = [],
    mode = 'any',
    keyword = '',
  } = options

  const kw = keyword.trim().toLowerCase()

  return items.filter((item) => {
    if (!matchTags(getTags(item), selected, mode))
      return false
    if (!kw)
      return true
    return getSearchText(item).join(' ').toLowerCase().includes(kw)
  })
}
