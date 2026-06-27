<script lang="ts" setup>
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/vue'

import dayjs from 'dayjs'
import { useFrontmatter, useSiteConfig, useValaxyI18n } from 'valaxy'

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
            <div class="left-virtual-sidebar w-[400px] shrink-0"></div>

            <div class="main-content flex-grow  overflow-auto">
                <RouterView v-slot="{ Component }">
                    <component :is="Component">
                        <template #aside-custom>
                            <slot name="aside-custom" />
                        </template>
                    </component>
                </RouterView>
            </div>

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

// 左侧400px虚拟占位，1080px断点隐藏
.left-virtual-sidebar {
  flex-shrink: 0;
  width: 400px;
  /* background: #f6f6f6; 取消注释可直观看到占位区域 */
  @media (max-width: 1024px) {
    display: none;
  }
}

.main-content {
  flex: 1;
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

// 屏蔽主题自带原生左侧侧边栏，避免双重左侧栏冲突
:deep(.yun-layout-wrapper__sidebar) {
  display: none !important;
}

// 清除YunLayoutWrapper自带容器边距、最大宽度居中限制
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
</style>