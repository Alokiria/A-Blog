<script setup lang="ts">
import type { Post } from 'valaxy/types'
import { usePostListWithCollections, useSiteConfig } from 'valaxy'
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  type?: string
  posts?: Post[]
}>(), {})

const paginationRef = ref()
const curPage = computed(() => paginationRef.value?.curPage || 1)

const siteConfig = useSiteConfig()
const pageSize = computed(() => siteConfig.value.pageSize ?? 7)
const postListWithCollections = usePostListWithCollections({
  type: props.type,
})

const posts = computed(() => (
  props.posts || postListWithCollections.value).filter(post => import.meta.env.DEV ? true : !post.hide),
)

const displayedPosts = computed(() =>
  posts.value.slice(
    (curPage.value - 1) * pageSize.value,
    curPage.value * pageSize.value,
  ),
)

/**
 * 网格底栏 6 列，卡片跨列规则：
 *   - 前两篇 `wide`（占 3 列）→ 首行两张「封面全铺」的大卡
 *   - 其余 `normal`（占 2 列）→ 每行三张「上图下白」的小卡
 *
 * 响应式由 CSS 统一改成一整行：
 *   - ≤1024px：一行两张等宽
 *   - ≤640px ：一行一张
 */
type CardLayout = 'wide' | 'normal'

/** 首页首行的两张宽卡 */
const WIDE_COUNT = 2

const cardLayouts = computed<CardLayout[]>(() => {
  const total = displayedPosts.value.length
  if (!total)
    return []

  const wideCount = Math.min(WIDE_COUNT, total)
  return Array.from({ length: total }, (_, i) => (i < wideCount ? 'wide' : 'normal'))
})

const spanClass = (layout: CardLayout) =>
  layout === 'wide' ? 'col-span-3' : 'col-span-2'
</script>

<template>
  <div w="full" class="yun-post-list-root">
    <div
      class="yun-post-list"
      :class="displayedPosts.length ? '' : 'is-empty'"
    >
      <template v-if="!displayedPosts.length">
        <div py2 op50 text-center>
          博主还什么都没写哦～
        </div>
      </template>

      <template v-for="(route, index) in displayedPosts" :key="route.path">
        <YunPostCard
          :post="route"
          :collection="route._collection"
          :variant="cardLayouts[index] === 'wide' ? 'full' : 'cover'"
          :class="spanClass(cardLayouts[index])"
        />
      </template>
    </div>

    <YunPagination
      ref="paginationRef"
      :total="posts.length" :page-size="pageSize"
    />
  </div>
</template>

<style lang="scss">
/**
 * 首页文章网格。
 *
 * 底栏 6 列，卡片跨列由 `col-span-*` 决定，
 * 排布出「首行两张封面全铺大卡 + 其余每行三张小卡」的效果。
 * 响应式：
 *   - ≤1024px：一行两张等宽
 *   - ≤640px ：一行一张
 */
.yun-post-list-root {
  --yun-post-list-max-width: 1760px;
  --yun-post-list-gap: 1.1rem;
  /* 卡片统一高度，保证每一行都整齐 */
  --yun-post-card-height: 300px;
  /* 卡片顶部到「白卡」上沿的距离 = 高度 × (1 - 白卡占比)。
   * 直接给长度，避免在 calc 里做 length - percentage（非法）。 */
  --yun-post-card-cover-top: 165px;

  width: 100%;
  max-width: var(--yun-post-list-max-width);
  margin-inline: auto;
  padding-inline: 1rem;
}

.yun-post-list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--yun-post-list-gap);
  align-items: stretch;
  width: 100%;

  > * {
    min-width: 0;
  }

  &.is-empty {
    display: block;
  }
}

@media (width <= 1024px) {
  .yun-post-list-root {
    --yun-post-card-height: 280px;
    --yun-post-card-cover-top: 155px;
  }

  .yun-post-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    /* 平板/小屏下一律等宽 */
    > .col-span-3 {
      grid-column: span 2 / span 2;
    }
  }
}

@media (width <= 640px) {
  .yun-post-list-root {
    --yun-post-card-height: 260px;
    --yun-post-card-cover-top: 145px;
  }

  .yun-post-list {
    grid-template-columns: minmax(0, 1fr);

    > .col-span-2,
    > .col-span-3 {
      grid-column: span 1 / span 1;
    }
  }
}
</style>
