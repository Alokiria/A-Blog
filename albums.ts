/**
 * 画廊数据加载器（唯一入口）。
 *
 * ⚠️ 画册数据**不写在这个文件里**，而是放在项目根目录的 `gallery/` 文件夹里，
 * 一个画册一个文件夹，这里只负责在构建时把它们读出来、拼成画廊树：
 *
 *   gallery/
 *     astrae-oratio-card-original/   ← 文件夹名随便起，建议和 id 一致
 *       album.ts                     ← 必须有：这个画册的 id / cover / caption / desc
 *       cards.ts                     ← 可选：卡片图鉴数据（default export AlbumCard[]）
 *     demo-pictures/
 *       album.ts
 *       photos.ts                    ← 可选：普通画廊数据（default export AlbumPhoto[]）
 *     demo-group/                    ← 里面还有子文件夹 = 画廊分组
 *       album.ts
 *       demo-group-1/
 *         album.ts
 *         cards.ts
 *
 * 读取用 Vite 的 `import.meta.glob`：**构建期静态展开**，所以 SSG 静态导出完全没问题，
 * 也不需要任何 Node 读写文件的代码（浏览器里照样能跑）。
 *   - 新增画册 = 新建文件夹 + `album.ts`，这个文件一个字都不用改
 *   - 文件夹嵌套几层，画廊树就嵌套几层；子文件夹自动成为子画廊
 *   - 只有 `album.ts` / `cards.ts` / `photos.ts` 会被打包，同目录放 md、草稿、原图都不影响
 *   - 名字以 `_` 开头的文件夹 / 文件会被忽略（临时下线一个画册：给文件夹名加个下划线）
 *   - 忘了写 `album.ts` 也不会丢数据：中间层文件夹会按文件夹名生成分组节点
 *
 * 三种节点类型（沿用原来的约定，由文件夹里有哪些数据文件决定）：
 *   - `albums` 画廊分组：文件夹里有子文件夹，内部再放子画廊，可无限嵌套
 *   - `cards`  卡片图鉴：有 cards.ts，带搜索框 + 标签筛选，卡片下面写名字
 *   - `photos` 普通画廊：有 photos.ts，纯图片网格（图片下方不写名字），点开有大图
 */

/** 卡片图鉴里的一张卡 */
export interface AlbumCard {
    /** 点开大图后看到的那张图（原图） */
    src: string
    /**
     * 网格里显示的缩略图封面。
     *
     * 不写就用 `src` 自己当封面；写了就能「列表看小图、点开看原图」，
     * 例如网格用压缩过的小图、点开才是大图，省流量也更快。
     */
    cover?: string
    /** 名字，显示在图片下方 */
    name: string
    /** 附注信息，显示在名字下方一行小字（日期、画师、分类等） */
    meta?: string
    /** 简介，点开大图后显示在图片下方 */
    desc?: string
    /** 搜索会同时匹配 name / meta / desc / tags */
    tags?: string[]
}

/** 普通画廊里的一张照片 */
export interface AlbumPhoto {
    /** 点开大图后看到的那张图（原图） */
    src: string
    /**
     * 网格里显示的缩略图封面。
     *
     * 不写就用 `src` 自己当封面；写了就能「列表看小图、点开看原图」。
     */
    cover?: string
    /** 名字。图片下方不显示，用于搜索、悬停提示和大图标题 */
    name: string
    /** 简介，点开大图后显示在图片下方 */
    desc?: string
    /** 搜索用标签，可选 */
    tags?: string[]
}

/**
 * `gallery/<画册>/album.ts` 的默认导出形状。
 *
 * 除了 id / cover 之外都能省：
 *   - 不写 `id` → 用文件夹名
 *   - 不写 `caption` → 用文件夹名
 *   - 不写 `cover` → 用 cards.ts / photos.ts 的第一张图
 *   - 不写 `order` → 和其他画册一起按文件夹名排序（`order` 越小越靠前）
 *   - 懒得分成两个文件时，也可以直接在 album.ts 里写 `cards` / `photos`
 */
export interface AlbumMeta {
    /** 唯一 id，用于 URL query（`?a=<id>`）和打开状态；默认取文件夹名 */
    id?: string
    /** 封面图；不写就用该画册第一张图的 cover，没有 cover 就用它的 src */
    cover?: string
    /** 画廊名，卡片下方显示；默认取文件夹名 */
    caption?: string
    /** 描述，鼠标悬停时的 title 提示 */
    desc?: string
    /** 排序权重，越小越靠前；不写按 0 算，同权重再按文件夹名排 */
    order?: number
    /** 卡片图鉴数据（等价于同目录的 cards.ts） */
    cards?: AlbumCard[]
    /** 普通画廊数据（等价于同目录的 photos.ts） */
    photos?: AlbumPhoto[]
}

/** 画廊分组里的一个子画廊（也就是 `gallery/` 里的一个文件夹） */
export interface AlbumEntry {
    /** 唯一 id，用于 URL query（`?a=<id>`）和打开状态 */
    id: string
    cover: string
    /** 画廊名，卡片下方显示 */
    caption: string
    /** 描述，鼠标悬停时的 title 提示 */
    desc?: string
    /**
     * 子画廊；有 children 就是「画廊分组」，内容来自本文件夹的子文件夹。
     *
     * 卡片右下角的「N 张」角标是**自动统计**的（递归累加 cards/photos 的长度），
     * 不需要在数据里手写，所以没有 badge 字段。
     */
    children?: AlbumEntry[]
    /** 卡片图鉴数据 */
    cards?: AlbumCard[]
    /** 普通画廊数据 */
    photos?: AlbumPhoto[]
}

/* ------------------------------------------------------------------ *
 * 读取 gallery/ 文件夹
 * ------------------------------------------------------------------ */

type Module<T> = { default: T }

/**
 * 名字以 `_` 开头的文件 / 文件夹一律忽略（连打包都不会进）。
 *
 * 想临时下线一个画册，把它的文件夹改名成 `_xxx` 就够了，数据不用删；
 * 半成品画册也可以先叫 `_draft` 放着。
 *
 * ⚠️ `import.meta.glob` 只认字面量，这些模式必须一行行写死，不能抽成变量再展开。
 */
const metaModules = import.meta.glob<Module<AlbumMeta>>(['./gallery/**/album.ts', '!**/_*', '!**/_*/**'], { eager: true })
const cardModules = import.meta.glob<Module<AlbumCard[]>>(['./gallery/**/cards.ts', '!**/_*', '!**/_*/**'], { eager: true })
const photoModules = import.meta.glob<Module<AlbumPhoto[]>>(['./gallery/**/photos.ts', '!**/_*', '!**/_*/**'], { eager: true })

/** 一个画册文件夹里读到的原始数据 */
interface RawAlbum {
    /** 相对 `gallery/` 的文件夹路径，例如 `demo-group/demo-group-1` */
    dir: string
    meta?: AlbumMeta
    cards?: AlbumCard[]
    photos?: AlbumPhoto[]
}

const folders = new Map<string, RawAlbum>()

/** 把 glob 的 key（`./gallery/demo-group/album.ts`）还原成文件夹路径（`demo-group`） */
function folderOf(key: string, file: string): string {
    return key.slice('./gallery/'.length, key.length - file.length - 1)
}

/** 取出（必要时新建）某个文件夹的记录；`gallery/` 根目录本身不接受配置 */
function folder(dir: string): RawAlbum | undefined {
    if (!dir)
        return undefined
    let raw = folders.get(dir)
    if (!raw) {
        raw = { dir }
        folders.set(dir, raw)
    }
    return raw
}

for (const [key, mod] of Object.entries(metaModules)) {
    const raw = folder(folderOf(key, 'album.ts'))
    if (raw)
        raw.meta = mod.default
}

for (const [key, mod] of Object.entries(cardModules)) {
    const raw = folder(folderOf(key, 'cards.ts'))
    if (raw)
        raw.cards = mod.default
}

for (const [key, mod] of Object.entries(photoModules)) {
    const raw = folder(folderOf(key, 'photos.ts'))
    if (raw)
        raw.photos = mod.default
}

/**
 * 补上「中间层」文件夹。
 *
 * 例如 `gallery/合集/第一弹/album.ts`：如果 `合集/` 里忘了放 album.ts，
 * 不补这一步的话，父节点不存在 → 整棵子树会被静默吞掉。
 * 这里给缺 album.ts 的中间层补一个空记录，它会按文件夹名变成分组节点，
 * 封面自动用第一个子画廊的。
 */
for (const dir of [...folders.keys()]) {
    let cut = dir.lastIndexOf('/')
    while (cut > 0) {
        const parent = dir.slice(0, cut)
        if (!folders.has(parent)) {
            folders.set(parent, { dir: parent })
            console.warn(`[albums] gallery/${parent}/ 里没有 album.ts，已按文件夹名生成分组节点（封面取第一个子画廊）`)
        }
        cut = parent.lastIndexOf('/')
    }
}

/* ------------------------------------------------------------------ *
 * 组装画廊树
 * ------------------------------------------------------------------ */

/** 父文件夹 -> 直接子文件夹 */
const childrenOf = new Map<string, string[]>()
for (const dir of folders.keys()) {
    const cut = dir.lastIndexOf('/')
    const parent = cut < 0 ? '' : dir.slice(0, cut)
    const siblings = childrenOf.get(parent)
    if (siblings)
        siblings.push(dir)
    else
        childrenOf.set(parent, [dir])
}

function nameOf(dir: string): string {
    const cut = dir.lastIndexOf('/')
    return cut < 0 ? dir : dir.slice(cut + 1)
}

/**
 * 同级画册排序：先比 `order`（越小越靠前），再比文件夹名。
 *
 * 这里特意不用 `localeCompare` —— 它在 Node（SSG 预渲染）和浏览器里的结果
 * 可能不一致，会造成水合前后顺序不同。直接比字符串码点，两边结果一定一样。
 */
function byOrder(a: string, b: string): number {
    const oa = folders.get(a)?.meta?.order ?? 0
    const ob = folders.get(b)?.meta?.order ?? 0
    if (oa !== ob)
        return oa - ob
    const na = nameOf(a)
    const nb = nameOf(b)
    return na < nb ? -1 : na > nb ? 1 : 0
}

/** 已经用掉的 id -> 文件夹，用来提示重复 id（重复会导致 URL 打开错画册） */
const idOwners = new Map<string, string>()

/**
 * 画册自己的封面兜底：拿这个画册第一张图来当封面。
 *
 * 优先用缩略图 `cover`，没写才用原图 `src` —— 和网格里显示的是同一张，
 * 免得画册封面突然加载一张几 MB 的原图。
 */
function firstImage(cards?: AlbumCard[], photos?: AlbumPhoto[]): string {
    const first = cards?.[0] ?? photos?.[0]
    return first?.cover || first?.src || ''
}

/** 递归把一个文件夹变成画廊节点 */
function buildEntry(dir: string): AlbumEntry {
    const raw = folders.get(dir)
    const meta = raw?.meta ?? {}
    const cards = meta.cards?.length ? meta.cards : raw?.cards
    const photos = meta.photos?.length ? meta.photos : raw?.photos
    const folderName = nameOf(dir)

    const children = (childrenOf.get(dir) ?? []).slice().sort(byOrder).map(buildEntry)

    const ownCover = meta.cover ?? firstImage(cards, photos)

    const entry: AlbumEntry = {
        id: meta.id ?? folderName,
        // 封面兜底：先用自己的 cover，再借第一张图，分组最后借第一个子画廊的封面
        cover: ownCover || children[0]?.cover || '',
        caption: meta.caption ?? folderName,
    }
    if (meta.desc)
        entry.desc = meta.desc
    if (children.length)
        entry.children = children
    if (cards?.length)
        entry.cards = cards
    if (photos?.length)
        entry.photos = photos

    // 下面几条都是「配错了才会出现」的诊断，构建日志里能直接看到
    const owner = idOwners.get(entry.id)
    if (owner)
        console.warn(`[albums] id「${entry.id}」重复：gallery/${owner} 和 gallery/${dir}，URL 里的 ?a=${entry.id} 只会打开其中一个`)
    else
        idOwners.set(entry.id, dir)

    if (cards?.length && photos?.length)
        console.warn(`[albums] gallery/${dir} 同时有 cards 和 photos，页面只会渲染卡片图鉴（分组则只渲染子画廊）`)

    if (!entry.cover)
        console.warn(`[albums] gallery/${dir} 既没有写 cover，也没有任何图片可以当封面`)

    return entry
}

/** 画廊树。`gallery/` 下的顶层画册文件夹就是 `/albums/` 页面上的一行卡片 */
export const albumTree: AlbumEntry[] = (childrenOf.get('') ?? []).slice().sort(byOrder).map(buildEntry)

/** 从根节点一路找到某个 id，返回从根到该节点的路径 */
export function findAlbumPath(tree: AlbumEntry[], id: string): AlbumEntry[] {
    for (const node of tree) {
        if (node.id === id)
            return [node]
        if (node.children?.length) {
            const sub = findAlbumPath(node.children, id)
            if (sub.length)
                return [node, ...sub]
        }
    }
    return []
}

/** 递归统计节点下的图片总数 */
export function countImages(node: AlbumEntry): number {
    let n = (node.cards?.length ?? 0) + (node.photos?.length ?? 0)
    for (const child of node.children ?? [])
        n += countImages(child)
    return n
}

export default albumTree
