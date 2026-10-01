<script lang="ts" setup>
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/vue'

import dayjs from 'dayjs'
import { useFrontmatter, useSiteConfig, useValaxyI18n } from 'valaxy'
import PostCategoryNav from '../components/PostCategoryNav.vue'

const siteConfig = useSiteConfig()
const frontmatter = useFrontmatter()

const { $t, $tO } = useValaxyI18n()
const article: Parameters<typeof defineArticle>[0] = {
    '@type': 'BlogPosting',
    'headline': $tO(frontmatter.value.title),
    'description': $tO(frontmatter.value.description),
    'author': [
        {
            name: $t(siteConfig.value.author.name),
            url: siteConfig.value.author.link,
        },
    ],
    'datePublished': dayjs(frontmatter.value.date || '').toDate(),
    'dateModified': dayjs(frontmatter.value.updated || '').toDate(),
}

const image = frontmatter.value.image || frontmatter.value.cover
if (image)
    article.image = image

useSchemaOrg(
    defineArticle(article),
)
</script>

<template>
    <YunLayoutWrapper>
        <div class="three-col flex w-full h-full flex-nowrap">
            <!-- 左栏：仅 400px 空白占位，不放任何侧边栏内容。 -->
            <div class="left-column w-[400px] shrink-0" />

            <div class="main-content flex-grow  overflow-auto">
                <RouterView v-slot="{ Component }">
                    <component :is="Component">
                        <template #main-header-after>
                            <YunMainHeaderAfter />
                        </template>

                        <template #main-content-after>
                            <YunMainContentAfter />
                        </template>

                        <template #aside-custom>
                            <slot name="aside-custom" />
                        </template>
                    </component>
                </RouterView>

                <!-- 同一分类内的上一篇 / 下一篇 -->
                <PostCategoryNav />
            </div>

            <div class="right-aside w-[400px] shrink-0">
            </div>
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
  min-width: 0;
  flex-grow: 1;
  align-items: flex-start;
}

// 左侧 400px 栏：纯空白占位，不放任何内容。
// 1024px 以下隐藏，保持和原先一致的断点。
.left-column {
  flex-shrink: 0;
  width: 400px;
  @media (max-width: 1024px) {
    display: none;
  }
}

.main-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

// 右侧400px目录容器，1280px断点隐藏，和主题原生目录响应式对齐
.right-aside {
  flex-shrink: 0;
  width: 400px;
  @media (max-width: 1280px) {
    display: none;
  }
}

// 取消中间文章内容最大宽度限制，让文章铺满中栏
:deep(.yun-main > div.content) {
  max-width: unset !important;
  margin-inline: 0 !important;
  width: 100% !important;
}
</style>