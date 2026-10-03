<script lang="ts" setup>
/**
 * 普通画廊：图片网格，图片下方写名字，点开看大图。
 *
 * 用于「一堆照片」的场景（随手拍、壁纸、番剧截图）。
 * 用 JS 按窗口宽度分列做真正的瀑布流，图片保持原始宽高比，一行能放很多张。
 */
import type { AlbumPhoto } from '../../albums'
import { useAlbumThumb } from '../../composables/album-thumb'
import { useAlbumZoom } from '../../composables/album-zoom'
import { useTagFilter } from '../../composables/tag-filter'
import { isClient, useScrollLock } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  photos?: AlbumPhoto[]
  /** 搜索框占位符；传空字符串可隐藏工具栏 */
  placeholder?: string
}>(), {
  photos: () => [],
  placeholder: '搜索名字 / 标签…',
})

const {
  keyword,
  selectedTags,
  matchMode,
  tagStats: tags,
  filtered,
  toggleTag,
  clearTags,
  reset,
  hasFilter,
} = useTagFilter<AlbumPhoto>({
  items: () => props.photos,
  getTags: p => p.tags,
  getSearchText: p => [p.name, p.desc ?? '', ...(p.tags ?? [])],
})

/**
 * 网格里显示的缩略图：写了 `cover` 就用 `cover`，否则用原图 `src`；
 * `cover` 加载失败会自动退回 `src`，两个都挂了才显示占位图标
 * （逻辑见 composables/album-thumb.ts）。
 *
 * 这里和网格下标一样用 `item.origin`（filtered 里的位置）来记失败状态。
 */
const { srcOf: thumbOf, isBroken, markFailed: markThumbFailed } = useAlbumThumb()

/* ---------------- 大图 ---------------- */

const index = ref(-1)
const open = computed(() => index.value >= 0)
const current = computed<AlbumPhoto | undefined>(() => filtered.value[index.value])

/**
 * 大图缩放：滚轮 / 双指 / 双击，逻辑见 composables/album-zoom.ts。
 * 传 `current` 进去，换图时自动回到原始大小。
 */
const {
  stage,
  image,
  panning,
  zoomed,
  zoomLabel,
  zoomTitle,
  imageStyle,
  resetZoom,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
} = useAlbumZoom(current)

if (isClient)
  useScrollLock(document.body, open as any)

watch(filtered, () => {
  if (index.value >= filtered.value.length)
    index.value = -1
})

function step(delta: number) {
  const total = filtered.value.length
  if (!total)
    return
  index.value = (index.value + delta + total) % total
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value)
    return
  if (e.key === 'Escape')
    index.value = -1
  else if (e.key === 'ArrowLeft')
    step(-1)
  else if (e.key === 'ArrowRight')
    step(1)
}

watch(open, (isOpen) => {
  if (!isClient)
    return
  if (isOpen)
    document.addEventListener('keydown', onKeydown)
  else
    document.removeEventListener('keydown', onKeydown)
})

/* ---------------- 自适应列数 ---------------- */

const columnCount = ref(6)

function computeColumns() {
  if (!isClient)
    return
  const w = window.innerWidth
  if (w <= 480)
    columnCount.value = 3
  else if (w <= 768)
    columnCount.value = 4
  else if (w <= 1200)
    columnCount.value = 5
  else
    columnCount.value = 6
}

onMounted(() => {
  computeColumns()
  window.addEventListener('resize', computeColumns, { passive: true })
})

onBeforeUnmount(() => {
  if (isClient) {
    window.removeEventListener('resize', computeColumns)
    document.removeEventListener('keydown', onKeydown)
  }
})

/** 按列数把照片轮流分到各列 */
const columns = computed(() => {
  const n = columnCount.value
  const cols: { photo: AlbumPhoto, origin: number }[][] = Array.from({ length: n }, () => [])
  filtered.value.forEach((photo, i) => {
    cols[i % n].push({ photo, origin: i })
  })
  return cols
})
</script>

<template>
  <div class="photo-gallery">
    <div v-if="placeholder" class="album-bar">
      <div class="album-search">
        <span i-ri-search-line class="album-search__icon" />
        <input v-model="keyword" type="search" :placeholder="placeholder">
        <button v-if="keyword" class="album-search__clear" title="清空" @click="keyword = ''">
          <span i-ri-close-line />
        </button>
      </div>

      <span class="album-bar__count">
        <template v-if="hasFilter">{{ filtered.length }} / {{ photos.length }}</template>
        <template v-else>{{ photos.length }} 张</template>
      </span>

      <button v-if="hasFilter" class="album-reset" @click="reset">重置</button>
    </div>

    <div v-if="tags.length && placeholder" class="album-tags">
      <button
        v-for="[tag, count] in tags"
        :key="tag"
        class="album-chip"
        :class="{ 'is-active': selectedTags.includes(tag) }"
        :title="selectedTags.includes(tag) ? `取消「${tag}」` : `加上「${tag}」`"
        @click="toggleTag(tag)"
      >
        {{ tag }}
        <span class="album-chip__count">{{ count }}</span>
      </button>
    </div>

    <!-- 多选时的组合方式与已选清单 -->
    <div v-if="selectedTags.length && placeholder" class="album-tagbar">
      <span class="album-tagbar__label">已选 {{ selectedTags.length }} 个</span>

      <div v-if="selectedTags.length > 1" class="album-tagbar__mode">
        <button
          class="album-chip album-chip--mode"
          :class="{ 'is-active': matchMode === 'any' }"
          title="命中任意一个已选标签就显示"
          @click="matchMode = 'any'"
        >
          任一
        </button>
        <button
          class="album-chip album-chip--mode"
          :class="{ 'is-active': matchMode === 'all' }"
          title="同时包含所有已选标签才显示"
          @click="matchMode = 'all'"
        >
          全部
        </button>
      </div>

      <button class="album-reset album-reset--tiny" @click="clearTags">清空标签</button>
    </div>

    <div v-if="!photos.length" class="album-empty">
      <div i-ri-image-2-line class="text-3xl op-30" />
      <p class="yun-text-light">这个画廊还没有照片</p>
    </div>

    <div v-else-if="!filtered.length" class="album-empty">
      <div i-ri-search-eye-line class="text-3xl op-30" />
      <p class="yun-text-light">没有匹配的照片</p>
      <button class="album-reset" @click="reset">重置筛选</button>
    </div>

    <div v-else class="photo-masonry">
      <div v-for="(col, ci) in columns" :key="ci" class="photo-masonry__col">
        <figure v-for="item in col" :key="`${item.photo.src}-${item.origin}`" class="photo-item">
          <button type="button" :title="item.photo.name" @click="index = item.origin">
            <img
              v-if="!isBroken(item.photo, item.origin)"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              :src="thumbOf(item.photo, item.origin)"
              :alt="item.photo.name"
              @error="markThumbFailed(item.photo, item.origin)"
            >
            <span v-else class="photo-item__broken" aria-hidden="true">
              <span i-ri-image-2-line />
            </span>
          </button>
        </figure>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="album-fade">
        <div v-if="open && current" class="album-lightbox" @click.self="index = -1">
          <button class="album-lightbox__close" title="关闭 (Esc)" @click="index = -1">
            <span i-ri-close-line />
          </button>
          <button class="album-lightbox__nav is-prev" title="上一张 (←)" @click="step(-1)">
            <span i-ri-arrow-left-s-line />
          </button>

          <div class="album-lightbox__body">
            <!-- 缩放舞台：滚轮 / 双指 / 双击在这里生效，放大后可拖动 -->
            <div
              ref="stage"
              class="album-lightbox__stage"
              :class="{ 'is-zoomed': zoomed, 'is-grabbing': panning }"
              @wheel.prevent="onWheel"
              @dblclick="onDoubleClick"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
            >
              <img
                ref="image"
                referrerpolicy="no-referrer"
                :src="current.src"
                :alt="current.name"
                :style="imageStyle"
                draggable="false"
              >
            </div>
            <div class="album-lightbox__meta">
              <span>{{ current.name }}</span>
              <span class="op-50">{{ index + 1 }} / {{ filtered.length }}</span>
              <a :href="current.src" target="_blank" rel="noopener noreferrer" class="album-lightbox__link">查看原图</a>
              <button
                class="album-lightbox__zoom"
                :class="{ 'is-zoomed': zoomed }"
                :title="zoomTitle"
                @click="resetZoom"
              >
                {{ zoomLabel }}
              </button>
            </div>
            <!-- 简介：单独占一行，长文本可读性更好 -->
            <p v-if="current.desc" class="album-lightbox__desc">
              {{ current.desc }}
            </p>
          </div>

          <button class="album-lightbox__nav is-next" title="下一张 (→)" @click="step(1)">
            <span i-ri-arrow-right-s-line />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use './album-shared.scss';

/* 真正的多列瀑布流：图片保持原始比例 */
.photo-masonry {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  @media (max-width: 480px) {
    gap: 6px;
  }
}

.photo-masonry__col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    gap: 6px;
  }
}

.photo-item {
  margin: 0;

  button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 5px;
    background: rgb(128 128 128 / 0.12);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  button:hover img,
  button:focus-visible img {
    transform: scale(1.02);
    box-shadow: 0 5px 14px rgb(0 0 0 / 0.25);
  }

  // 图片下方不显示名字；文件名仍保留在 button 的 title 提示和灯箱里
}

.photo-item__broken {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 5px;
  background: rgb(128 128 128 / 0.12);
  font-size: 20px;
  opacity: 0.4;
}
</style>
