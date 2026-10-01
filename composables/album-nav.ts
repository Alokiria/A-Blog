/**
 * 画廊导航：把「当前打开哪个画廊」同步到 URL query，
 * 这样刷新、前进后退、分享链接都能还原。
 *
 * URL 形如 `/albums/?a=<id>`，`a` 是 `albums.ts` 里节点的 id。
 */
import { albumTree, findAlbumPath } from '../albums'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useAlbumNav() {
  const route = useRoute()
  const router = useRouter()

  const currentId = computed(() => {
    const q = route.query.a
    return typeof q === 'string' ? q : ''
  })

  /** 从根到当前节点的路径；空数组表示停在画廊首页 */
  const path = computed(() => (currentId.value ? findAlbumPath(albumTree, currentId.value) : []))

  /** 当前节点（没有就是 undefined，表示首页） */
  const current = computed(() => path.value.length ? path.value[path.value.length - 1] : undefined)

  /** 是否处于「首页」 */
  const atRoot = computed(() => !current.value)

  /** 面包屑：首页 + 祖先节点 */
  const crumbs = computed(() => [
    { id: '', caption: '画廊' },
    ...path.value.map(n => ({ id: n.id, caption: n.caption })),
  ])

  function open(id: string) {
    router.push({ query: id ? { a: id } : {} })
  }

  // 切换画廊时滚回顶部
  watch(currentId, () => {
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  return {
    currentId,
    current,
    path,
    crumbs,
    atRoot,
    open,
  }
}
