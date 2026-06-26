<script lang="ts" setup>
import { useFrontmatter, usePageList } from 'valaxy'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useYunAppStore } from '../node_modules/valaxy-theme-yun/stores'

const fm = useFrontmatter()
const { t } = useI18n()
const yun = useYunAppStore()
const route = useRoute()

// 获取全部页面，手动过滤文章并分组
const pageList = usePageList()
const postsCollections = computed(() => {
    // 双层可选链：修复 frontmatter 为空、path 为空两种报错
    const rawPosts = pageList.value.filter(p =>
        !(p.frontmatter?.draft) && p.path?.startsWith('/posts')
    )
    const yearMap = new Map<string, Map<string, any[]>>()

    rawPosts.forEach(post => {
        // 兜底无日期页面，直接跳过
        if (!post.date) return
        // 兼容时间戳、Date对象、日期字符串三种格式
        const dateStr = typeof post.date === 'number'
            ? new Date(post.date).toISOString()
            : post.date instanceof Date
                ? post.date.toISOString()
                : post.date
        const [year, month] = dateStr.split('-')
        if (!year || !month) return

        if (!yearMap.has(year)) yearMap.set(year, new Map())
        const monthMap = yearMap.get(year)!
        if (!monthMap.has(month)) monthMap.set(month, [])
        monthMap.get(month)!.push(post)
    })

    // 年份倒序、月份倒序
    return Array.from(yearMap.entries())
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([year, monthMap]) => ({
            year,
            months: Array.from(monthMap.entries())
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([month, posts]) => ({ month, posts }))
        }))
})

// 判断当前是否归档路由（归档页/归档子页）
const isArchivePage = computed(() => (route.meta.layout == 'archives' || route.meta.layout == 'categories' || route.meta.layout == 'tags'))
// 是否显示文章目录（仅普通文章页生效）
const showToc = computed(() => {
    return fm.value.toc !== false
})

const asideEnabled = computed(() => fm.value.aside !== false)
console.log('归档分组数据：', postsCollections.value)
</script>

<template>
    <aside v-if="asideEnabled" flex="~ col" class="va-card yun-aside min-h-sm rounded-2"
        :class="{ open: yun.rightSidebar.isOpen }" text="center" overflow="auto">
        <div class="w-full" flex="~ col" pb-2>
            <!-- 普通文章：目录 -->
            <template v-if="showToc && !isArchivePage">
                <h2 m="t-6 b-2" font="serif black">
                    {{ t('sidebar.toc') }}
                </h2>
                <YunOutline />
            </template>

            <!-- 归档页面：年月归档列表 -->
            <template v-if="isArchivePage">
                <h2 m="t-6 b-2" font="serif black">
                    {{ t('menu.archives') }}
                </h2>
                <div class="archive-sidebar-list px-2 text-left">
                    <!-- 遍历年份分组 -->
                    <div v-for="yearGroup in postsCollections" :key="yearGroup.year" class="mb-3">
                        <div class="year-title font-bold mb-1 text-primary">
                            {{ yearGroup.year }}
                        </div>
                        <!-- 遍历当年月份 -->
                        <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="ml-2 mb-1">
                            <RouterLink to="/archives" class="month-link block py-1 px-2 rounded transition-colors"
                                hover="bg-gray-100 dark:bg-gray-800">
                                {{ monthGroup.month }}月 · {{ monthGroup.posts.length }}篇
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </template>

            <div class="flex-grow" />

            <div v-if="$slots.default" class="custom-container">
                <slot />
            </div>
        </div>
    </aside>

    <!-- 移动端侧边唤起按钮（原有保留） -->
    <div class="toc-btn" v-if="!asideEnabled">
        <i class="i-ri-menu-unfold-line text-xl" @click="yun.rightSidebar.toggle()" />
    </div>
</template>

<style lang="scss">
@use 'sass:map';
@use 'valaxy/client/styles/mixins/index.scss' as *;
@use 'valaxy-theme-yun/styles/vars.scss' as *;

.yun-aside {
    // Below xl: fixed overlay panel, hidden by default
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: var(--yun-z-aside);
    width: 0;
    transform: translateX(100%);
    transition: all var(--va-transition-duration-fast) map.get($cubic-bezier, 'ease-in-out');
    max-height: calc(100vh - var(--yun-margin-top));

    // float panel
    &.float {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: var(--yun-z-aside);
        max-height: 100vh;
    }

    &.show {
        width: 320px;
    }

    // Mobile/tablet: toggle open via JS
    &.open {
        width: 320px;
        transform: translateX(0);
    }
}

// Desktop (xl+): aside is in normal flow, always visible
@include screen('xl') {
    .yun-aside {
        position: fixed;
        top: 0;
        z-index: 10;
        width: 400px;
        max-height: 100vh;
        transform: translateX(0);
        // On xl, sidebar toggle should not affect layout
        transition: all var(--va-transition-duration-fast) map.get($cubic-bezier, 'ease-in-out');

        &.open {
            width: 400px;
            transform: translateX(0);
        }
    }

    .toc-btn {
        display: none !important;
    }
}

.toc-btn {
    color: var(--va-c-primary);
    z-index: var(--yun-z-toc-btn);
    // 仅小屏显示，大屏被上面media查询隐藏
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: var(--va-c-bg);
    box-shadow: var(--va-shadow-md);
    display: flex;
    align-items: center;
    justify-content: center;
}

// 新增：侧边归档列表样式
.archive-sidebar-list {
    max-height: 60vh;
    overflow-y: auto;
}

.year-title {
    font-size: 1rem;
}

.month-link {
    font-size: 0.9rem;
    transition: background 0.2s;
}
</style>
