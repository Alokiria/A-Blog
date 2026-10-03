/**
 * 站内链接纠偏：把「编码层级不对」的路径还原成路由表里真实存在的 path。
 *
 * 背景见 components/AppLink.vue 顶部注释：Valaxy 的 fuse 搜索索引是从文件系统
 * 路径生成的（只 `encodeURI` 一次），而路由 path 曾经被 unplugin 和 Valaxy
 * 各编码一次（双层），两边对不上，点搜索结果会落到兜底 404 页。
 * 双层编码的根因已在 valaxy.config.ts 的 vitePluginSingleEncodedRoutePath 里修掉，
 * 这里是消费端的保险。
 *
 * 实现上不去猜对方的编码规则，而是把两边都还原成明文再比较，因此
 * 单层编码、双层编码、直接写中文都能匹配上。
 */

/**
 * 反复解码，直到解不动为止（最多 3 轮）。
 *
 * 之所以要「反复」：同一个中文路径在不同来源里的编码层数不同
 * （搜索索引 1 层、路由 path 2 层），要都还原成明文才比得出来。
 * 路径里带裸 `%`（不是合法转义）时 `decodeURI` 会抛错，此时停下即可。
 */
export function fullyDecode(value: string) {
  let current = value
  for (let round = 0; round < 3; round++) {
    let next: string
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

/**
 * 在候选路由 path 列表里，找出与 `link` 指向同一个页面的那一个。
 *
 * - 已经是合法路由 path 时原样返回（绝大多数链接走这条快路径）
 * - 找不到对应路由时也原样返回，交给 vue-router 按原有逻辑处理
 *
 * 调用方需自行排除外链与锚点（这里只兜底处理空值与 `#`）。
 */
export function resolveRoutePath(routePaths: readonly string[], link: string) {
  if (!link || link.startsWith('#'))
    return link

  if (routePaths.includes(link))
    return link

  const target = fullyDecode(link)
  return routePaths.find(path => fullyDecode(path) === target) ?? link
}
