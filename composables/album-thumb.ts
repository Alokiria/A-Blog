/**
 * 缩略图（cover）与原图（src）的取舍。
 *
 * 卡片 / 照片都可以单独写一个 `cover`：
 *   - 网格里显示 `cover`（缩略图，可以放小图 / 压缩图 / 裁好的方图）
 *   - 点开大图看到的是 `src`（原图），「查看原图」链接也指向 `src`
 *   - 没写 `cover` → 直接用 `src` 当封面，和以前的行为完全一样
 *
 * 顺带处理加载失败：`cover` 挂了（404、图床防盗链）会自动退回 `src`，
 * 两个都挂了才显示占位图标。
 */
import type { AlbumCard, AlbumPhoto } from '../albums'
import { ref } from 'vue'

/** 卡片和照片都有 src / cover，这里只取需要的两个字段 */
export type ThumbItem = Pick<AlbumCard | AlbumPhoto, 'src' | 'cover'>

/**
 * 组件里调用一次，用返回的 srcOf / isBroken / markFailed 渲染网格。
 *
 * 失败状态按「列表下标」记录，所以同一张图在筛选前后是各自独立的，
 * 和改造前的行为一致。
 */
export function useAlbumThumb() {
    /** 下标 -> cover 加载失败（该退回 src 了） */
    const failedCovers = ref<Set<number>>(new Set())
    /** 下标 -> 退回 src 之后仍然失败（该显示占位图标了） */
    const failedSources = ref<Set<number>>(new Set())

    /** 网格里这一项该显示的图：cover 优先，没写 / 挂了就退回 src */
    function srcOf(item: ThumbItem, i: number): string {
        return item.cover && !failedCovers.value.has(i) ? item.cover : item.src
    }

    /** 当前显示的图是不是已经加载失败了（用来看要不要渲染占位图标） */
    function isBroken(item: ThumbItem, i: number): boolean {
        const showingCover = Boolean(item.cover) && !failedCovers.value.has(i)
        return !showingCover && failedSources.value.has(i)
    }

    /** `<img @error>` 里调用：先让 cover 退位，再退到占位图标 */
    function markFailed(item: ThumbItem, i: number): void {
        if (item.cover && !failedCovers.value.has(i)) {
            failedCovers.value = new Set(failedCovers.value).add(i)
            return
        }
        failedSources.value = new Set(failedSources.value).add(i)
    }

    return { srcOf, isBroken, markFailed }
}
