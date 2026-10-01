<script lang="ts" setup>
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useFrontmatter, usePostTitle, useSiteStore, useValaxyI18n } from 'valaxy'
import { useThemeConfig, useYunTags } from '../node_modules/valaxy-theme-yun/composables'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage',
  }),
])

const route = useRoute()
const router = useRouter()

const themeConfig = useThemeConfig()

const { t } = useI18n()
const { $tTag } = useValaxyI18n()
const frontmatter = useFrontmatter()
const { tags, getTagStyle } = useYunTags({
  primary: themeConfig.value.colors.primary,
})

const curTag = computed(() => route.query.tag as string || '')
const site = useSiteStore()

const posts = computed(() => {
  const list = site.postList.filter((post) => {
    if (post.tags) {
      if (typeof post.tags === 'string')
        return post.tags === curTag.value
      else
        return post.tags.includes(curTag.value)
    }
    return false
  })
  return list
})

function displayTag(tag: string) {
  router.push({
    query: {
      tag,
    },
  })
}

/**
 * 点击标签后，把下方的时间线文档卡片平滑滚动到视口。
 *
 * 原实现用 useInvisibleElement(collapse)，但 router.push 之后同一 tick 内
 * v-if="curTag" 的卡片尚未挂载，拿不到元素，滚动不会发生，
 * 所以看起来像「点了标签下面没东西」。改为 watch + nextTick。
 */
const collapse = ref<HTMLElement | null>(null)

watch(curTag, async (value) => {
  if (!value)
    return
  await nextTick()
  collapse.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

const title = usePostTitle(frontmatter)

const tagArr = computed(() => [...tags.value].sort())

// use flex to fix `overflow-wrap: break-words;` not working in Safari
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
                :title="title || t('menu.tags')"
                :icon="frontmatter.icon || 'i-ri-tag-line'"
                :color="frontmatter.color"
                :page-title-class="frontmatter.pageTitleClass"
              />
            </template>

            <template #main-content>
              <Transition enter-active-class="animate-fade-in animate-duration-400" appear>
                <div class="yun-text-light" text="center" p="2">
                  {{ t('counter.tags', tagArr.length) }}
                </div>
              </Transition>

              <div class="justify-center items-end" flex="~ wrap" gap="1">
                <YunLayoutPostTag
                  v-for="([key, tag], i) in tagArr"
                  :key="key"
                  :i="i"
                  :title="key"
                  :count="tag.count"
                  :style="getTagStyle(tag.count)"
                  @click="displayTag(key.toString())"
                />
              </div>

              <RouterView />
            </template>

            <!-- 点击标签后，这里显示该标签下的时间线文档 -->
            <template #main-nav-before>
              <div v-if="curTag" ref="collapse" class="tag-timeline-anchor">
                <YunCard m="t-4" w="full" px-18>
                  <YunPageHeader :title="$tTag(curTag)" icon="i-ri-hashtag" />
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

// 右侧 400px 目录容器，1280px 断点隐藏
.right-aside {
  flex-shrink: 0;
  width: 400px;

  @media (max-width: 1280px) {
    display: none;
  }
}

// 滚动锚点：预留导航栏高度，避免卡片被顶部导航遮住
.tag-timeline-anchor {
  scroll-margin-top: var(--yun-nav-height, 60px);
}

:deep(.yun-layout-wrapper__sidebar) {
  display: none !important;
}

:deep(.yun-layout-wrapper__container) {
  width: 100% !important;
  max-width: unset !important;
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.yun-main > div.content) {
  max-width: unset !important;
  margin-inline: 0 !important;
  width: 100% !important;
}

// 时间线横向铺满（valaxy-theme-yun 1.0 起根类名为 .post-collapse）
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
