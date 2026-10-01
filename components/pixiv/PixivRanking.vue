<script lang="ts">
/**
 * 模块级常量与纯函数放在普通 <script> 里，
 * 避免放进 setup 造成每次渲染重复创建。
 */
export const MODE_LABELS: Record<string, string> = {
  day: '日榜',
  week: '周榜',
  month: '月榜',
  rookie: '新人',
  original: '原创',
  male: '男性向',
  female: '女性向',
  ai: 'AI',
}

export const STORAGE_LAYOUT_KEY = '__pixivRankLayout'
</script>

<script lang="ts" setup>
/**
 * Pixiv 排行榜（公共反代版）
 *
 * 取数、降级、限流退避、缓存都在 `composables/pixiv-ranking.ts`，
 * 图片反防盗链在 `components/pixiv/ProxyImage.vue`。
 *
 * ⚠️ 公共反代随时可能挂掉或限流（实测密集请求会返回 429），
 * 页面已做多源降级 + 退避重试 + 当日缓存；要长期稳定请自建反代。
 */
import type { PixivArtwork } from '../../types/pixiv'
import {
  computeRankDate,
  fetchRanking,
  readCache,
  resolveRankingConfig,
  RANK_MODES,
  writeCache,
} from '../../composables/pixiv-ranking'
import { isClient } from '@vueuse/core'
import { useThemeConfig } from '../../node_modules/valaxy-theme-yun/composables'
import { computed, onMounted, ref, watch } from 'vue'
import ProxyImage from './ProxyImage.vue'

const themeConfig = useThemeConfig()

const cfg = computed(() => resolveRankingConfig(themeConfig.value.pixiv?.ranking))

/** 允许展示的榜单模式（受配置过滤） */
const modes = computed(() => {
  const allowed = cfg.value.modes
  const list = RANK_MODES.filter(m => allowed.includes(m.key))
  return list.length ? list : RANK_MODES
})

const mode = ref(modes.value[0]?.key ?? 'day')
const date = ref(computeRankDate())
const layout = ref<'masonry' | 'grid'>('masonry')

const list = ref<PixivArtwork[]>([])
const page = ref(0)
/** 初始即为 true：SSG 预渲染时先显示骨架，避免客户端取数前闪一下空状态 */
const loading = ref(true)
const loadingMore = ref(false)
const noMore = ref(false)
const errorMessage = ref('')
const sourceLabel = ref('')
const fromCache = ref(false)

/** 请求序号：快速切换模式时丢弃过期响应 */
let seq = 0

const activeMode = computed(() => modes.value.find(m => m.key === mode.value) ?? modes.value[0])
const apiMode = computed(() => activeMode.value?.mode ?? 'day')

/** 数据源是否支持翻页（URL 模板里有 {page}） */
const supportsPaging = computed(() => cfg.value.sources.some(s => s.rankUrl.includes('{page}')))

const modeLabel = (key: string) => MODE_LABELS[key] ?? key

/* ---------------- 加载 ---------------- */

async function load(reset: boolean) {
  const mySeq = ++seq
  const nextPage = reset ? 1 : page.value + 1

  if (reset) {
    loading.value = true
    errorMessage.value = ''
    noMore.value = false
    list.value = []
    page.value = 0
  }
  else {
    loadingMore.value = true
  }

  try {
    let artworks: PixivArtwork[] = []
    let label = ''

    // 第一页优先读当天缓存
    if (reset) {
      const cached = readCache(mode.value, date.value)
      if (cached) {
        artworks = cached.pages?.['1'] ?? []
        label = cached.sources?.['1'] ?? ''
        fromCache.value = true
      }
    }

    if (!artworks.length) {
      if (!isClient)
        return
      const res = await fetchRanking(cfg.value.sources, apiMode.value, nextPage, date.value)
      artworks = res.artworks
      label = res.sourceLabel
      fromCache.value = false

      if (reset) {
        writeCache(mode.value, date.value, {
          date: date.value,
          savedAt: Date.now(),
          pages: { 1: artworks },
          sources: { 1: label },
        })
      }
    }

    // 丢弃过期响应
    if (mySeq !== seq)
      return

    list.value = reset ? artworks : list.value.concat(artworks)
    page.value = nextPage
    sourceLabel.value = label

    if (!artworks.length || list.value.length >= cfg.value.maxItems)
      noMore.value = true
    // 数据源本身不支持翻页时，拿完一页就到底
    if (!supportsPaging.value)
      noMore.value = true
  }
  catch (e) {
    if (mySeq !== seq)
      return
    errorMessage.value = e instanceof Error ? e.message : String(e)
    noMore.value = true
  }
  finally {
    if (mySeq === seq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function changeMode(key: string) {
  if (mode.value === key)
    return
  mode.value = key
  load(true)
}

function changeDate(value: string) {
  if (!value || value === date.value)
    return
  date.value = value
  load(true)
}

function loadMore() {
  if (noMore.value || loading.value || loadingMore.value)
    return
  load(false)
}

function setLayout(next: 'masonry' | 'grid') {
  layout.value = next
  if (isClient)
    localStorage.setItem(STORAGE_LAYOUT_KEY, next)
}

/* ---------------- 灯箱 ---------------- */

const lightboxIndex = ref(-1)
const lightboxOpen = computed(() => lightboxIndex.value >= 0)
const current = computed<PixivArtwork | undefined>(() => list.value[lightboxIndex.value])
/** 多页作品的当前页 */
const currentPageIndex = ref(0)

const currentPage = computed(() => {
  const item = current.value
  if (!item?.pages?.length)
    return undefined
  return item.pages[Math.min(currentPageIndex.value, item.pages.length - 1)]
})

/** 图片代理链：配置的域名，交给 ProxyImage 依次尝试 */
const imageProxies = computed(() => cfg.value.imageProxies)

function openLightbox(index: number) {
  lightboxIndex.value = index
  currentPageIndex.value = 0
}

function closeLightbox() {
  lightboxIndex.value = -1
}

function step(delta: number) {
  const total = list.value.length
  if (!total)
    return
  lightboxIndex.value = (lightboxIndex.value + delta + total) % total
  currentPageIndex.value = 0
}

function stepPage(delta: number) {
  const pages = current.value?.pages?.length ?? 0
  if (pages <= 1)
    return
  currentPageIndex.value = (currentPageIndex.value + delta + pages) % pages
}

function onKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value)
    return
  if (e.key === 'Escape')
    closeLightbox()
  else if (e.key === 'ArrowLeft')
    step(-1)
  else if (e.key === 'ArrowRight')
    step(1)
  else if (e.key === 'ArrowUp')
    stepPage(-1)
  else if (e.key === 'ArrowDown')
    stepPage(1)
}

watch(lightboxOpen, (open) => {
  if (!isClient)
    return
  if (open)
    document.addEventListener('keydown', onKeydown)
  else
    document.removeEventListener('keydown', onKeydown)
})

onMounted(() => {
  if (isClient) {
    const saved = localStorage.getItem(STORAGE_LAYOUT_KEY)
    if (saved === 'masonry' || saved === 'grid')
      layout.value = saved
  }
  load(true)
})
</script>

<template>
  <div class="pixiv-ranking w-full">
    <!-- 顶部工具栏 -->
    <div class="pixiv-toolbar">
      <div class="pixiv-toolbar__row">
        <span class="pixiv-toolbar__label">榜单</span>
        <div class="pixiv-seg">
          <button
            v-for="m in modes"
            :key="m.key"
            class="pixiv-seg__item"
            :class="{ 'is-active': mode === m.key }"
            @click="changeMode(m.key)"
          >
            {{ modeLabel(m.key) }}
          </button>
        </div>
      </div>

      <div class="pixiv-toolbar__row">
        <span class="pixiv-toolbar__label">日期</span>
        <input v-model="date" type="date" class="pixiv-date" @change="changeDate(($event.target as HTMLInputElement).value)">

        <span class="pixiv-toolbar__label pixiv-toolbar__label--gap">布局</span>
        <div class="pixiv-seg pixiv-seg--small">
          <button class="pixiv-seg__item" :class="{ 'is-active': layout === 'masonry' }" @click="setLayout('masonry')">
            瀑布流
          </button>
          <button class="pixiv-seg__item" :class="{ 'is-active': layout === 'grid' }" @click="setLayout('grid')">
            网格
          </button>
        </div>
      </div>
    </div>

    <!-- 状态行 -->
    <div class="pixiv-status">
      <span v-if="loading">加载中…</span>
      <span v-else-if="errorMessage" class="pixiv-status__error">
        加载失败：{{ errorMessage }}
      </span>
      <span v-else>
        共 {{ list.length }} 项
        <template v-if="sourceLabel">
          <span class="op-40">·</span> 数据源 {{ sourceLabel }}
        </template>
        <template v-if="fromCache">
          <span class="op-40">·</span> 本地缓存
        </template>
      </span>
      <span class="op-50">· 图片经公共代理加载，若有破损可在</span>
    </div>

    <!-- 骨架 -->
    <div v-if="loading" class="pixiv-masonry" aria-hidden="true">
      <div v-for="i in 8" :key="i" class="pixiv-skeleton" :style="{ height: `${180 + (i % 4) * 60}px` }" />
    </div>

    <!-- 空态 / 错误 -->
    <div v-else-if="!list.length" class="pixiv-empty">
      <div i-ri-emotion-sad-line class="text-5xl op-30" />
      <p class="yun-text-light">
        {{ errorMessage ? '这个日期的榜单没取到，可能是公共反代挂了或限流了，换个日期或稍后再试。' : '这个日期没有数据，换一天看看。' }}
      </p>
      <button class="pixiv-retry" @click="load(true)">
        <span i-ri-refresh-line />
        重试
      </button>
    </div>

    <!-- 列表 -->
    <div v-else :class="layout === 'masonry' ? 'pixiv-masonry' : 'pixiv-grid'">
      <figure v-for="(item, index) in list" :key="`${item.id}-${index}`" class="pixiv-card">
        <button class="pixiv-card__trigger" :title="item.title" @click="openLightbox(index)">
          <ProxyImage
            :src="item.pages[0]?.thumb || item.pages[0]?.large || ''"
            :illust-id="item.id"
            :proxies="imageProxies"
            :alt="item.title"
            :fallback-by-id="false"
            skeleton
          />
          <span v-if="item.rank" class="pixiv-card__rank">#{{ item.rank }}</span>
          <span v-if="(item.pages?.length ?? 0) > 1" class="pixiv-card__pages">
            <span i-ri-file-copy-2-line />
            {{ item.pages.length }}
          </span>
          <figcaption class="pixiv-card__info">
            <span class="pixiv-card__title">{{ item.title }}</span>
            <span class="pixiv-card__author">@{{ item.author }}</span>
          </figcaption>
        </button>
      </figure>
    </div>

    <!-- 加载更多 -->
    <div v-if="list.length && !loading" class="pixiv-more">
      <button v-if="!noMore && supportsPaging" class="pixiv-retry" :disabled="loadingMore" @click="loadMore">
        <span v-if="loadingMore" i-ri-loader-4-line class="animate-spin" />
        <span v-else i-ri-add-line />
        {{ loadingMore ? '加载中…' : '加载更多' }}
      </button>
      <span v-else class="yun-text-light text-sm op-60">
        {{ supportsPaging ? '已经到底了' : '当前数据源不支持翻页，切换榜单或日期查看更多' }}
      </span>
    </div>

    <!-- 灯箱 -->
    <Teleport to="body">
      <Transition name="pixiv-fade">
        <div v-if="lightboxOpen && current" class="pixiv-lightbox" @click.self="closeLightbox">
          <button class="pixiv-lightbox__close" title="关闭 (Esc)" @click="closeLightbox">
            <span i-ri-close-line />
          </button>

          <button class="pixiv-lightbox__nav is-prev" title="上一个作品 (←)" @click="step(-1)">
            <span i-ri-arrow-left-s-line />
          </button>

          <div class="pixiv-lightbox__body">
            <ProxyImage
              v-if="currentPage"
              :key="currentPage.large"
              :src="currentPage.large"
              :illust-id="current.id"
              :proxies="imageProxies"
              :alt="current.title"
              :no-referrer="false"
              class="pixiv-lightbox__img"
            />

            <div class="pixiv-lightbox__meta">
              <span class="font-medium">{{ current.title }}</span>
              <a
                v-if="current.authorId"
                :href="`https://www.pixiv.net/users/${current.authorId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="op-80 hover:op-100"
              >@{{ current.author }}</a>
              <span v-else class="op-80">@{{ current.author }}</span>

              <span v-if="(current.pages?.length ?? 0) > 1" class="pixiv-lightbox__pager">
                <button title="上一页 (↑)" @click="stepPage(-1)">↑</button>
                {{ currentPageIndex + 1 }} / {{ current.pages.length }}
                <button title="下一页 (↓)" @click="stepPage(1)">↓</button>
              </span>

              <span class="op-40">{{ lightboxIndex + 1 }} / {{ list.length }}</span>

              <a
                :href="current.url"
                target="_blank"
                rel="noopener noreferrer"
                class="pixiv-lightbox__link inline-flex items-center gap-1"
              >
                <span i-ri-external-link-line />
                在 Pixiv 查看
              </a>
            </div>

            <div v-if="current.tags?.length" class="pixiv-lightbox__tags">
              <a
                v-for="tag in current.tags.slice(0, 12)"
                :key="tag"
                :href="`https://www.pixiv.net/tags/${encodeURIComponent(tag)}/artworks`"
                target="_blank"
                rel="noopener noreferrer"
              >#{{ tag }}</a>
            </div>
          </div>

          <button class="pixiv-lightbox__nav is-next" title="下一个作品 (→)" @click="step(1)">
            <span i-ri-arrow-right-s-line />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use './pixiv-shared.scss';

/* ---------------- 工具栏 ---------------- */

.pixiv-toolbar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.pixiv-toolbar__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.pixiv-toolbar__label {
  font-size: 12px;
  opacity: 0.65;

  &--gap {
    margin-left: 8px;
  }
}

.pixiv-seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 2px;
  border-radius: 999px;
  background: rgb(128 128 128 / 0.1);
}

.pixiv-seg__item {
  padding: 2px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &:hover {
    background: rgb(128 128 128 / 0.14);
  }

  &.is-active {
    background: var(--va-c-primary);
    color: #fff;
  }
}

.pixiv-seg--small .pixiv-seg__item {
  padding: 2px 9px;
  font-size: 11px;
}

.pixiv-date {
  padding: 2px 9px;
  border: 1px solid rgb(128 128 128 / 0.3);
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  color: inherit;
  color-scheme: light dark;
}

/* ---------------- 状态 / 空态 ---------------- */

.pixiv-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 13px;
  opacity: 0.75;
}

.pixiv-status__error {
  color: var(--va-c-danger, #e5484d);
  opacity: 1;
}

.pixiv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 16px;
  text-align: center;
}

.pixiv-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid rgb(128 128 128 / 0.3);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  color: inherit;
  cursor: pointer;
  transition: background 0.18s ease;

  &:hover:not(:disabled) {
    background: rgb(128 128 128 / 0.12);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.pixiv-more {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

/* ---------------- 卡片（网格模式覆盖） ---------------- */

/* 一行多放一些：比之前的 180px 更小，并按断点收紧 */
.pixiv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
    gap: 9px;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 8px;
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 6px;
  }
}

.pixiv-card__rank,
.pixiv-card__pages {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 7px;
  border-radius: 6px;
  background: rgb(0 0 0 / 0.6);
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  backdrop-filter: blur(4px);
}

.pixiv-card__rank {
  top: 6px;
  left: 6px;
}

.pixiv-card__pages {
  top: 6px;
  right: 6px;
}

/* ---------------- 灯箱补充 ---------------- */

.pixiv-lightbox__img {
  max-width: min(1400px, 92vw);
  max-height: 78vh;
  margin: 0 auto;
  border-radius: 8px;

  :deep(.pixiv-img__el) {
    width: auto;
    max-width: min(1400px, 92vw);
    max-height: 78vh;
    margin: 0 auto;
    object-fit: contain;
  }
}

.pixiv-lightbox__pager {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  button {
    width: 22px;
    height: 22px;
    border: 1px solid rgb(255 255 255 / 0.35);
    border-radius: 6px;
    background: transparent;
    font-size: 12px;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: rgb(255 255 255 / 0.16);
    }
  }
}

.pixiv-lightbox__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-width: 900px;
  margin: 0 auto;
  font-size: 12px;

  a {
    padding: 1px 8px;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.12);
    color: #fff;
    text-decoration: none;

    &:hover {
      background: rgb(255 255 255 / 0.24);
    }
  }
}

.pixiv-fade-enter-active,
.pixiv-fade-leave-active {
  transition: opacity 0.22s ease;
}

.pixiv-fade-enter-from,
.pixiv-fade-leave-to {
  opacity: 0;
}
</style>
