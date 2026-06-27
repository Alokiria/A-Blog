<script lang="ts" setup>
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useFrontmatter, usePostListWithCollections, usePostTitle } from 'valaxy'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from 'valaxy'

const { t } = useI18n()
const app = useAppStore()
const frontmatter = useFrontmatter()

const title = usePostTitle(frontmatter)
const postsWithCollections = usePostListWithCollections()

useSchemaOrg([
    defineWebPage({
        '@type': 'CollectionPage',
    }),
])

const pageIcon = computed(() => {
    if (!frontmatter.value.icon)
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        frontmatter.value.icon = 'i-ri-archive-line'
    return frontmatter.value.icon
})

</script>

<template>
    <YunLayoutWrapper>
        <div class="three-col flex w-full h-full flex-nowrap">
            <div class="left-virtual-sidebar w-[400px] shrink-0"></div>

            <div class="main-content flex-grow  overflow-auto">
                <RouterView v-slot="{ Component }">
                    <component :is="Component">
                        <template #main-header>
                            <YunPageHeader :title="title || t('menu.archives')" :icon="pageIcon"
                                :color="frontmatter.color" :page-title-class="frontmatter.pageTitleClass" />
                        </template>
                        <template #main-content>
                            <RouterView />
                            <YunPostCollapse class="collapse-full" w="full" :posts="postsWithCollections" />
                        </template>
                    </component>
                </RouterView>
            </div>

            <div class="right-aside w-[400px] shrink-0"></div>
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

// 核心：让YunPostCollapse横向铺满，清除居中、左右留白
:deep(.collapse-full) {
    width: 100% !important;
    max-width: unset !important;
    margin-inline: 0 !important;
    padding-inline: 0 !important;

    // 内部年份标题、分割线、文章条目全部清除左右内边距
    .yun-post-collapse__year {
        padding-inline: 0 !important;
        max-width: 100% !important;
    }
    .yun-post-collapse__list-item {
        padding-inline: 0 !important;
    }
    .yun-post-collapse__line {
        width: 100% !important;
    }
}
</style>