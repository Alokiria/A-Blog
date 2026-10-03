<script lang="ts" setup>
/**
 * 卡片图鉴：带搜索框 + 标签筛选，卡片下方写名字。
 *
 * 用于手游卡图这类「数量多、需要按角色/稀有度找」的合集。
 * 卡片尺寸故意做得小，一行能放很多张。
 */
import type { AlbumCard } from '../../albums'
import { useAlbumThumb } from '../../composables/album-thumb'
import { useAlbumZoom } from '../../composables/album-zoom'
import { useTagFilter } from '../../composables/tag-filter'
import { isClient, useScrollLock } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  cards?: AlbumCard[]
  /** 搜索框占位符 */
  placeholder?: string
}>(), {
  cards: () => [],
  placeholder: '搜索名字 / 附注 / 标签…',
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
} = useTagFilter<AlbumCard>({
  items: () => props.cards,
  getTags: c => c.tags,
  getSearchText: c => [c.name, c.meta ?? '', c.desc ?? '', ...(c.tags ?? [])],
})

/** filtered 里的项 → 原数组下标（用于记失败状态） */
function originIndex(card: AlbumCard) {
  return props.cards.indexOf(card)
}

/**
 * 网格里显示的缩略图：写了 `cover` 就用 `cover`，否则用原图 `src`；
 * `cover` 加载失败会自动退回 `src`，两个都挂了才显示占位图标
 * （逻辑见 composables/album-thumb.ts）。
 */
const { srcOf: thumbOf, isBroken, markFailed: markThumbFailed } = useAlbumThumb()

/** 某项当前该显示的缩略图地址 */
function thumbUrl(card: AlbumCard) {
  return thumbOf(card, originIndex(card))
}

/** 某项的缩略图和原图是不是都加载失败了 */
function thumbBroken(card: AlbumCard) {
  return isBroken(card, originIndex(card))
}

/** 缩略图加载失败：先退回原图，原图也失败才显示占位图标 */
function onThumbError(card: AlbumCard) {
  markThumbFailed(card, originIndex(card))
}

/* ---------------- 大图 ---------------- */

const index = ref(-1)
const open = computed(() => index.value >= 0)
const current = computed<AlbumCard | undefined>(() => filtered.value[index.value])

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
  useScrollLock(document.body, open)

// 筛选后索引可能越界
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
</script>

<template>
  <div class="card-gallery">
    <!-- 工具栏 -->
    <div class="album-bar">
      <div class="album-search">
        <span i-ri-search-line class="album-search__icon" />
        <input v-model="keyword" type="search" :placeholder="placeholder" enterkeyhint="search">
        <button v-if="keyword" class="album-search__clear" title="清空" @click="keyword = ''">
          <span i-ri-close-line />
        </button>
      </div>

      <span class="album-bar__count">
        <template v-if="hasFilter">{{ filtered.length }} / {{ cards.length }}</template>
        <template v-else>{{ cards.length }} 张</template>
      </span>

      <button v-if="hasFilter" class="album-reset" @click="reset">
        重置
      </button>
    </div>

    <!-- 标签筛选（可多选） -->
    <div v-if="tags.length" class="album-tags">
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
    <div v-if="selectedTags.length" class="album-tagbar">
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

    <!-- 卡片网格 -->
    <div v-if="filtered.length" class="card-grid">
      <figure v-for="(card, i) in filtered" :key="`${card.src}-${i}`" class="card-item">
        <button type="button" class="card-item__trigger" :title="card.name" @click="index = i">
          <img
            v-if="!thumbBroken(card)"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            :src="thumbUrl(card)"
            :alt="card.name"
            @error="onThumbError(card)"
          >
          <span v-else class="card-item__broken" aria-hidden="true">
            <span i-ri-image-2-line />
          </span>
        </button>

        <figcaption class="card-item__caption">
          <span class="card-item__name">{{ card.name }}</span>
          <span v-if="card.meta" class="card-item__meta">{{ card.meta }}</span>
        </figcaption>
      </figure>
    </div>

    <!-- 空结果 -->
    <div v-else class="album-empty">
      <div i-ri-search-eye-line class="text-3xl op-30" />
      <p class="yun-text-light">没有匹配的卡片</p>
      <button class="album-reset" @click="reset">重置筛选</button>
    </div>

    <!-- 大图 -->
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
              <span v-if="current.meta" class="op-60">{{ current.meta }}</span>
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
</style>
