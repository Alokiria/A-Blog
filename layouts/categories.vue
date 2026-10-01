<script lang="ts" setup>
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useCategories, useFrontmatter, useSiteStore, useValaxyI18n } from 'valaxy'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()

const site = useSiteStore()
const frontmatter = useFrontmatter()

const route = useRoute()
const curCategory = computed(() => (route.query.category as string || ''))
const categories = useCategories()

const pageIcon = computed(() => {
  if (!frontmatter.value.icon)
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    frontmatter.value.icon = 'i-ri-folder-2-line'
  return frontmatter.value.icon
})

const posts = computed(() => {
  const list = site.postList.filter((post) => {
    if (post.categories && curCategory.value !== 'Uncategorized') {
      if (typeof post.categories === 'string')
        return post.categories === curCategory.value
      else
        return post.categories.join('/').startsWith(curCategory.value) && post.categories[0] === curCategory.value.split('/')[0]
    }
    if (!post.categories && curCategory.value === 'Uncategorized')
      return post.categories === undefined
    return false
  })
  return list
})

const { $tO, $tCategory } = useValaxyI18n()

/**
 * 点击分类后，把下方的时间线文档卡片平滑滚动到视口。
 *
 * 原实现用 useInvisibleElement(collapse) 在 router.push 之后立刻调用 show()，
 * 但此时 v-if="curCategory" 的卡片还没有挂载（同一 tick 内 DOM 未更新），
 * 拿不到元素，滚动永远不会发生，所以时间线在视觉上「点了没反应」。
 * 这里改为 watch 分类值，等 DOM 更新后再滚动。
 */
const collapse = ref<HTMLElement | null>(null)

watch(curCategory, async (value) => {
  if (!value)
    return
  await nextTick()
  collapse.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage',
  }),
])
</script>

<template>
  <YunLayoutWrapper>
    <div class="three-col flex w-full h-full flex-nowrap">
      <div class="left-virtual-sidebar w-[400px] shrink-0" />
      <div class="main-content flex-grow overflow-auto">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-header>
              <YunPageHeader
                :title="$tO(frontmatter.title) || t('menu.categories')"
                :icon="pageIcon"
                :color="frontmatter.color"
                :page-title-class="frontmatter.pageTitleClass"
              />
            </template>

            <template #main-content>
              <Transition enter-active-class="animate-fade-in animate-duration-400" appear>
                <div text="center" class="yun-text-light" p="2">
                  {{ t('counter.categories', Array.from(categories.children).length) }}
                </div>
              </Transition>

              <YunCategories :categories="categories.children" />

              <RouterView />
            </template>

            <!-- 点击分类后，这里显示该分类下的时间线文档 -->
            <template #main-nav-before>
              <div v-if="curCategory" ref="collapse" class="category-timeline-anchor">
                <YunCard class="post-collapse-container" m="t-4" w="full" px-18>
                  <YunPageHeader
                    m="t-10"
                    :title="curCategory === 'Uncategorized' ? t('category.uncategorized') : curCategory.split('/').map($tCategory).join(' / ')"
                    icon="i-ri-folder-open-line"
                  />
                  <YunPostCollapse class="collapse-full" w="full" :posts="posts" />
                </YunCard>
              </div>
            </template>
          </component>
        </RouterView>
      </div>

      <div class="right-aside w-[400px] shrink-0" />
      <YunLayoutRight />
    </div>
  </YunLayoutWrapper>
</template>

<style lang="scss" scoped>
.three-col {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  height: 100%;
}

// 左侧 400px 虚拟占位，1024px 断点隐藏
.left-virtual-sidebar {
  flex-shrink: 0;
  width: 400px;
  margin-right: 1rem;  
  @media (max-width: 1024px) {
    display: none;
  }
}

.main-content {
  flex: 1;
  overflow: auto;
}

// 右侧 400px 目录容器，1280px 断点隐藏，和主题原生目录响应式对齐
.right-aside {
  flex-shrink: 0;
  width: 400px;

  @media (max-width: 1280px) {
    display: none;
  }
}

// 滚动锚点：预留导航栏高度，避免卡片被顶部导航遮住
.category-timeline-anchor {
  scroll-margin-top: var(--yun-nav-height, 60px);
}

// 屏蔽主题自带原生左侧侧边栏，避免双重左侧栏冲突
:deep(.yun-layout-wrapper__sidebar) {
  display: none !important;
}

// 清除 YunLayoutWrapper 自带容器边距、最大宽度居中限制
:deep(.yun-layout-wrapper__container) {
  width: 100% !important;
  max-width: unset !important;
  margin: 0 !important;
  padding: 0 !important;
}

// 取消中间文章内容最大宽度限制，实现紧贴左右侧边无留白
:deep(.yun-main > div.content) {
  max-width: unset !important;
  margin-inline: 0 !important;
  width: 100% !important;
}

// 核心：让时间线横向铺满，清除居中、左右留白
// 注意 valaxy-theme-yun 1.0 起 YunPostCollapse 的根类名是 .post-collapse
// （旧版是 .yun-post-collapse__*），这里同步更新选择器，否则覆盖不生效。
:deep(.collapse-full) {
  width: 100% !important;
  max-width: unset !important;
  margin-inline: 0 !important;
  padding-inline: 0 !important;

  .post-collapse,
  .yun-post-collapse {
    width: 100% !important;
    max-width: 100% !important;
    padding-inline: 0 !important;
  }

  .collection-title {
    padding-inline: 0 !important;
    max-width: 100% !important;
  }

  .post-collapse-action,
  .yun-post-collapse__list-item {
    padding-inline: 0 !important;
  }
}
</style>
