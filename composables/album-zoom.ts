/**
 * 大图缩放：滚轮缩放（以鼠标位置为中心）、手机双指捏合（以双指中点为中心），
 * 放大后可以拖动查看，回到原始大小时自动居中。
 *
 * 为什么抽成 composable：卡片图鉴和照片墙是两个独立组件，但灯箱的缩放手感
 * 必须完全一致；逻辑放这里，两边只负责接线（灯箱样式见 album-shared.scss）。
 *
 * ## 缩放范围：不设上限，但会告诉你什么时候超过了原图
 *
 * 灯箱 1x 显示的是「适应窗口」的尺寸（比如 4000px 宽的图缩到 960px 显示），
 * 此时屏幕上一个像素其实只用到原图 0.24 个像素。放大就是让这个比例靠向 1，
 * 到 `1 个原图像素 = 1 个屏幕像素` 时画面最清晰、细节最多 —— 这就是「100% 原图尺寸」。
 * 再往上放浏览器只能拿有限的像素去插值，会越来越糊，所以：
 *
 *     nativeRatio = 原图宽度 / 适应窗口时的显示宽度     （上面那个例子是 4.17 倍）
 *     nativePercent = 当前缩放 / nativeRatio × 100      （按钮上显示的就是它）
 *
 * - **不限死上限**，想放到多大都行；超过 100% 时按钮会写「超过原图」提醒。
 * - 超过 100% 之后改用 `image-rendering: pixelated`：一个原图像素就画成一块，
 *   不再做平滑插值 —— 漫画的线条和文字反而更清楚（这也让放大后的「糊」变成「方块」，
 *   看得见到底有没有更多细节）。
 * - 想重新限死上限（比如按原图尺寸封顶）：给 `options.max` 传一个倍数即可。
 *
 * ## 变换模型
 *
 * 图片用 `transform: translate(tx, ty) scale(s)`，原点在图片中心。
 * 屏幕（视口）上一点 p 对应的「图片内部点」是 d = (p - c - t) / s，
 * 其中 c 是**未缩放时**图片的中心。要让 d 在缩放后仍然停在 p：
 *
 *     t' = u - (u - t) * (s' / s)        （u = p - c）
 *
 * 滚轮和双指都只是「换个锚点套这个公式」：滚轮锚点是鼠标，双指锚点是两指中点。
 */
import type { WatchSource } from 'vue'
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'

export interface AlbumZoomOptions {
  /** 最小缩放；1 = 适应窗口（默认不允许缩得比窗口还小） */
  min?: number
  /** 硬上限；默认不设（`Infinity`）。想按倍数封顶就传，比如 `max: 8` */
  max?: number
  /** 滚轮灵敏度：每 1 像素 deltaY 对应的缩放指数 */
  sensitivity?: number
}

/** 视口里的一个点 */
interface Point {
  x: number
  y: number
}

export function useAlbumZoom(source: WatchSource<unknown>, options: AlbumZoomOptions = {}) {
  const min = options.min ?? 1
  const max = options.max ?? Number.POSITIVE_INFINITY
  const sensitivity = options.sensitivity ?? 0.0018
  /** 单次缩放的最大倍数（防止一次超大的滚轮 / 捏合事件直接甩飞） */
  const stepMax = 1.5

  /** 缩放舞台（裁剪放大后图片的容器）；模板里 `ref="stage"` */
  const stage = ref<HTMLElement | null>(null)
  /** 大图本体；模板里 `ref="image"` */
  const image = ref<HTMLImageElement | null>(null)

  const scale = ref(min)
  const tx = ref(0)
  const ty = ref(0)
  /** 有指针按着（配合 .is-zoomed 显示抓取光标） */
  const panning = ref(false)

  /** 原图像素尺寸（图片 load 之后才知道） */
  const natural = ref({ w: 0, h: 0 })
  /** 1x（适应窗口）时图片的显示宽度 */
  const fitWidth = ref(0)

  /** 是否处于放大状态 */
  const zoomed = computed(() => scale.value > min + 0.001)

  /**
   * 原图相对 1x 的倍数。放大到这个倍数 = 100% 原图尺寸，
   * 也就是「再往上放只会更糊」的那个临界点。
   */
  const nativeRatio = computed(() => {
    if (!natural.value.w || !fitWidth.value)
      return 1
    return Math.max(1, natural.value.w / fitWidth.value)
  })

  /** 允许的最大缩放（默认不设上限） */
  const maxScale = computed(() => max)

  /** 是否已经放大到超过原图（这时浏览器只能插值，画面只会越来越糊） */
  const isUpscaled = computed(() =>
    !!natural.value.w && !!fitWidth.value && scale.value > nativeRatio.value + 1e-6,
  )

  /** 相对原图尺寸的百分比（100% = 一个原图像素对一个屏幕像素） */
  const nativePercent = computed(() => Math.round((scale.value / nativeRatio.value) * 100))

  /** 按钮上的文字：没放大时当提示，放大后是「倍率 · 重置」 */
  const zoomLabel = computed(() => (zoomed.value ? `${nativePercent.value}% · 重置` : '滚轮 / 双指缩放'))

  /** 悬停提示：倍率右边那截统一写「重置」，是否超过原图就在提示里说明 */
  const zoomTitle = computed(() => {
    if (!zoomed.value)
      return '滚轮缩放，手机双指缩放，双击也可放大'
    const p = nativePercent.value
    if (p > 100)
      return '已超过原图分辨率（画面是插值放大的），点击重置'
    if (p === 100)
      return '正好 1:1，一个原图像素对一个屏幕像素；点击重置'
    return '点击重置，回到适应窗口'
  })

  /**
   * 图片的内联样式。
   *
   * 超过原图之后切到 `pixelated`：一个原图像素画成一块，不做平滑插值。
   * 漫画这种线条画 + 文字，放大了反而更清楚（插值只会糊成一片灰）。
   */
  const imageStyle = computed(() => {
    const style: Record<string, string> = {}
    if (zoomed.value || tx.value || ty.value)
      style.transform = `translate3d(${tx.value}px, ${ty.value}px, 0) scale(${scale.value})`
    // if (isUpscaled.value)
    //   style.imageRendering = 'pixelated'
    return Object.keys(style).length ? style : undefined
  })

  /**
   * 量一下原图尺寸和「适应窗口」的显示尺寸。
   *
   * 只有 1x（没有 transform）时量到的宽度才是适应窗口的宽度，所以其他时候只更新原图尺寸。
   */
  function measure() {
    const el = image.value
    if (!el)
      return
    natural.value = { w: el.naturalWidth || 0, h: el.naturalHeight || 0 }
    if (scale.value !== min || tx.value !== 0 || ty.value !== 0)
      return

    const rect = el.getBoundingClientRect()
    if (rect.width)
      fitWidth.value = rect.width
  }

  /**
   * 未缩放时图片中心在视口里的位置。
   *
   * 直接读 `getBoundingClientRect()` 拿到的是**已经变换过**的框，
   * 所以把 translate 减掉：中心平移了 t，尺寸缩放不改变中心。
   */
  function origin(): Point {
    const el = image.value
    if (!el)
      return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2 - tx.value,
      y: rect.top + rect.height / 2 - ty.value,
    }
  }

  /**
   * 把平移限制住：放大出来的那部分才算可拖范围，没放大或图片比舞台小时一律居中。
   *
   * 用 offsetWidth（布局尺寸，不受 transform 影响）算，所以不会越算越偏。
   */
  function clamp() {
    const el = image.value
    const box = stage.value
    if (!el || !box)
      return
    const mx = Math.max(0, (el.offsetWidth * scale.value - box.clientWidth) / 2)
    const my = Math.max(0, (el.offsetHeight * scale.value - box.clientHeight) / 2)
    tx.value = Math.min(mx, Math.max(-mx, tx.value))
    ty.value = Math.min(my, Math.max(-my, ty.value))
  }

  /** 回到原始大小并居中 */
  function resetZoom() {
    scale.value = min
    tx.value = 0
    ty.value = 0
  }

  /** 以视口里的某个点为中心缩放 */
  function zoomAt(point: Point, factor: number) {
    // 每次开始缩放前补量一次：窗口大小变了的话，适应窗口的尺寸也跟着变
    measure()

    const next = Math.min(maxScale.value, Math.max(min, scale.value * factor))
    if (next === scale.value)
      return

    const c = origin()
    const ux = point.x - c.x
    const uy = point.y - c.y
    const k = next / scale.value

    tx.value = ux - (ux - tx.value) * k
    ty.value = uy - (uy - ty.value) * k
    scale.value = next
    // 缩回 1 时 clamp 会把位移归零，等于自动回中
    clamp()
  }

  function onWheel(e: WheelEvent) {
    // deltaMode：0=像素 1=行 2=页，统一换算成像素；向上滚（负值）是放大
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY
    // 单次最多 1.5 倍：滚轮一格本来约 1.2 倍，这样既跟手，又不会被高分辨率滚轮
    // 或惯性甩动的一大坨 deltaY 一步甩出几百倍（捏合是连续的小比例，不需要限）
    const factor = Math.min(stepMax, Math.max(1 / stepMax, Math.exp(-dy * sensitivity)))
    zoomAt({ x: e.clientX, y: e.clientY }, factor)
  }

  /* ---------------- 拖动与双指捏合 ---------------- */

  /** 当前按下的指针；单指拖动和双指捏合共用这一份 */
  const pointers = new Map<number, Point>()
  /** 上一帧的双指状态：距离算缩放，中点算锚点和平移 */
  let pinch: { dist: number, mid: Point } | null = null
  /** 上一帧的拖动位置（鼠标 / 单指） */
  let last: Point | null = null

  function pinchState() {
    const [a, b] = [...pointers.values()]
    if (!a || !b)
      return null
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }

  function onPointerDown(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // 捕获指针：手指/鼠标移出舞台后还能继续收到 move
    stage.value?.setPointerCapture?.(e.pointerId)
    panning.value = true

    if (pointers.size === 1) {
      last = { x: e.clientX, y: e.clientY }
    }
    else {
      // 第二根手指落下，切到捏合模式
      pinch = pinchState()
      last = null
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId))
      return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.size >= 2) {
      const now = pinchState()
      if (!now)
        return
      // 两指距离变化 → 以「上一帧的中点」为锚点缩放，再整体跟着中点平移。
      // （先缩放后平移，双指对称张开时两指下的画面才不跑偏）
      if (pinch && pinch.dist > 0 && now.dist > 0)
        zoomAt(pinch.mid, now.dist / pinch.dist)
      if (pinch) {
        tx.value += now.mid.x - pinch.mid.x
        ty.value += now.mid.y - pinch.mid.y
      }
      pinch = now
      clamp()
      return
    }

    if (!last)
      return
    tx.value += e.clientX - last.x
    ty.value += e.clientY - last.y
    last = { x: e.clientX, y: e.clientY }
    clamp()
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId)
    const el = stage.value
    if (el?.hasPointerCapture?.(e.pointerId))
      el.releasePointerCapture(e.pointerId)

    if (pointers.size < 2)
      pinch = null

    // 双指松掉一根后，剩下那根接着当拖动
    const rest = [...pointers.values()][0]
    last = rest ? { ...rest } : null
    panning.value = pointers.size > 0
  }

  /** 双击（桌面端）：放大到 250%（不超过原图尺寸），已放大则回到适应窗口 */
  function onDoubleClick(e: MouseEvent) {
    if (zoomed.value)
      resetZoom()
    else
      zoomAt({ x: e.clientX, y: e.clientY }, 2.5)
  }

  // 图片换了 / 加载完了都要重新量一次（换图时也顺手回到适应窗口）
  // flush: 'sync' 是为了让 ref 一绑上就把尺寸量出来，别等到下一帧
  watch(image, (el, _old, onCleanup) => {
    if (!el)
      return
    const onLoad = () => measure()
    el.addEventListener('load', onLoad)
    measure()
    onCleanup(() => el.removeEventListener('load', onLoad))
  }, { immediate: true, flush: 'sync' })

  // 换图（上一张 / 下一张 / 关掉重开）都回到原始大小
  watch(source, resetZoom)

  /** 窗口尺寸变了，适应窗口的大小要重新量（1x 时能量准，其余时候下回缩放前会补量） */
  function onResize() {
    measure()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize, { passive: true })
    // 组件卸载时收掉监听；在组件外调用（比如单测）没有实例，跳过就好
    if (getCurrentInstance())
      onBeforeUnmount(() => window.removeEventListener('resize', onResize))
  }

  return {
    stage,
    image,
    scale,
    tx,
    ty,
    panning,
    zoomed,
    nativeRatio,
    nativePercent,
    isUpscaled,
    maxScale,
    zoomLabel,
    zoomTitle,
    imageStyle,
    resetZoom,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
  }
}
