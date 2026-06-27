<script lang="ts" setup>
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useFrontmatter, useInvisibleElement, usePostTitle, useSiteStore, useValaxyI18n } from 'valaxy'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useThemeConfig, useYunTags } from '../node_modules/valaxy-theme-yun/composables'

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

const collapse = ref()
const { show } = useInvisibleElement(collapse)

function displayTag(tag: string) {
    router.push({
        query: {
            tag,
        },
    })

    show()
}

const title = usePostTitle(frontmatter)

const tagArr = computed(() => [...tags.value].sort())

// use flex to fix `overflow-wrap: break-words;` not working in Safari
</script>

<template>
    <YunLayoutWrapper>
        <div class="three-col flex w-full h-full flex-nowrap">
            <div class="left-virtual-sidebar w-[400px] shrink-0"></div>
            <div class="main-content flex-grow  overflow-auto">
                <RouterView v-slot="{ Component }">
                    <component :is="Component">
                        <template #main-header>
                            <YunPageHeader :title="title || t('menu.tags')" :icon="frontmatter.icon || 'i-ri-tag-line'"
                                :color="frontmatter.color" :page-title-class="frontmatter.pageTitleClass" />
                        </template>
                        <template #main-content>
                            <Transition enter-active-class="animate-fade-in animate-duration-400" appear>
                                <div class="yun-text-light" text="center" p="2">
                                    {{ t('counter.tags', tagArr.length) }}
                                </div>
                            </Transition>

                            <div class="justify-center items-end" flex="~ wrap" gap="1">
                                <YunLayoutPostTag v-for="([key, tag], i) in tagArr" :key="key" :i="i" :title="key"
                                    :count="tag.count" :style="getTagStyle(tag.count)"
                                    @click="displayTag(key.toString())" />
                            </div>

                            <RouterView />
                        </template>

                        <template #main-nav-before>
                            <YunCard v-if="curTag" ref="collapse" m="t-4" w="full" px-18>
                                <YunPageHeader :title="$tTag(curTag)" icon="i-ri-hashtag" />
                                <YunPostCollapse class="collapse-full" w="full" :posts="posts" />
                            </YunCard>
                        </template>
                    </component>
                </RouterView>
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