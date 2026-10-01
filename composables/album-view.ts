/**
 * 画廊视图判定。
 *
 * 抽成纯函数是为了能直接单测：节点带哪种数据 → 渲染成哪种视图。
 * 组件和测试都用这一个实现，避免两边逻辑漂移。
 */
import type { AlbumEntry } from '../albums'

export type AlbumViewKind = 'albums' | 'cards' | 'photos'

/**
 * 判定一个画廊节点该渲染成什么。
 *
 * 优先级：children（画廊分组）> cards（卡片图鉴）> photos（普通画廊）。
 * 没有数据时按有没有 `cards` 字段兜底，这样「配好了但还没填数据」的画廊
 * 打开后看到的是空图鉴而不是错误视图。
 *
 * @param node 当前节点；传 undefined 表示画廊首页
 */
export function resolveAlbumView(node?: AlbumEntry): AlbumViewKind {
  if (!node)
    return 'albums'
  if (node.children?.length)
    return 'albums'
  if (node.cards?.length)
    return 'cards'
  if (node.photos?.length)
    return 'photos'
  // 空画廊兜底
  return node.cards ? 'cards' : 'photos'
}

/** 该节点下要展示的子画廊列表（首页用整棵树） */
export function albumsOf(node: AlbumEntry | undefined, tree: AlbumEntry[]): AlbumEntry[] {
  return node ? (node.children ?? []) : tree
}
