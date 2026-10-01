<script lang="ts" setup>
import { useFrontmatter, useLocaleTitle, useSiteStore } from 'valaxy'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 分类内「上一篇 / 下一篇」跳转。
 *
 * 与主题自带的 usePrevNext() 不同：那个是**全站**顺序，
 * 这里只在**同一分类**的所有文章里前后跳转。
 *
 * 分类来源：当前文章 frontmatter.categories（可能是字符串、数组，或 i18n 对象）。
 * 排序来源：useSiteStore().postList（已按站点配置排序好）。
 */
const route = useRoute()
const site = useSiteStore()
const frontmatter = useFrontmatter()

/** 把 categories 归一化成字符串数组 */
function normalizeCategories(raw: any): string[] {
  if (!raw)
    return []
  const out: string[] = []
  const push = (v: any) => {
    if (typeof v === 'string') {
      out.push(v)
    }
    else if (Array.isArray(v)) {
      v.forEach(push)
    }
    else if (v && typeof v === 'object') {
      // i18n 形式 { 'zh-CN': '...', en: '...' }
      Object.values(v).forEach(push)
    }
  }
  push(raw)
  return out.filter(Boolean)
}

/** 当前文章所在分类 */
const currentCategories = computed(() =>
  normalizeCategories(frontmatter.value.categories),
)

/**
 * 取一篇文章的分类。
 * 注意：useSiteStore().postList 里的项把 categories 放在**顶层**，
 * 而不是 frontmatter 下（实测：post.categories 有值，post.frontmatter.categories 为 undefined），
 * 所以两处都兜底。
 */
function categoriesOf(post: any): string[] {
  return normalizeCategories(post?.categories ?? post?.frontmatter?.categories)
}

/** 同一分类下的文章列表（保持 postList 顺序） */
const siblings = computed(() => {
  const cats = currentCategories.value
  if (!cats.length)
    return []
  return site.postList.filter((post) => {
    const pc = categoriesOf(post)
    return pc.some(c => cats.includes(c))
  })
})

/** 当前文章在分类内的位置 */
const index = computed(() =>
  siblings.value.findIndex(p => p.path === route.path),
)

// postList 通常是「新 → 旧」。这里让「上一篇」= 更早的一篇，「下一篇」= 更新的一篇，
// 与阅读顺序一致；若你的站点排序相反，把两者对调即可。
const older = computed(() => (index.value >= 0 ? siblings.value[index.value + 1] ?? null : null))
const newer = computed(() => (index.value > 0 ? siblings.value[index.value - 1] ?? null : null))

const show = computed(() => siblings.value.length > 1 && index.value >= 0)

const prevTitle = useLocaleTitle(older)
const nextTitle = useLocaleTitle(newer)
</script>

<template>
  <nav v-if="show" class="post-category-nav" aria-label="同分类文章导航">
    <div class="nav-item nav-prev">
      <RouterLink v-if="older" :to="older.path || ''" :title="prevTitle" class="nav-link">
        <i class="i-ri-arrow-left-s-line nav-icon" />
        <span class="nav-text">
          <span class="nav-label">上一篇</span>
          <span class="nav-title">{{ prevTitle }}</span>
        </span>
      </RouterLink>
      <span v-else class="nav-empty">
        <span class="nav-label">已是本分类最早一篇</span>
      </span>
    </div>

    <div class="nav-item nav-next">
      <RouterLink v-if="newer" :to="newer.path || ''" :title="nextTitle" class="nav-link">
        <span class="nav-text">
          <span class="nav-label">下一篇</span>
          <span class="nav-title">{{ nextTitle }}</span>
        </span>
        <i class="i-ri-arrow-right-s-line nav-icon" />
      </RouterLink>
      <span v-else class="nav-empty">
        <span class="nav-label">已是本分类最新一篇</span>
      </span>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.post-category-nav {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: stretch;
  margin-top: 1rem;

  .nav-item {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
  }

  // 右侧项内容靠右
  .nav-next {
    justify-content: flex-end;
    text-align: right;
  }

  .nav-link,
  .nav-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
    padding: 0.6rem 0.9rem;
    border-radius: 0.75rem;
    background: var(--va-c-bg-light);
    border: 1px solid rgb(var(--va-c-primary-rgb), 0.15);
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .nav-link {
    color: inherit;

    &:hover {
      border-color: rgb(var(--va-c-primary-rgb), 0.45);
      background: rgb(var(--va-c-primary-rgb), 0.06);
    }
  }

  .nav-empty {
    opacity: 0.45;
    cursor: default;
  }

  .nav-icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--va-c-primary);
  }

  .nav-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 0.1rem;
  }

  .nav-label {
    font-size: 0.72rem;
    opacity: 0.6;
    letter-spacing: 0.05em;
  }

  .nav-title {
    font-size: 0.9rem;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  // 窄屏上下堆叠
  @media (max-width: 640px) {
    flex-direction: column;

    .nav-next {
      justify-content: stretch;
      text-align: left;
    }

    .nav-next .nav-link {
      flex-direction: row-reverse;
      justify-content: flex-end;
    }
  }
}
</style>
