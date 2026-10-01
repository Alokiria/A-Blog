/**
 * 标签多选筛选（响应式包装）。
 *
 * 算法在 composables/tag-filter-core.ts，这里只负责把它接到 vue 的 ref/computed 上。
 * 抽开的原因：卡片图鉴（CardGrid）和普通相册（PhotoWall）用的是同一套逻辑，
 * 之前两处各写一遍；而且纯逻辑单独放可以直接单测。
 */
import type { TagMatchMode } from './tag-filter-core'
import { countTags, filterItems } from './tag-filter-core'
import { computed, ref } from 'vue'

export type { TagMatchMode }

export interface UseTagFilterOptions<T> {
  /** 数据源 */
  items: () => T[]
  /** 从一项里取出它的标签 */
  getTags: (item: T) => string[] | undefined
  /** 参与关键词搜索的文本字段 */
  getSearchText: (item: T) => string[]
  /** 最多展示多少个标签按钮 */
  maxTags?: number
}

export function useTagFilter<T>(options: UseTagFilterOptions<T>) {
  const { items, getTags, getSearchText, maxTags = 24 } = options

  const keyword = ref('')
  /** 已选中的标签，支持多选 */
  const selectedTags = ref<string[]>([])
  /** 多选时的组合方式 */
  const matchMode = ref<TagMatchMode>('any')

  /** 标签统计：按出现次数排序，取前若干个做成筛选按钮 */
  const tagStats = computed(() => countTags(items(), getTags, maxTags))

  const filtered = computed(() => filterItems({
    items: items(),
    getTags,
    getSearchText,
    selected: selectedTags.value,
    mode: matchMode.value,
    keyword: keyword.value,
  }))

  function toggleTag(tag: string) {
    const list = selectedTags.value
    selectedTags.value = list.includes(tag)
      ? list.filter(t => t !== tag)
      : [...list, tag]
  }

  function clearTags() {
    selectedTags.value = []
  }

  /** 重置标签 + 关键词 */
  function reset() {
    selectedTags.value = []
    keyword.value = ''
  }

  const hasFilter = computed(() => Boolean(keyword.value.trim() || selectedTags.value.length))

  return {
    keyword,
    selectedTags,
    matchMode,
    tagStats,
    filtered,
    toggleTag,
    clearTags,
    reset,
    hasFilter,
  }
}
