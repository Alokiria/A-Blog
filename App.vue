<script lang="ts" setup>
import { useHead } from '@unhead/vue'
import { TooltipProvider } from 'reka-ui'
import { useAppStore } from 'valaxy'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeConfig } from './node_modules/valaxy-theme-yun/composables'
import { useYunAppStore } from './node_modules/valaxy-theme-yun/stores'
import { setupScrollRestore } from './composables/scroll-restore'

const isDev = import.meta.env.DEV

const appStore = useAppStore()

// Use a safe default for SSR; real themeColor is applied after mount
// to avoid hydration mismatch when user prefers dark mode.
const safeThemeColor = computed(() => appStore.themeColor)

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@900&display=swap',
    },
  ],

  meta: [
    {
      name: 'theme-color',
      content: safeThemeColor,
    },
    {
      name: 'msapplication-TileColor',
      content: safeThemeColor,
    },
  ],
})

const themeConfig = useThemeConfig()

const app = useAppStore()
const yun = useYunAppStore()
const route = useRoute()
const router = useRouter()

// 路由布局监听：主页 / 移动端收起左侧栏，其余页面展开。
// 注意：Valaxy 1.0 的 useYunAppStore 里 leftSidebar.isOpen 是 useToggle 解构出来的
// 普通 boolean（不是 ref），不能写 .value，只能通过 toggle 切换。
watch(
  () => route.meta.layout,
  () => {
    const shouldOpen = route.meta.layout !== 'home' && !app.isMobile
    if (yun.leftSidebar.isOpen !== shouldOpen)
      yun.leftSidebar.toggle()
  },
  { immediate: true },
)

onMounted(() => {
  // for mobile vh
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  app.showLoading = false
})

// 返回上一页时恢复原来的滚动位置。
// 注册逻辑见 composables/scroll-restore.ts：Valaxy 的客户端 router 写死了
// 「路径变了就回顶」，且不认 savedPosition，所以只能从根组件侧补上记忆/恢复。
// 放在 onMounted 里是为了只在浏览器端注册，不干扰构建期的 SSR 渲染。
onMounted(() => setupScrollRestore(router))
</script>

<template>
  <TooltipProvider>
    <ValaxyDebug v-if="isDev" />

    <YunPageHeaderGradient />
    <YunNavMenu />

    <YunFullscreenMenu v-if="yun.isNimbo" />

    <ClientOnly>
      <YunFireworks v-if="themeConfig.fireworks?.enable" />
    </ClientOnly>
    <slot name="bg">
      <YunBg v-if="themeConfig.bg_image?.enable" />
    </slot>
    <ClientOnly>
      <Transition name="fade">
        <YunLoading v-if="app.showLoading" />
      </Transition>
    </ClientOnly>
    <YunBackToTop />
  </TooltipProvider>
</template>
