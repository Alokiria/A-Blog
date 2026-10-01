<script lang="ts" setup>
import type { CollectionConfig, Post } from 'valaxy'
import { formatDate, usePostCollections, useValaxyI18n } from 'valaxy'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePostProperty } from '../node_modules/valaxy-theme-yun/composables'

const props = withDefaults(defineProps<{
  post: Post
  /**
   * `full`  整卡封面全铺（首页首行的两张宽卡）
   * `cover` 上半封面 + 下半白卡（首页其余卡片）
   */
  variant?: 'full' | 'cover'
  /** 该文章所属合集（首页出现合集入口时传入，用于显示章节数） */
  collection?: CollectionConfig
}>(), {
  variant: 'cover',
})

const { t } = useI18n()
const { $tO } = useValaxyI18n()

const { icon, styles } = usePostProperty(props.post.type)

const postCollections = usePostCollections(computed(() => props.post.path || ''))

const title = computed(() => $tO(props.post.title || props.collection?.title || ''))
const categories = computed(() => props.post.categories || props.collection?.categories)
const tags = computed(() => props.post.tags || props.collection?.tags)
/** 合集卡片用合集封面兜底 */
const cover = computed(() => props.post.cover || props.collection?.cover)

const date = computed(() => (props.post.date ? formatDate(props.post.date) : ''))
const wordCount = computed(() => props.post.wordCount)
const readingTime = computed(() => props.post.readingTime)
const hasStats = computed(() => Boolean(wordCount.value || readingTime.value))

/** 合集：显示章节数量代替字数统计 */
const collectionCount = computed(() => props.collection?.items?.length ?? 0)
const showCollectionCount = computed(() => props.collection != null && collectionCount.value > 0)
</script>

<template>
  <div class="post-card-link">
    <YunCard
      class="post-card-wrapper w-full"
      :data-variant="variant"
      :data-cover="cover ? 'yes' : 'no'"
      overflow="hidden" v-bind="styles ? { style: styles } : {}"
    >
      <!-- 整卡点击层 -->
      <AppLink class="post-card-overlay" :to="post.path || ''" :aria-label="title" tabindex="0" />

      <!-- 视觉背景层：封面图 + 遮罩（压暗 / 渐白成白卡） -->
      <div class="post-card-visual" aria-hidden="true">
        <img
          v-if="cover" :src="cover" alt=""
          class="post-card-cover-img" loading="lazy" decoding="async"
        >
        <div class="post-card-shade" />
      </div>

      <!-- 文字层：
           - 大卡（full）：标签在封面顶部，标题靠左下、日期上方
           - 小卡（cover）：标签在白卡左上/右上，标题在白卡正中 -->
      <div class="post-card-inner">
        <div class="post-card-tags">
          <YunPostCategories v-if="categories" :categories="categories" />
          <YunPostCollectionBadge v-if="postCollections.length" :collections="postCollections" />
          <YunPostTags v-if="tags" :tags="tags" />
        </div>

        <!-- 标题是真正的链接：悬浮时会出现主题自带的左上/右下角括号。
             链接尺寸只包住标题本身，其余区域仍由整卡点击层接手。 -->
        <div class="post-card-center">
          <AppLink class="post-title-link" :to="post.path || ''" tabindex="-1">
            <div class="post-card-title">
              <div v-if="post.type" class="post-card-type-icon" :class="icon" /><span>{{ title }}</span>
            </div>
          </AppLink>
        </div>

        <!-- 左下日期，右下字数与预估阅读时长（合集则显示章节数） -->
        <div class="post-card-foot">
          <span v-if="date" class="post-card-date">
            <div i-ri-calendar-line />
            <time>{{ date }}</time>
          </span>
          <span v-if="showCollectionCount" class="post-card-stats">
            <span class="post-card-stat" :title="t('collection.badge')">
              <div i-ri-book-2-line />
              <span>{{ collectionCount }}</span>
            </span>
          </span>
          <span v-else-if="hasStats" class="post-card-stats">
            <span v-if="wordCount" class="post-card-stat" :title="t('statistics.word')">
              <div i-ri-file-word-line />
              <span>{{ wordCount }}</span>
            </span>
            <span v-if="readingTime" class="post-card-stat" :title="t('statistics.time')">
              <div i-ri-timer-line />
              <span>{{ readingTime }}m</span>
            </span>
          </span>
        </div>
      </div>
    </YunCard>
  </div>
</template>

<style lang="scss">
/**
 * 首页文章卡片。
 *
 * DOM：
 *   .post-card-link                        ← 网格项，跨列由 YunPostList 决定
 *     .yun-card.post-card-wrapper          ← 卡片本体（尺寸锚点）
 *       .yun-card-body
 *         .post-card-overlay               ← 整卡点击层
 *         .post-card-visual                ← 封面图 + 遮罩（绝对定位铺满）
 *         .post-card-inner                 ← 文字层
 *           .post-card-tags                ← 分类（左）/ 标签（右）
 *           .post-card-center > .post-title-link > .post-card-title
 *           .post-card-foot                ← 左下日期 / 右下字数与时长
 *
 * 层级：视觉层(0) < 文字层(1) < 整卡点击层(3) < 分类/标签与标题链接(4)。
 * 于是卡片空白处都落在整卡点击层上（点哪儿都能跳转），
 * 而分类、标签、标题链接仍能各自接收悬浮（标题会出现角括号）。
 *
 * 卡片高度由 YunPostList 的 `--yun-post-card-height` 统一给出。
 */

/* 网格项：固定高度，保证每一行都整齐 */
.post-card-link {
  display: flex;
  min-width: 0;
  height: var(--yun-post-card-height, 300px);
}

.post-card-wrapper.yun-card {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  transition: box-shadow var(--va-transition-duration), scale var(--va-transition-duration);

  &:hover {
    box-shadow: 0 6px 28px rgb(0 0 0 / 0.12);
  }
}

/* 主题容器：改成块级并撑满，让两个绝对定位层以整卡为准。
 * 主题给它加了 `items-center`，会把子元素按内容宽度收缩，必须覆盖。 */
.post-card-wrapper .yun-card-body {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* 整卡点击层 */
.post-card-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;

  &:focus-visible {
    outline: 2px solid var(--yun-focus-color);
    outline-offset: -3px;
    border-radius: var(--va-card-border-radius, 0.5rem);
  }
}

/* ------------------------------------------------------------------
 * 视觉层：封面图 + 遮罩
 * ------------------------------------------------------------------ */
.post-card-visual {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* 无封面图时的兜底底色（主色淡染） */
  background: linear-gradient(135deg, var(--va-c-bg-soft, #f3f4f6), var(--va-c-bg-light));
  background-image:
    radial-gradient(120% 120% at 15% 12%, rgb(var(--va-c-primary-rgb, 0 120 231) / 0.2) 0%, transparent 60%),
    radial-gradient(120% 120% at 88% 90%, rgb(var(--va-c-primary-rgb, 0 120 231) / 0.14) 0%, transparent 62%);
}

.post-card-cover-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: scale var(--va-transition-duration);

  .post-card-wrapper:hover & {
    scale: 1.03;
  }
}

/* 遮罩：由变体决定是「压暗」还是「渐白成白卡」 */
.post-card-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

/* ------------------------------------------------------------------
 * 文字层
 *
 * 注意：这里只能给 `position: relative`，**不能给 `z-index`**。
 * 一旦它外加 z-index 自成层叠上下文，内部胶囊/标题链接的 z-index
 * 就只能在「文字层内部」比较，整体依旧被 z-index 更高的整卡点击层
 * 压住，表现为点分类/标签时跳到文章页。
 * 保持 z-index: auto，子元素才能直接参与卡片的层叠上下文并压过点击层；
 * 而 position: relative 足以让文字盖在封面层（视觉层）之上。
 * ------------------------------------------------------------------ */
.post-card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0.8rem 1rem 0.7rem;
}

/* 分类在左、标签在右。
 * 小卡里这一行的上内边距要精确推到白卡上沿，由
 * `--yun-post-card-cover-top` 给出；把内边距算进高度，
 * 才能让标题正好落在白卡垂直中心。 */
.post-card-tags {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem 0.5rem;

  /* 分类、合集、标签各自可点，必须高于整卡点击层（z-index: 3）。
   * 这里不设 `position`/`z-index`：它同样不能自成层叠上下文，
   * 否则子胶囊的 z-index 又会被关在里面。 */
  > * {
    position: relative;
    z-index: 4;
  }
}

.post-card-center {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

/* 标题链接：只包住标题本体，悬浮时出现主题的角括号。
 * 链接自身不铺满卡片，因此不会挡住整卡点击。 */
.post-title-link {
  position: relative;
  z-index: 4;
  display: inline-block;
  max-width: 100%;
  padding: 0.55rem 1.1rem;
}

.post-card-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: var(--yun-post-title-font-family, var(--va-font-serif));
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.45;
  text-align: center;
}

/* 标题前的类型图标：跟随文字内联排布 */
.post-card-type-icon {
  display: inline-block;
  width: 1.1em;
  height: 1.1em;
  margin-inline-end: 0.3em;
  vertical-align: -0.15em;
}

/* 左下日期、右下字数与预估阅读时长 */
.post-card-foot {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  font-size: 0.78rem;
  white-space: nowrap;
}

.post-card-date,
.post-card-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.post-card-stats {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

/* ------------------------------------------------------------------
 * 变体一：整卡封面全铺（首页首行宽卡）
 *   压暗遮罩 + 白色文字；标题靠左下、坐在日期上方
 * ------------------------------------------------------------------ */
.post-card-wrapper[data-variant="full"] {
  .post-card-shade {
    background: linear-gradient(to bottom, rgb(0 0 0 / 0.45) 0%, rgb(0 0 0 / 0.08) 42%, rgb(0 0 0 / 0.68) 100%);
  }

  .post-card-inner {
    color: #fff;
  }

  .post-card-center {
    justify-content: flex-end;
    align-items: flex-start;
  }

  .post-title-link {
    padding-inline: 0.6rem 1.1rem;
  }

  .post-card-title {
    font-size: 1.3rem;
    color: #fff;
    text-align: left;
    text-shadow: 0 2px 10px rgb(0 0 0 / 0.6);
  }

  /* 悬浮角括号的颜色取自链接自身的 `currentcolor`，所以要让链接
   * 也跟着标题变白（只写 `.post-title-link` 会被主题的 `.va-link`
   * 颜色盖住，故用三层选择器提高优先级）。
   * 这样白字标题配白括号，不再是主题的链接蓝。 */
  .post-card-inner .post-title-link {
    color: #fff;
  }

  .post-card-foot {
    opacity: 0.92;
    text-shadow: 0 1px 4px rgb(0 0 0 / 0.55);
  }

  /* 封面上的胶囊一律半透明玻璃质感。
   * 不用 `!important`，否则会连主题自带的 `:hover` 高亮一起压掉；
   * 这里靠三层选择器提高优先级来稳压主题的基础样式，
   * 悬浮高亮规则写在下面 `[data-variant]` 分组里。 */
  .post-card-inner .post-category,
  .post-card-inner .post-tag,
  .post-card-inner .post-collection-badge {
    background: rgb(255 255 255 / 0.18);
    border-color: rgb(255 255 255 / 0.35);
    color: #fff;
    backdrop-filter: blur(4px);
  }
}

/* 无封面图时，全铺变体退回深色文字，避免白字压浅底 */
.post-card-wrapper[data-variant="full"][data-cover="no"] {
  .post-card-shade {
    background: none;
  }

  .post-card-inner {
    color: var(--va-c-text);
  }

  .post-card-title {
    color: var(--yun-post-title-color, var(--va-c-link));
    text-shadow: none;
  }

  .post-card-foot {
    color: var(--va-c-text);
    opacity: 1;
    text-shadow: none;
  }

  .post-card-inner .post-category,
  .post-card-inner .post-tag,
  .post-card-inner .post-collection-badge {
    background: transparent;
    border-color: var(--va-c-divider);
    color: var(--va-c-text);
    backdrop-filter: none;
  }
}

/* ------------------------------------------------------------------
 * 变体二：上半封面 + 下半白卡（首页其余卡片）
 *   白卡上沿位置由 `--yun-post-card-cover-top` 给出（长度值）；
 *   分类/标签落在白卡左上、右上，标题在白卡正中。
 * ------------------------------------------------------------------ */
.post-card-wrapper[data-variant="cover"] {
  .post-card-shade {
    background: linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(var(--yun-post-card-cover-top, 165px) - 3rem),
      rgb(255 255 255 / 0.6) calc(var(--yun-post-card-cover-top, 165px) - 1rem),
      var(--va-c-bg-light) var(--yun-post-card-cover-top, 165px),
      var(--va-c-bg-light) 100%
    );
  }

  /* 把标签行推进白卡内部：
   * 白卡上沿到卡片顶部的距离 = 卡片高度 × (1 - 白卡占比)，
   * 该值由 YunPostList 以长度变量给出（CSS 里 length - percentage 非法，
   * 不能在这里现算）。
   * 这里再减去标题层与底部信息行的高度，让「标签行 + 它的内边距」
   * 正好占满白卡以上的空间，标题便落在白卡的垂直中心。
   * `content-box` 是为了让内边距把行高顶出白卡之外。 */
  .post-card-inner .post-card-tags {
    box-sizing: content-box;
    padding-top: calc(var(--yun-post-card-cover-top, 165px) - 1.2rem - 0.7rem);
    padding-inline: 0.25rem;
  }

  /* 白卡上的分类 / 标签用浅底深字（同样不用 !important，留给悬浮高亮） */
  .post-card-inner .post-category,
  .post-card-inner .post-tag,
  .post-card-inner .post-collection-badge {
    background: var(--va-c-bg-soft, #f6f6f6);
    border-color: var(--va-c-divider);
    color: var(--va-c-text);
  }

  .post-card-inner {
    color: var(--va-c-text);
  }

  .post-card-center {
    justify-content: center;
    align-items: center;
  }

  .post-card-title {
    color: var(--yun-post-title-color, var(--va-c-link));
    text-align: center;
  }

  .post-card-foot {
    opacity: 0.85;
  }
}

/* ------------------------------------------------------------------
 * 分类 / 标签悬浮高亮
 *   主题自带 `hover:bg-*`，但被上面的浅底深字规则盖住，
 *   所以这里显式补一组 `:hover`：主色实底 + 白字，悬浮反馈更明确。
 *   阴影用 `color-mix` 从主色推出来——主题没有
 *   `--va-c-primary-rgb` 这个变量，写 rgb(var(...)) 会整条被丢弃。
 * ------------------------------------------------------------------ */
.post-card-wrapper {
  .post-card-inner .post-category,
  .post-card-inner .post-tag,
  .post-card-inner .post-collection-badge {
    transition:
      background-color var(--va-transition-duration-fast),
      border-color var(--va-transition-duration-fast),
      color var(--va-transition-duration-fast),
      box-shadow var(--va-transition-duration-fast);
  }

  .post-card-inner .post-category:hover,
  .post-card-inner .post-tag:hover,
  .post-card-inner .post-collection-badge:hover {
    background: var(--va-c-primary);
    border-color: var(--va-c-primary);
    color: #fff;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--va-c-primary) 38%, transparent);
  }
}

/* 无封面图时，半铺变体就是一整块卡片底色 */
.post-card-wrapper[data-variant="cover"][data-cover="no"] .post-card-shade {
  background: var(--va-c-bg-light);
}

/* 深色模式下白卡改用暗色卡片底色 */
html.dark .post-card-wrapper[data-variant="cover"] .post-card-shade {
  background: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(var(--yun-post-card-cover-top, 165px) - 3rem),
    rgb(0 0 0 / 0.5) calc(var(--yun-post-card-cover-top, 165px) - 1rem),
    var(--va-c-bg-light) var(--yun-post-card-cover-top, 165px),
    var(--va-c-bg-light) 100%
  );
}

/* 窄屏：字号收紧一点 */
@media (width <= 640px) {
  .post-card-title {
    font-size: 1.05rem;
  }

  .post-card-foot {
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card-wrapper.yun-card,
  .post-card-cover-img {
    transition: none;
  }

  .post-card-wrapper:hover .post-card-cover-img {
    scale: 1;
  }
}
</style>
