import type { Router } from 'vue-router'

/**
 * 返回上一页时，回到离开该页面时的滚动位置。
 *
 * ## 问题
 *
 * 从首页/归档页滚到第 N 屏，点进一篇文章，再点浏览器的「返回」，
 * 列表页总是从头开始 —— 位置丢了。
 *
 * ## 根因
 *
 * Valaxy 在客户端创建 router 时写死了一个「路径变了就回顶」的滚动行为
 * （`node_modules/valaxy/client/main.ts`，本仓库未修改该文件）：
 *
 * ```ts
 * const router = createRouter({
 *   history,
 *   routes: routesWithLayout,
 *   scrollBehavior(to, from) {
 *     if (to.path !== from.path)
 *       return { top: 0 }
 *   },
 * })
 * ```
 *
 * 注意它**没有接第三个参数 `savedPosition`**：无论前进还是后退，
 * 只要路径变了就一律 `{ top: 0 }`。
 *
 * 顺带一提，`valaxy.config.ts` 里的 `router.scrollBehavior` 对客户端无效 ——
 * 那个配置只在 Node 端扫描路由时被消费，运行时用的是上面这段硬编码。
 * 所以恢复逻辑只能从运行时侧注册，目前由根组件 `App.vue` 调用本文件。
 *
 * ## 为什么「判断是否为后退」不能靠 popstate
 *
 * 直觉做法是监听 `popstate` 打一个「这是历史导航」的标记。**这条路走不通**：
 * vue-router 的 popstate 处理器是在 `createRouter()` 时注册的，而我们只能在
 * 应用挂载后才能注册监听器，所以顺序必然是
 *
 * ```text
 * firePopstate
 *   -> vue-router 的处理器：跑完 beforeEach / 导航 / afterEach / 回顶
 *   -> 我们的处理器：此时才打标记（已经晚了）
 * ```
 *
 * 也就是说 `afterEach` 里永远读不到那个标记。
 *
 * ## 实际做法：用「这个地址之前访问过没有」判断
 *
 * 换个角度想，要区分的情况其实只有两类：
 *
 * - 第一次进入某地址（点链接跳新页面）-> 应该回顶；
 * - 又回到一个访问过的地址（前进/后退，或点链接回到老页面）-> 应该恢复原位。
 *
 * 所以只要记录「哪些地址访问过」，就能在 `afterEach` 里直接判断，
 * 完全不需要知道这次导航是 push 还是 pop：
 *
 * - `beforeEach`：此刻页面还是「即将离开的那一页」，把它的 `scrollY` 记到
 *   `departingUrl` 名下。**每次导航都记** —— 第一次离开列表页通常是
 *   「点击链接」（push），只记历史导航的话第一次返回就查不到位置。
 * - `afterEach`：看「这次到达的地址」是否访问过。访问过就恢复，否则只登记。
 *
 * 恢复放在 `requestAnimationFrame` 里，保证排在 Valaxy 的回顶之后执行。
 *
 * ## 为什么要「等一帧 + 等图片」
 *
 * `afterEach` 触发时新页面的 DOM 往往还没提交，文档高度可能还是旧页面/空白的，
 * 此时 `window.scrollTo(0, 1800)` 会被浏览器截断成「当前能滚到的最大值」。
 * 所以先等一个 `requestAnimationFrame`；若届时文档还不够高（懒加载图片没撑开），
 * 再等图片解码完成，并带超时兜底。
 *
 * ## 已知取舍
 *
 * 位置只存在内存里，刷新页面后按浏览器默认行为处理，不会沿用旧位置。
 */

/** 等待图片/布局就绪的最长时间，超时后按当前文档高度能滚到哪算哪 */
const RESTORE_TIMEOUT = 1000

/** 滚动到目标位置时用 `'instant'`，避免出现「慢慢滑上去」的动画 */
const INSTANT: ScrollBehavior = 'instant'

/**
 * 地址 -> 访问过的标记。
 *
 * 用来区分「首次进入」与「回到访问过的页面」。
 * 用 `route.fullPath`（含 query 与 hash）当键。
 */
const visited = new Set<string>()

/**
 * 地址 -> 离开该地址时的滚动位置。
 *
 * 键用 `route.fullPath`，不用 `history.state.key`：后者在 popstate 时会被
 * vue-router 提前换成目标项的 state，和 `scrollY` 配不上对（见文件头说明）。
 */
const positions = new Map<string, number>()

/**
 * 取路由对象对应的地址字符串。
 *
 * 优先用 `fullPath`（含 query 与 hash），退化时用 `path`。
 * `App.vue` 里传入的是完整路由对象，所以正常都走第一条分支。
 */
function urlOf(route: unknown): string {
  if (typeof route === 'string')
    return route
  const r = route as { fullPath?: string, path?: string } | null | undefined
  return r?.fullPath ?? r?.path ?? ''
}

/**
 * 滚动目标是否已经「够得着」。
 *
 * 返回 `false` 表示文档还不够高（懒加载图片没撑开），需要等一等再恢复。
 */
function canReach(top: number): boolean {
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
  )
  return top <= height - window.innerHeight + 1
}

/**
 * 立刻把页面拉回指定位置。
 *
 * 显式写 `'instant'` 是因为部分浏览器会继承 `html { scroll-behavior: smooth }`，
 * 那样 `window.scrollTo` 也会变平滑。
 */
function applyScroll(top: number) {
  window.scrollTo({ top, left: 0, behavior: INSTANT })
}

/**
 * 恢复滚动位置；若此刻文档还不够高（懒加载图片没撑开），
 * 先滚到当前能到的位置，等图片解码完成后再精确恢复一次。
 *
 * 只看 `loading !== 'lazy'` 的图片：懒加载图片要等它进入视口才会开始加载，
 * 在这里等它们会死等到底 —— 而它们本来也不需要等，因为浏览器会在滚动到位后
 * 自己触发加载。
 */
function restoreAfterImages(top: number) {
  // 先滚一次（浏览器会自行截断到能到的最大位置）。
  // 这样用户至少落在靠近目标的地方，而不是被留在页面顶部。
  applyScroll(top)

  const pending = Array.from(document.images).filter(
    img => img.loading !== 'lazy' && !img.complete,
  )

  if (pending.length === 0)
    return

  let settled = false
  const finish = () => {
    if (settled)
      return
    settled = true
    applyScroll(top)
  }

  // 每张图加载完成都试一次：图片是逐个解码的，没必要等最后一张。
  const tryFinish = () => {
    if (canReach(top))
      finish()
  }

  for (const img of pending) {
    img.addEventListener('load', tryFinish, { once: true })
    img.addEventListener('error', tryFinish, { once: true })
  }

  // 兜底：图片挂了或网络太慢，也不能让用户卡在这里
  window.setTimeout(finish, RESTORE_TIMEOUT)
}

/** 在下一帧恢复滚动位置（此时新页面的 DOM 通常已提交，且已排在回顶之后） */
function scheduleRestore(top: number) {
  window.requestAnimationFrame(() => {
    if (canReach(top))
      applyScroll(top)
    else
      restoreAfterImages(top)
  })
}

/**
 * 可选的排查日志。
 *
 * 默认静默；在浏览器控制台执行 `window.__VA_SCROLL_DEBUG__ = true` 再复现，
 * 就能看到每次导航的「出发地 / 目的地 / 记录到的位置 / 是否恢复」。
 *
 * ```js
 * window.__VA_SCROLL_DEBUG__ = true
 * ```
 */
function debug(message: string) {
  if ((window as any).__VA_SCROLL_DEBUG__)
    console.warn(`[scroll-restore] ${message}`)
}

/**
 * 注册滚动位置记忆/恢复。
 *
 * 必须在浏览器环境调用，且只应调用一次 —— 目前由根组件 `App.vue` 调用。
 *
 * @param router vue-router 实例（`useRouter()`）
 */
export function setupScrollRestore(router: Router) {
  /**
   * 上一次「停在」的地址，也就是下一次导航的出发地。
   *
   * 自己维护而不用 `window.location`：popstate 触发时浏览器已经把地址换成目标页了，
   * 拿不到出发地。初值优先取当前路由（注册时 client 端已有正确值），
   * 退化时用 `window.location`。
   */
  let departingUrl = urlOf(router.currentRoute.value)
    || `${window.location.pathname}${window.location.search}${window.location.hash}`

  // 当前所在地址——用户就是从这里开始浏览的，先登记为「已访问」，
  // 这样刷新后立刻返回（浏览器前进后退）也能被识别出来。
  if (departingUrl)
    visited.add(departingUrl)

  router.beforeEach(() => {
    // 此刻页面内容与 scrollY 都还属于「即将离开的那一页」，
    // 而 departingUrl 正好指向它 —— 这是唯一能正确配对两者的时机。
    if (departingUrl) {
      positions.set(departingUrl, window.scrollY)
      debug(`记录 ${departingUrl} -> scrollY=${window.scrollY}`)
    }
  })

  router.afterEach((to, _from, failure) => {
    // 导航失败/被取消时状态不可信，等下一次真正的导航
    if (failure)
      return

    const arrivedUrl = urlOf(to)
    if (!arrivedUrl)
      return

    // 先把记录读出来，再更新 departingUrl，避免读到自己刚写入的值
    const saved = positions.get(arrivedUrl)
    const isRevisit = visited.has(arrivedUrl)

    // 登记本次到达的地址，供下次判断与快照使用
    visited.add(arrivedUrl)
    departingUrl = arrivedUrl

    debug(`到达 ${arrivedUrl}：访问过=${isRevisit} 记录位置=${saved ?? '无'}`)

    // 带锚点的地址交给 ValaxyMain.vue 原有的平滑滚动逻辑处理
    if (to.hash)
      return

    // 首次进入这个地址 -> 保持 Valaxy 原来的回顶行为。
    // 注意不能把 `saved === 0` 当成「没有记录」：用户可能就是在页面顶部离开的，
    // 那回到顶部本来就是正确结果。
    if (!isRevisit || saved == null || saved <= 0)
      return

    debug(`恢复 ${arrivedUrl} -> scrollY=${saved}`)
    scheduleRestore(saved)
  })
}
