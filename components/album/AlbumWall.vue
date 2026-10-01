<script lang="ts" setup>
/**
 * 画廊卡片墙（缩略版）。
 *
 * 相比最初那版整体缩小了一档：一行放更多，封面比例更扁，
 * 名字只用一行小字，适合画廊数量多的场景。也用于「画廊里套画廊」的子分组。
 */
import type { AlbumEntry } from '../../albums'
import { countImages } from '../../albums'
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  albums: AlbumEntry[]
  /** 搜索框占位符；传空字符串可隐藏搜索 */
  placeholder?: string
}>(), {
  placeholder: '搜索画廊…',
})

const emit = defineEmits<{
  (e: 'open', id: string): void
}>()

const keyword = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw)
    return props.albums
  return props.albums.filter(a => `${a.caption} ${a.desc ?? ''}`.toLowerCase().includes(kw))
})

const hasFilter = computed(() => Boolean(keyword.value.trim()))

const failed = ref<Set<string>>(new Set())

function markFailed(url: string) {
  failed.value = new Set(failed.value).add(url)
}

/**
 * 角标：自动统计张数，不需要在数据里手写。
 * 用 countImages 递归累加，所以画廊分组显示的是「底下所有子画廊的图片总数」。
 * 没有图片时不显示角标。
 */
function badgeOf(album: AlbumEntry) {
  const n = countImages(album)
  return n ? `${n} 张` : ''
}

/** 悬停提示：分组时额外说明角标是累加值，避免和子画廊的数字对不上而困惑 */
function cardTitle(album: AlbumEntry) {
  const base = album.desc || album.caption
  if (album.children?.length) {
    const n = countImages(album)
    return n ? `${base}（含子画廊共 ${n} 张）` : base
  }
  return base
}
</script>

<template>
  <div class="album-wall">
    <div v-if="placeholder && albums.length > 3" class="album-bar">
      <div class="album-search">
        <span i-ri-search-line class="album-search__icon" />
        <input v-model="keyword" type="search" :placeholder="placeholder">
        <button v-if="keyword" class="album-search__clear" title="清空" @click="keyword = ''">
          <span i-ri-close-line />
        </button>
      </div>
      <span class="album-bar__count">
        {{ hasFilter ? `${filtered.length} / ${albums.length}` : `${albums.length} 个` }}
      </span>
      <button v-if="hasFilter" class="album-reset" @click="keyword = ''">重置</button>
    </div>

    <div v-if="filtered.length" class="album-grid">
      <button
        v-for="album in filtered"
        :key="album.id"
        type="button"
        class="album-card"
        :title="cardTitle(album)"
        @click="emit('open', album.id)"
      >
        <span class="album-card__cover">
          <img
            v-if="!failed.has(album.cover)"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            :src="album.cover"
            :alt="album.caption"
            @error="markFailed(album.cover)"
          >
          <span v-else class="album-card__broken" aria-hidden="true">
            <span i-ri-image-2-line />
          </span>
          <span v-if="badgeOf(album)" class="album-card__badge">{{ badgeOf(album) }}</span>
        </span>
        <span class="album-card__caption">「{{ album.caption }}」</span>
      </button>
    </div>

    <div v-else class="album-empty">
      <div i-ri-search-eye-line class="text-3xl op-30" />
      <p class="yun-text-light">没有匹配的画廊</p>
      <button class="album-reset" @click="keyword = ''">重置</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './album-shared.scss';

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 11px;
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(122px, 1fr));
    gap: 9px;
  }

  @media (max-width: 420px) {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 7px;
  }
}

.album-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.album-card__cover {
  position: relative;
  display: block;
  border-radius: 6px;
  overflow: hidden;
  background: rgb(128 128 128 / 0.12);

  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
  }
}

.album-card__broken {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  font-size: 20px;
  opacity: 0.35;
}

.album-card__badge {
  position: absolute;
  right: 5px;
  bottom: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.6);
  font-size: 12px;
  color: #fff;
  backdrop-filter: blur(4px);
}

.album-card__caption {
  display: block;
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
  opacity: 0.85;
  overflow-wrap: anywhere;
  transition: color 0.18s ease, opacity 0.18s ease;
}

.album-card:hover,
.album-card:focus-visible {
  .album-card__cover img {
    transform: scale(1.04);
    box-shadow: 0 6px 16px rgb(0 0 0 / 0.26);
  }

  .album-card__caption {
    color: var(--va-c-primary);
    opacity: 1;
  }
}

.album-card:focus-visible {
  outline: 2px solid var(--va-c-primary);
  outline-offset: 3px;
  border-radius: 6px;
}
</style>
