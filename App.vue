<script lang="ts" setup>
import { useHead } from '@unhead/vue'
import { TooltipProvider } from 'reka-ui'
import { useAppStore } from 'valaxy'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeConfig } from './node_modules/valaxy-theme-yun/composables'
import { useYunAppStore } from './node_modules/valaxy-theme-yun/stores'

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

// 路由布局监听：切换layout时控制侧边栏
watch(
  () => route.meta.layout,
  () => {
    if (route.meta.layout === 'home' || app.isMobile)
      yun.leftSidebar.isOpen = false
    else
      yun.leftSidebar.isOpen = true
  },
  { immediate: true },
)


onMounted(() => {
  // for mobile vh
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  app.showLoading = false
})
</script>

<template>
  <TooltipProvider>
    <YunStratoApp v-if="yun.isStrato" />
    <ValaxyDebug v-if="isDev" />

    <YunPageHeaderGradient />
    <YunNavMenu />

    <YunFullscreenMenu v-if="yun.isNimbo" />
    <YunStratoSidebar v-if="yun.isStrato" />
    

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
