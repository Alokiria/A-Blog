<script lang="ts" setup>
/**
 * 画廊浏览器：`/albums/` 页面的主体。
 *
 * 根据 `albums.ts` 里当前节点的数据形态，渲染三种视图之一：
 *   - 有 `children` → 子画廊卡片墙（可无限嵌套）
 *   - 有 `cards`    → 带搜索/筛选的卡片图鉴
 *   - 有 `photos`   → 普通画廊（图片网格 + 名字）
 *
 * 当前打开哪个画廊存在 URL query（`?a=<id>`），所以刷新和分享都能还原。
 */
import { albumTree } from '../../albums'
import { albumsOf, resolveAlbumView } from '../../composables/album-view'
import { useAlbumNav } from '../../composables/album-nav'
import AlbumWall from './AlbumWall.vue'
import CardGrid from './CardGrid.vue'
import PhotoWall from './PhotoWall.vue'
import { computed } from 'vue'

const nav = useAlbumNav()

const node = computed(() => nav.current.value)

/** 当前视图类型：见 composables/album-view.ts */
const view = computed(() => resolveAlbumView(node.value))

/** 当前要展示的画廊列表：首页用根节点，分组用 children */
const albums = computed(() => albumsOf(node.value, albumTree))

const totalImages = computed(() => {
  const n = node.value
  if (!n)
    return 0
  return (n.cards?.length ?? 0) + (n.photos?.length ?? 0)
})
</script>

<template>
  <div class="album-browser">
    <!-- 面包屑：只有进到子画廊才显示 -->
    <nav v-if="!nav.atRoot.value" class="album-crumbs" aria-label="画廊导航">
      <template v-for="(crumb, i) in nav.crumbs.value" :key="crumb.id || 'root'">
        <button
          class="album-crumbs__item"
          :class="{ 'is-current': i === nav.crumbs.value.length - 1 }"
          :disabled="i === nav.crumbs.value.length - 1"
          @click="nav.open(crumb.id)"
        >
          {{ crumb.caption }}
        </button>
        <span v-if="i < nav.crumbs.value.length - 1" class="album-crumbs__sep" aria-hidden="true">/</span>
      </template>
    </nav>

    <!-- 当前画廊的标题与描述 -->
    <header v-if="node" class="album-head">
      <h2 class="album-head__title">{{ node.caption }}</h2>
      <p v-if="node.desc" class="album-head__desc">{{ node.desc }}</p>
    </header>

    <!-- 子画廊（画廊里套画廊） -->
    <template v-if="view === 'albums'">
      <AlbumWall
        :albums="albums"
        :placeholder="nav.atRoot.value ? '搜索画廊…' : '搜索子画廊…'"
        @open="nav.open"
      />
    </template>

    <!-- 卡片图鉴 -->
    <CardGrid v-else-if="view === 'cards'" :cards="node?.cards" />

    <!-- 普通画廊 -->
    <PhotoWall v-else :photos="node?.photos" />

    <!-- 返回上一级 -->
    <div v-if="!nav.atRoot.value" class="album-foot">
      <button class="album-reset" @click="nav.open(nav.path.value.length > 1 ? nav.path.value[nav.path.value.length - 2].id : '')">
        <span i-ri-arrow-go-back-line />
        返回上一级
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './album-shared.scss';

.album-browser {
  width: 100%;
}

.album-crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.album-crumbs__item {
  padding: 2px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: var(--va-c-primary);
  cursor: pointer;
  transition: background 0.18s ease;

  &:hover:not(:disabled) {
    background: rgb(128 128 128 / 0.14);
  }

  &.is-current {
    color: var(--va-c-text);
    opacity: 0.7;
    cursor: default;
  }
}

.album-crumbs__sep {
  opacity: 0.35;
}

.album-head {
  margin-bottom: 12px;
  text-align: center;
}

.album-head__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.4;
}

.album-head__desc {
  margin: 3px 0 0;
  font-size: 12px;
  opacity: 0.65;
}

.album-foot {
  display: flex;
  justify-content: center;
  padding: 20px 0 6px;

  .album-reset {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
}
</style>
