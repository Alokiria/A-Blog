<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeConfig } from '../node_modules/valaxy-theme-yun/composables'
import { useYunAppStore } from '../node_modules/valaxy-theme-yun/stores'
import { useAppStore } from 'valaxy'

const yun = useYunAppStore()
const app = useAppStore()
const route = useRoute()
const themeConfig = useThemeConfig()

const isPage = computed(() => route.path.startsWith('/page'))

const showNotice = computed(() => {
    const notice = themeConfig.value?.notice
    return notice?.enable && (isPage.value ? !notice.hideInPages : true)
})
</script>

<template>
    <!--全局布局外壳组件, 在主页取消页边距-->
    <YunLayoutWrapper :no-margin="!isPage">
        <!--整站内容统一水平居中、垂直纵向排列，底部预留内边距-->
        <div class="w-full flex flex-col items-center pb-4 transition-all duration-300 ease-in-out relative"
            :class="{ 'ml-[400px]': yun.fullscreenMenu.isOpen && !app.isMobile }">
            <!--在valaxy.config.ts种可配置的对象，设置为false时不渲染-->
            <template v-if="themeConfig.banner?.enable">
                <!--仅在主页渲染部分-->
                <template v-if="!isPage">
                    <div class="w-full">
                        <!-- ClientOnly：仅客户端渲染，SSR服务端跳过，防止首屏 hydration 报错 -->
                        <ClientOnly>
                            <YunBanner />
                            <template #fallback>
                                <div id="yun-banner-placeholder"
                                    class="w-full h-[var(--banner-container-height,100vh)]" />
                            </template>
                        </ClientOnly>

                        <!-- Nimbo模式&横幅动画完成后，渲染居中头像和信息YunPrologueSquare -->
                        <Transition v-if="yun.isNimbo && yun.bannerAnimationDone" enter-from-class="scale-60 opacity-0"
                            enter-to-class="scale-100 opacity-100"
                            enter-active-class="transition-300 transition-cubic-bezier-ease-in-out" appear>

                            <!-- 全屏绝对居中容器 -->
                            <div class="absolute top-0 left-5 right-5 h-screen flex items-center justify-center">
                                <Transition enter-from-class="op-0" enter-to-class="op-100"
                                    enter-active-class="transition-800" appear>

                                    <YunPrologueSquare class="z-1" />
                                </Transition>
                            </div>
                        </Transition>
                        <!-- 横幅下方一言/自定义文案组件 -->
                        <YunSay v-if="themeConfig.say?.enable" w="full" />
                    </div>
                    <!-- Nimbo全屏背景遮罩层（头像方块底层渐变/特效） -->
                    <!-- <YunPrologue v-if="yun.isNimbo" class="absolute left-0 top-0 right-0 bottom-0" /> -->
                </template>

            </template>

            <!-- 分页无Banner时，空占位高度，撑开导航栏 -->
            <div v-else class="h-$yun-nav-height" />

            <YunNotice v-if="showNotice" class="mb-4" :class="{
                'mt-4': !isPage,
            }" :content="themeConfig.notice?.content" />
            <!-- 不显示公告时，首页预留顶部间距，分页不留 -->
            <div v-else-if="!isPage" class="mt-4" />

            <!-- 命名插槽：board 公告下方自定义内容区，用户可在页面单独插入自定义模块 -->
            <slot name="board" />

            <slot>
                <RouterView />
            </slot>
        </div>
    </YunLayoutWrapper>
</template>
